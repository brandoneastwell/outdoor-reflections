# Outdoor Reflections AI service

Standalone FastAPI service for AI features used by the Outdoor Reflections
NestJS backend.

## Run with Docker Compose

Docker is the recommended option and does not require Python to be installed on
your machine. From the repository root, run:

```bash
docker compose -f backend/docker-compose.yml up --build ai-service
```

Check the service from another terminal:

```bash
curl http://localhost:8000/health
```

Set the Groq configuration in `backend/.env` before requesting sentence
starters:

```dotenv
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-20b
```

`GROQ_MODEL` is optional and defaults to `openai/gpt-oss-20b`.

## Run directly with Python

Python 3.12 or newer is required.

```bash
python3 --version
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
python -m uvicorn app.main:app --reload
```

The version printed by `python3 --version` must be 3.12 or newer. If it is
older, use Docker or install a newer Python release before creating the virtual
environment.

The health endpoint is available at `http://localhost:8000/health`.

## Test

```bash
python -m pytest
```
