# COMP 4537 Term Project — Resume Analyzer

A full-stack, microservice-based web app that analyzes an uploaded resume, extracts structured insights (skills/keywords), and generates AI-driven improvement suggestions.

Live demo: `https://comp4537termprj.vercel.app` :contentReference[oaicite:0]{index=0}

---

## What’s in this repo

This repository is organized into three main parts: `frontend/`, `backend/`, and `model/`. 

- **frontend/** — UI for uploading resumes and viewing results
- **backend/** — API gateway / server that validates requests and coordinates services
- **model/** — ML/NLP service(s) for extracting structured resume data

(Repo languages include JavaScript, Python, and HTML.) :contentReference[oaicite:2]{index=2}

---

## Key Features

- Resume upload + parsing
- Skill/keyword extraction (structured output)
- AI-generated feedback and suggested improvements
- Microservice separation for scalability and clean responsibilities

---

## Architecture

**Frontend (client)**
- React + TypeScript + TailwindCSS (UI, upload flow, results display)

**Backend (API / coordinator)**
- Node.js + Express
- Handles routing, validation, and calls out to the ML + suggestion services

**Model / Analyzer Service**
- FastAPI (Python)
- Transformer-based NLP pipeline to extract structured resume signals (skills/keywords/etc.)

**Suggestion Service**
- LLM-based suggestion generation (commonly run via Ollama in local setups)

---

## Local Development

> This project is split into services. You’ll typically run 3 terminals (or use Docker, if you add a compose file).

### Prerequisites
- Node.js (LTS recommended)
- Python 3.10+ (recommended)
- (Optional) MySQL (if enabled in your backend setup)
- (Optional) Ollama (if suggestions are generated locally)

---

## Setup

### 1) Clone
```bash
git clone https://github.com/hiroshinaka/comp4537termprj.git
cd comp4537termprj
