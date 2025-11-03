# Analyzer / Suggestions Dockerfile
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"
COPY . .
EXPOSE 7860
# bind to $PORT; fallback to 7860 for local
CMD ["sh","-c","uvicorn app:app --host 0.0.0.0 --port ${PORT:-7860} --workers 1"]
