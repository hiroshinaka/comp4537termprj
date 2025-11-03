from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict
import re, json, math
from collections import Counter
from sentence_transformers import SentenceTransformer, util


app = FastAPI()
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
model = SentenceTransformer(MODEL_NAME)

with open('skills_taxonomy.json', 'r', encoding='utf-8') as f:
    TAXO = json.load(f)

class AnalyzeIn(BaseModel):
    resume_text: str
    job_text: str
    options: Dict = {}

def _normalize(txt: str) -> str:
    txt = txt.encode('utf-8', 'ignore').decode('utf-8')
    return re.sub(r"[^a-z0-9+#.\- ]+"," ", txt.lower())

def _tokenize(txt: str) -> List[str]:
    return [t for t in _normalize(txt).split() if t]

def _extract_skills(text:str) -> List[str]:
    t = _normalize(text)
    hits = set()
    for canon, aliases in TAXO.items():
        for a in aliases+[canon]:
            if re.search(rf"\b{re.escape(a)}\b", t):
                hits.add(canon)
                break
    return sorted(hits)

def _topk_keywords(text:str, k:int=15) -> List[str]:
    toks = [t for t in _tokenize(text) if len(t)> 2]
    freq = Counter(toks)
    return [w for w, _ in freq.most_common(k)]


def _cosine(a,b)->float:
    return float(util.cos_sim(a,b).cpu().numpy()[0][0])


@app.get("/")
def root(): return {"ok": True}

@app.get("/healthz")
def health(): return {"ok": True, "model": MODEL_NAME}

@app.post("/analyze")
def analyze(inp:AnalyzeIn):
    resume_text, job_text = inp.resume_text, inp.job_text
    use_ner = bool(inp.options.get("use_ner", False))
    k = int(inp.options.get("top_k_keywords", 15))


    # skills
    skills_res = _extract_skills(resume_text)
    skills_job = _extract_skills(job_text)
    matched = sorted(set(skills_res) & set(skills_job))
    missing = sorted(set(skills_job) - set(skills_res))

    # keywords (for evidence)
    res_kw = _topk_keywords(resume_text, k)
    job_kw = _topk_keywords(job_text, k)

    # embeddings
    emb_res = model.encode([resume_text], normalize_embeddings=True)
    emb_job = model.encode([job_text], normalize_embeddings=True)
    sem_sim = max(0.0, min(1.0, _cosine(emb_res, emb_job)))  # clamp

     # coverage heuristic
    must = ["aws","etl","docker"]
    coverage = sum(1 for m in must if m in skills_job and m not in missing) / max(1,len([m for m in must if m in skills_job]))
    if math.isnan(coverage): coverage = 0.0

    # skill overlap
    overlap = len(matched) / max(1, len(skills_job))

    score = round(100*(0.4*overlap + 0.4*sem_sim + 0.2*coverage))

    # crude evidence (short spans)
    def snippets(txt, keys):
        txt_l = _normalize(txt)
        out = []
        for k in keys:
            m = re.search(rf".{{0,40}}\b{re.escape(k)}\b.{{0,40}}", txt_l)
            if m: out.append(m.group(0).strip())
        return out[:3]

    return {
        "skills_detected": skills_res,
        "skills_required": skills_job,
        "matched_skills": matched,
        "missing_skills": missing,
        "fit_score": int(score),
        "evidence": {
            "resume_snippets": snippets(resume_text, matched),
            "job_snippets": snippets(job_text, skills_job)
        },
        "meta": {
            "resume_tokens": len(_tokenize(resume_text)),
            "job_tokens": len(_tokenize(job_text)),
            "model_rev": MODEL_NAME
        }
    }