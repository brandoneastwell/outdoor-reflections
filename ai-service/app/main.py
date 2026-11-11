from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel


SERVICE_NAME = "outdoor-reflections-ai"
SERVICE_VERSION = "0.1.0"

app = FastAPI(
    title="Outdoor Reflections AI Service",
    version=SERVICE_VERSION,
)


class HealthResponse(BaseModel):
    status: Literal["healthy"]
    service: str
    version: str


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health() -> HealthResponse:
    """Report whether the service process is available."""
    return HealthResponse(
        status="healthy",
        service=SERVICE_NAME,
        version=SERVICE_VERSION,
    )
