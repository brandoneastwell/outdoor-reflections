# Outdoor Reflections AI service

Standalone FastAPI service for AI features used by the Outdoor Reflections
NestJS backend.

## Run locally

Python 3.12 or newer is required.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

The health endpoint is available at `http://localhost:8000/health`.

## Test

```bash
pytest
```
