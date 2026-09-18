# DEVOPS-02 — backend.Dockerfile
# Build context (see docker-compose.yml): ../backend
# Containerizes the real, tested backend/app package (BACKEND-01..04).

FROM python:3.12-slim AS base

# Needed for asyncpg / psycopg-style builds and healthcheck's urllib call
# (already stdlib, no extra system package needed for that part).
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY app ./app

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

EXPOSE 8000

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
