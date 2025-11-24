from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any
import re
import json
from collections import Counter

from sentence_transformers import SentenceTransformer, util

# -----------------------------
# App & Model setup
# -----------------------------
app = FastAPI()

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
model = SentenceTransformer(MODEL_NAME)

with open("skills_taxonomy.json", "r", encoding="utf-8") as f:
    TAXO: Dict[str, List[str]] = json.load(f)

# Canonical skill list and embeddings for semantic matching
CANON_SKILLS: List[str] = list(TAXO.keys())
CANON_EMB = model.encode(CANON_SKILLS, normalize_embeddings=True)


class AnalyzeIn(BaseModel):
    resume_text: str
    job_text: str
    # options is extensible; all keys optional
    options: Dict[str, Any] = {}


# -----------------------------
# Text helpers
# -----------------------------
_STOPWORDS = {
    "and", "or", "the", "a", "an", "of", "to", "in", "for", "on", "with", "at",
    "by", "from", "as", "is", "are", "was", "were", "be", "this", "that", "it",
    "you", "your", "our", "their", "they", "we", "i", "me", "my", "us", "but",
    "so", "if", "then", "than", "can", "will", "able"
}


def _normalize(txt: str) -> str:
    # Lowercase, keep alnums and a few symbols, strip weird chars
    txt = txt.encode("utf-8", "ignore").decode("utf-8")
    return re.sub(r"[^a-z0-9+#.\- ]+", " ", txt.lower())


def _tokenize(txt: str) -> List[str]:
    return [t for t in _normalize(txt).split() if t]


def _topk_keywords(text: str, k: int = 25) -> List[str]:
    toks = [
        t
        for t in _tokenize(text)
        if len(t) > 2 and t not in _STOPWORDS
    ]
    freq = Counter(toks)
    return [w for w, _ in freq.most_common(k)]


def _split_into_spans(text: str, max_len: int = 300, max_spans: int = 200) -> List[str]:
    """
    Split text into semi-sentential spans (lines + sentence splits),
    capped to a maximum number of spans for efficiency.
    """
    spans: List[str] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        # Split by sentence punctuation to get smaller spans
        parts = re.split(r"(?<=[.!?])\s+", line)
        for p in parts:
            p = p.strip()
            if not p:
                continue
            if len(p) > max_len:
                # Chunk very long spans
                for i in range(0, len(p), max_len):
                    chunk = p[i : i + max_len].strip()
                    if chunk:
                        spans.append(chunk)
            else:
                spans.append(p)

            if len(spans) >= max_spans:
                return spans
    return spans


# -----------------------------
# Skill Extraction (hybrid)
# -----------------------------
def _extract_skill_hits(
    text: str,
    sim_threshold: float = 0.65,
    max_spans: int = 200,
    use_semantic: bool = True,
) -> Dict[str, Dict[str, Any]]:
    """
    Return a mapping:
    {
      canon_skill: {
          "sources": {"keyword", "semantic"},
          "spans": [ "snippet1", "snippet2", ... ]    # text snippets mentioning / related to the skill
      },
      ...
    }
    """
    hits: Dict[str, Dict[str, Any]] = {}
    norm = _normalize(text)

    # Keyword / alias matching
    for canon, aliases in TAXO.items():
        all_aliases = [canon] + aliases
        for alias in all_aliases:
            alias_norm = alias.lower()
            if not alias_norm:
                continue
            if re.search(rf"\b{re.escape(alias_norm)}\b", norm):
                skill_entry = hits.setdefault(
                    canon, {"sources": set(), "spans": []}
                )
                skill_entry["sources"].add("keyword")
                # We'll collect concrete spans below
                break  # no need to check other aliases once found

    # Span-based semantic matching 
    spans = _split_into_spans(text, max_len=300, max_spans=max_spans)

    # Pre-collect span embeddings if we are using semantic search
    span_embs = None
    if use_semantic and spans:
        span_embs = model.encode(spans, normalize_embeddings=True)
        sim_matrix = util.cos_sim(span_embs, CANON_EMB)

        num_spans, num_skills = sim_matrix.shape
        for j in range(num_skills):
            canon = CANON_SKILLS[j]
            best_i = None
            best_sim = 0.0
            for i in range(num_spans):
                sim_val = float(sim_matrix[i, j])
                if sim_val >= sim_threshold and sim_val > best_sim:
                    best_sim = sim_val
                    best_i = i
            if best_i is not None:
                skill_entry = hits.setdefault(
                    canon, {"sources": set(), "spans": []}
                )
                skill_entry["sources"].add("semantic")

                skill_entry["spans"].append(spans[best_i])

    # Collect concrete snippets around aliases for matched skills 
    # This ensures we still have evidence strings for suggestions.
    for canon, data in hits.items():
        aliases = TAXO.get(canon, [])
        all_aliases = [canon] + aliases
        for span in spans:
            span_norm = span.lower()
            if any(a.lower() in span_norm for a in all_aliases):
                if span not in data["spans"]:
                    data["spans"].append(span)

        # Keep snippets manageable
        data["spans"] = data["spans"][:5]

    # Convert sources sets to lists for JSON-serialization
    for canon, data in hits.items():
        data["sources"] = sorted(list(data["sources"]))

    return hits


