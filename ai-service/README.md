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
GROQ_MAX_INPUT_TOKENS=1500
GROQ_MAX_COMPLETION_TOKENS=256
GROQ_REASONING_EFFORT=low
```

`GROQ_MODEL` is optional and defaults to `openai/gpt-oss-20b`.
`GROQ_MAX_INPUT_TOKENS` defaults to `1500`,
`GROQ_MAX_COMPLETION_TOKENS` defaults to `256`, and
`GROQ_REASONING_EFFORT` defaults to `low`. Supported reasoning effort values
are `low`, `medium`, and `high`.

The input-token limit applies to the complete Groq prompt, including system
instructions and the structured-output schema. If journal context exceeds the
budget, only the temporary AI prompt is shortened; stored journal content is
not changed. `previous_entries` must be ordered newest first so that the oldest
context is removed first.

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

The normal test suite never contacts Groq, even when `GROQ_API_KEY` is set.

### Live Groq tests

The live tests make two paid network requests and are disabled by default. To
run them directly with Python 3.12 or newer:

```bash
RUN_LIVE_GROQ_TESTS=1 GROQ_API_KEY=your-groq-api-key \
  python -m pytest -m live_groq
```

`GROQ_MODEL` is optional and defaults to `openai/gpt-oss-20b`.

To run the live suite with Docker:

```bash
docker build --target test -t outdoor-reflections-ai-test .
docker run --rm \
  -e RUN_LIVE_GROQ_TESTS=1 \
  -e GROQ_API_KEY \
  -e GROQ_MODEL \
  outdoor-reflections-ai-test \
  python -m pytest -m live_groq
```

Export `GROQ_API_KEY` in the shell before running the Docker command. If
`RUN_LIVE_GROQ_TESTS=1` is supplied without a key, the suite fails with a
configuration error rather than silently skipping.
