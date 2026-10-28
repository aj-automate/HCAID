# Eén container: React-frontend wordt gebouwd en door FastAPI geserveerd.

# ---------- frontend ----------
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- backend ----------
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY ml/ ml/
COPY models/ models/
COPY backend/ backend/
COPY --from=frontend /app/frontend/dist frontend/dist

# Railway zet $PORT; lokaal valt het terug op 8000.
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000} --no-access-log"]
