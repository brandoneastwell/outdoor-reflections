import os
from functools import lru_cache

from app.models.suggestions import SentenceStartersRequest
from app.providers.groq import DEFAULT_GROQ_MODEL, GroqService, GroqServiceError


class SentenceStarterServiceUnavailableError(RuntimeError):
    """Raised when no sentence-starter provider is available."""


class SentenceStarterService:
    def __init__(self, groq_service: GroqService | None = None) -> None:
        self._groq_service = groq_service

    async def generate_sentence_starters(
        self,
        request: SentenceStartersRequest,
    ) -> list[str]:
        if self._groq_service is None:
            raise SentenceStarterServiceUnavailableError

        try:
            return await self._groq_service.generate_sentence_starters(
                current_content=request.current_content,
                previous_entries=request.previous_entries,
            )
        except GroqServiceError as error:
            raise SentenceStarterServiceUnavailableError from error


@lru_cache(maxsize=1)
def get_sentence_starter_service() -> SentenceStarterService:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return SentenceStarterService()

    model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)
    return SentenceStarterService(
        groq_service=GroqService(api_key=api_key, model=model),
    )
