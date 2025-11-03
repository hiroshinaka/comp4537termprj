from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any
import os, requests

HF_API_URL = os.getenv("HF_API_URL", "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3")
HF_API_KEY = os.getenv("HF_API_KEY")  # set in compose or env

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

PROMPT_SYS = (
"You are a precise resume coach. Use only the facts in ANALYSIS. "
"Return short, actionable, truthful suggestions. Avoid fabrications."
)

def build_prompt(analysis: Analysis, style: Style, role_hint: str|None) -> str:
    return f"""
SYSTEM:
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

@app.get("/healthz")
def health(): return {"ok": True, "provider": "hf-inference"}

@app.post("/suggest")
def suggest(inp: SuggestIn):
    if not HF_API_KEY:
        return {"suggestions": [], "disclaimer": "HF_API_KEY missing"}
    prompt = build_prompt(inp.analysis, inp.style, inp.role_hint)

    # Basic text-generation call (provider-specific; here is generic)
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 180, "temperature": 0.4}
    }
    r = requests.post(HF_API_URL, headers=headers, json=payload, timeout=60)
    r.raise_for_status()
    text = r.json()
    # Different models return different shapes; try to extract text
    if isinstance(text, list) and text and "generated_text" in text[0]:
        out = text[0]["generated_text"]
    elif isinstance(text, dict) and "generated_text" in text:
        out = text["generated_text"]
    else:
        out = str(text)

    # Normalize to bullet list (split lines starting with -, •, or *)
    lines = [l.strip(" •-*") for l in out.splitlines() if l.strip() and l.lstrip().startswith(("-", "•", "*"))]
    # Fallback: if no bullets detected, create 1-3 bullets by sentence
    if not lines:
        sents = [s.strip() for s in out.replace("•","").split(".") if s.strip()]
        lines = sents[:inp.style.bullets]
    return {"suggestions": lines[:inp.style.bullets], "disclaimer": "Only include truthful experience; do not fabricate."}
