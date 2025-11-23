from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import requests

# ---------- Ollama config ----------
# These are the ONLY env vars you need for the backend now.
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

app = FastAPI()

class Analysis(BaseModel):
    skills_detected: List[str]
    skills_required: List[str]
    matched_skills: List[str]
    missing_skills: List[str]
    fit_score: int
    evidence: Dict[str, List[str]]

class Style(BaseModel):
    bullets: int = 7
    max_words: int = 100
    tone: str = "professional"

class SuggestIn(BaseModel):
    analysis: Analysis
    style: Style = Style()
    role_hint: str | None = None

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

PROMPT_SYS = (
    "In strict mode."
    "You are a precise resume coach. "
    "Use only the facts in the ANALYSIS below. "
    "Return short, actionable, truthful suggestions. "
    "Do not invent or fabricate any experience."
)

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
Write {style.bullets} bullet-point suggestions (max {style.max_words} words total, {style.tone} tone).
Each bullet must be based ONLY on information in ANALYSIS.
Do not invent projects, responsibilities, or tools that are not supported by the evidence.
Start each suggestion with a bullet like '-' or '•'.
"""


def call_ollama(prompt: str) -> str:
    """Call local Ollama chat API and return the model's text."""
    try:
        resp = requests.post(
            f"{OLLAMA_HOST}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "stream": False,
            },
            timeout=90,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")

    data = resp.json()
    # Standard Ollama chat response: { "message": { "role": "...", "content": "..." }, ... }
    try:
        return data["message"]["content"]
    except (KeyError, TypeError):
        return str(data)

def extract_bullets(text: str, bullets: int) -> List[str]:
    """
    Try to extract bullet-like lines first.
    Fallback: split into sentences and use the first N.
    """
    # lines that start with -, •, or *
    lines = [
        l.strip(" •-*")
        for l in text.splitlines()
        if l.strip() and l.lstrip().startswith(("-", "•", "*"))
    ]

    if not lines:
        # Fallback: simple sentence split
        sents = [s.strip() for s in text.replace("•", "").split(".") if s.strip()]
        lines = sents[:bullets]

    return lines[:bullets]

@app.post("/suggest")
def suggest(inp: SuggestIn):
    prompt = build_prompt(inp.analysis, inp.style, inp.role_hint)
    out_text = call_ollama(prompt)
    suggestions = extract_bullets(out_text, inp.style.bullets)

    return {
        "suggestions": suggestions,
        "disclaimer": "Only include truthful experience; do not fabricate.",
    }