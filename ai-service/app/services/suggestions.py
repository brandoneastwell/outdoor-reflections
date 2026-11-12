from typing import Protocol

from app.models.suggestions import SentenceStartersRequest


class SentenceStarterServiceUnavailableError(RuntimeError):
    """Raised when no sentence-starter provider is available."""


class SentenceStarterService(Protocol):
    async def generate_sentence_starters(
        self,
        request: SentenceStartersRequest,
    ) -> list[str]: ...


class UnavailableSentenceStarterService:
    async def generate_sentence_starters(
        self,
        request: SentenceStartersRequest,
    ) -> list[str]:
        del request
        raise SentenceStarterServiceUnavailableError


def get_sentence_starter_service() -> SentenceStarterService:
    return UnavailableSentenceStarterService()
