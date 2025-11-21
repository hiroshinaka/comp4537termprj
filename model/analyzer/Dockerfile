# Use a slim Python image
FROM python:3.11-slim

# Install system deps (optional but good for scientific libs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Workdir inside container
WORKDIR /app

# Copy only requirements first (better layer caching)
COPY requirements.txt .

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt


COPY . .

# DigitalOcean App Platform sets 
ENV PORT=8000

# Expose the port FastAPI is running on 
EXPOSE 8000

# Start FastAPI with uvicorn
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