def _collect_snippet_list(
    hits: Dict[str, Dict[str, Any]],
    skills: List[str],
    max_total: int = 10,
) -> List[str]:
    """
    Flatten snippets for a given skill list into a simple list of strings
    for backward compatibility with your suggestions service.
    """
    out: List[str] = []
    for skill in skills:
        data = hits.get(skill)
        if not data:
            continue
        for s in data["spans"]:
            if s not in out:
                out.append(s)
            if len(out) >= max_total:
                return out
    return out


# -----------------------------
# Health endpoints
# -----------------------------
@app.get("/")
def root():
    return {"ok": True}


@app.get("/healthz")
def health():
    return {"ok": True, "model": MODEL_NAME}


# -----------------------------
# Main /analyze endpoint 
# -----------------------------
@app.post("/analyze")
def analyze(inp: AnalyzeIn):
    resume_text = inp.resume_text or ""
    job_text = inp.job_text or ""

    # ---- Options with sensible defaults ----
    use_semantic_skills = bool(inp.options.get("semantic_skills", True))
    k_keywords = int(inp.options.get("top_k_keywords", 25))
    sim_threshold = float(inp.options.get("skill_sim_threshold", 0.65))
    max_spans = int(inp.options.get("max_spans", 200))

    # ---- Skill hits 
    res_hits = _extract_skill_hits(
        resume_text,
        sim_threshold=sim_threshold,
        max_spans=max_spans,
        use_semantic=use_semantic_skills,
    )
    job_hits = _extract_skill_hits(
        job_text,
        sim_threshold=sim_threshold,
        max_spans=max_spans,
        use_semantic=use_semantic_skills,
    )

    skills_res = sorted(res_hits.keys())
    skills_job = sorted(job_hits.keys())

    matched = sorted(set(skills_res) & set(skills_job))
    missing = sorted(set(skills_job) - set(skills_res))

    # Skill coverage percentage 
    matched_pct = (len(matched) / max(1, len(skills_job))) * 100.0

    # ---- Keyword overlap ----
    res_kw = set(_topk_keywords(resume_text, k_keywords))
    job_kw = set(_topk_keywords(job_text, k_keywords))
    kw_overlap = len(res_kw & job_kw) / max(1, len(job_kw))

    # ---- Semantic similarity between full docs ----
    emb_res_full = model.encode([resume_text], normalize_embeddings=True)
    emb_job_full = model.encode([job_text], normalize_embeddings=True)
    sem_sim = float(util.cos_sim(emb_res_full, emb_job_full)[0][0])
    sem_sim = max(0.0, min(1.0, sem_sim))  # clamp to [0,1]

    # ---- Overall fit score (heuristic) ----
    skill_score = matched_pct / 100.0
    fit_raw = 0.6 * skill_score + 0.3 * sem_sim + 0.1 * kw_overlap
    overall_fit = max(0, min(100, int(round(fit_raw * 100))))

    # ---- Evidence snippets ----
    resume_snippets_flat = _collect_snippet_list(res_hits, matched, max_total=10)
    job_snippets_flat = _collect_snippet_list(job_hits, skills_job, max_total=10)

    # More structured per-skill evidence (for future use)
    skill_snippets = {}
    for canon in sorted(set(skills_res + skills_job)):
        skill_snippets[canon] = {
            "resume": res_hits.get(canon, {}).get("spans", []),
            "job": job_hits.get(canon, {}).get("spans", []),
            "sources_resume": res_hits.get(canon, {}).get("sources", []),
            "sources_job": job_hits.get(canon, {}).get("sources", []),
        }

    # ---- Token counts ----
    resume_tokens = len(_tokenize(resume_text))
    job_tokens = len(_tokenize(job_text))

    # ---- Response (backwards compatible) ----
    return {
        # Original fields your suggestions service already expects:
        "skills_detected": skills_res,
        "skills_required": skills_job,
        "matched_skills": matched,
        "missing_skills": missing,
        "matched_pct": round(matched_pct, 2),
        "evidence": {
            "resume_snippets": resume_snippets_flat,
            "job_snippets": job_snippets_flat,
            "skill_snippets": skill_snippets,
        },
        "meta": {
            "resume_tokens": resume_tokens,
            "job_tokens": job_tokens,
            "model_rev": MODEL_NAME,
            # new metrics:
            "semantic_similarity": round(sem_sim, 4),   # 0–1
            "keyword_overlap": round(kw_overlap, 4),    # 0–1
            "overall_fit_score": overall_fit,           # 0–100
        },
    }