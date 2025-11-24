from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import requests

# ---------- Ollama config ----------
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

app = FastAPI()

# =============================
# MODELS
# =============================
class Analysis(BaseModel):
    skills_detected: List[str]
    skills_required: List[str]
    matched_skills: List[str]
    missing_skills: List[str]
    matched_pct: Optional[float] = None
    matches_pct: Optional[float] = None
    fit_score: Optional[int] = None
    evidence: Dict[str, any]
    meta: Optional[Dict[str, any]] = {}

app = FastAPI()

class Analysis(BaseModel):
    skills_detected: List[str]
    skills_required: List[str]
    matched_skills: List[str]
    missing_skills: List[str]
    # analyzer may send either `matched_pct` (percent, e.g. 75.0)
    # or `matches_pct` (fraction, e.g. 0.75). Accept both.
    matched_pct: Optional[float] = None
    matches_pct: Optional[float] = None
    # integer fit score (0-100) — optional
    fit_score: Optional[int] = None
    evidence: Dict[str, List[str]]

class Style(BaseModel):
    bullets: int = 7
    max_words: int = 200
    tone: str = "professional"

class SuggestIn(BaseModel):
    analysis: Analysis
    style: Style = Style()
    role_hint: str | None = None

# =============================
# HEALTHCHECK
# =============================
@app.get("/healthz")
def healthz():
    return {
        "ok": True,
        "backend": "ollama",
        "ollama": {
            "host": OLLAMA_HOST,
            "model": OLLAMA_MODEL,
        },
    }


# =============================
# SYSTEM PROMPT
# =============================
PROMPT_SYS = (
    "In strict mode. "
    "You are a precise resume coach. "
    "Use only information from ANALYSIS below. "
    "DO NOT fabricate tools, skills, responsibilities, or experience. "
    "Provide short, actionable, truthful improvements. "
)
# =============================
# PROMPT BUILDER 
# =============================
def build_prompt(analysis: Analysis, style: Style, role_hint: str | None):
    # normalize match pct
    raw = analysis.matched_pct if analysis.matched_pct is not None else analysis.matches_pct
    if raw is not None:
        try:
            pct = float(raw)
            if pct <= 1.0:
                pct *= 100
            pct = round(pct, 2)
        except:
            pct = raw
    else:
        pct = "N/A"

    # meta fields (optional)
    meta = analysis.meta or {}
    sem_sim = meta.get("semantic_similarity")
    kw_overlap = meta.get("keyword_overlap")
    overall_fit = meta.get("overall_fit_score")

    # richer evidence
    resume_snips = analysis.evidence.get("resume_snippets", [])
    job_snips = analysis.evidence.get("job_snippets", [])
    skill_snips = analysis.evidence.get("skill_snippets", {})

    return f"""
SYSTEM:
{PROMPT_SYS}

ANALYSIS:
skills_detected: {analysis.skills_detected}
skills_required: {analysis.skills_required}
matched_skills: {analysis.matched_skills}
missing_skills: {analysis.missing_skills}
matched_pct: {pct}
overall_fit_score: {overall_fit}
semantic_similarity: {sem_sim}
keyword_overlap: {kw_overlap}

evidence.resume_snippets: {resume_snips}
evidence.job_snippets: {job_snips}

# Detailed per-skill evidence
skill_snippets: {skill_snips}

role_hint: {role_hint or ''}

USER:
Write a short professional summary assessing the candidate's fit based ONLY on the ANALYSIS above.
- Reference matched skills
- Mention missing skills only if relevant to readiness
- Use semantic_similarity, matched_pct, and overall_fit_score to ground your assessment

Then write {style.bullets} bullet-point improvement suggestions (max {style.max_words} words TOTAL, {style.tone} tone):

Rules for suggestions:
- Use ONLY evidence.resume_snippets, skill_snippets, and matched/missing skills
- Reference concrete phrases from resume_snippets or skill_snippets when applicable
- Do NOT invent job titles, responsibilities, or achievements
- Each bullet must start with "-" or "•"
- Bullets must be specific and actionable
"""


# =============================
# CALL OLLAMA
# =============================
def call_ollama(prompt: str) -> str:
    try:
        resp = requests.post(
            f"{OLLAMA_HOST}/api/chat",
            json={"model": OLLAMA_MODEL, "messages": [{"role": "user", "content": prompt}], "stream": False},
            timeout=180,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")

    data = resp.json()
    return data.get("message", {}).get("content", str(data))


# =============================
# SPLIT SUMMARY + BULLETS
# =============================
def split_summary_and_bullets(text: str, bullets: int):
    lines = text.splitlines()
    summary_lines = []
    bullet_lines = []
    saw_bullet = False

    for raw in lines:
        if not raw.strip():
            continue

        if raw.lstrip().startswith(("-", "•", "*")):
            saw_bullet = True
            bullet_lines.append(raw.strip())
        else:
            if not saw_bullet:
                summary_lines.append(raw.strip())
            else:
                bullet_lines.append("- " + raw.strip())

    clean = [l.strip(" -*•") for l in bullet_lines][:bullets]
    summary = " ".join(summary_lines).strip()
    return summary, clean


# =============================
# MAIN ENDPOINT
# =============================
@app.post("/suggest")
def suggest(inp: SuggestIn):
    # normalize matched_pct & fit_score
    raw = inp.analysis.matched_pct if inp.analysis.matched_pct is not None else inp.analysis.matches_pct
    if raw is not None:
        try:
            val = float(raw)
            if val <= 1:
                val *= 100
            norm = round(val, 2)
            inp.analysis.matched_pct = norm
            if inp.analysis.fit_score is None:
                inp.analysis.fit_score = int(norm)
        except:
            pass

    # build prompt
    prompt = build_prompt(inp.analysis, inp.style, inp.role_hint)

    # call local model
    out_text = call_ollama(prompt)
    summary, suggestions = split_summary_and_bullets(out_text, inp.style.bullets)

    return {
        "summary": summary,
        "suggestions": suggestions,
        "matched_pct": inp.analysis.matched_pct,
        "fit_score": inp.analysis.fit_score,
        "matched_skills": inp.analysis.matched_skills,
        "missing_skills": inp.analysis.missing_skills,
        "disclaimer": "Only include truthful experience; do not fabricate."
    }