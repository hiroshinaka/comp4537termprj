from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import os, requests

HF_API_URL = os.getenv("HF_API_URL")
HF_API_KEY = os.getenv("HF_API_KEY")

app = FastAPI()

class Analysis(BaseModel):
    skills_detected: List[str]
    skills_required: List[str]
    matched_skills: List[str]
    missing_skills: List[str]
    fit_score: int
    evidence: Dict[str, List[str]]

class Style(BaseModel):
    bullets: int = 3
    max_words: int = 90
    tone: str = "professional"

class SuggestIn(BaseModel):
    analysis: Analysis
    style: Style = Style()
    role_hint: str | None = None

@app.get("/healthz")
def health():
    return {
        "ok": True,
        "has_api_key": bool(HF_API_KEY),
        "has_api_url": bool(HF_API_URL)
    }

PROMPT_SYS = ("You are a precise resume coach. Use only the facts in ANALYSIS. "
              "Return short, actionable, truthful suggestions. Avoid fabrications.")

def build_prompt(analysis: Analysis, style: Style, role_hint: str|None) -> str:
    return f"""SYSTEM:
{PROMPT_SYS}

ANALYSIS:
skills_detected: {analysis.skills_detected}
skills_required: {analysis.skills_required}
matched_skills: {analysis.matched_skills}
missing_skills: {analysis.missing_skills}
fit_score: {analysis.fit_score}
evidence.resume_snippets: {analysis.evidence.get('resume_snippets', [])}
evidence.job_snippets: {analysis.evidence.get('job_snippets', [])}
role_hint: {role_hint or ''}

USER:
Write {style.bullets} bullet suggestions (<= {style.max_words} words total, {style.tone} tone).
"""

@app.post("/suggest")
def suggest(inp: SuggestIn):
    if not HF_API_KEY or not HF_API_URL:
        raise HTTPException(status_code=500, detail="HF_API_KEY or HF_API_URL not set")

    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": build_prompt(inp.analysis, inp.style, inp.role_hint),
        "parameters": {"max_new_tokens": 220, "temperature": 0.4}
    }

    r = requests.post(HF_API_URL, headers=headers, json=payload, timeout=90)

    # If upstream errored, surface message to caller
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail={"hf_status": r.status_code, "hf_body": r.text})

    data = r.json()
    # Try common shapes
    if isinstance(data, list) and data and "generated_text" in data[0]:
        out = data[0]["generated_text"]
    elif isinstance(data, dict) and "generated_text" in data:
        out = data["generated_text"]
    elif isinstance(data, list) and data and isinstance(data[0], str):
        out = data[0]
    else:
        out = str(data)

    lines = [l.strip(" •-*") for l in out.splitlines()
             if l.strip() and l.lstrip().startswith(("-", "•", "*"))]
    if not lines:
        sents = [s.strip() for s in out.replace("•","").split(".") if s.strip()]
        lines = sents[:inp.style.bullets]

    return {"suggestions": lines[:inp.style.bullets], "disclaimer": "Only include truthful experience; do not fabricate."}
