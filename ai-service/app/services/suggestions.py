import os
from functools import lru_cache

from app.models.suggestions import SentenceStartersRequest, InlineCompletionRequest
from app.providers.groq import (
    DEFAULT_GROQ_MODEL,
    DEFAULT_MAX_INPUT_TOKENS,
    DEFAULT_MAX_COMPLETION_TOKENS,
    DEFAULT_REASONING_EFFORT,
    GroqService,
    GroqServiceError,
)


class ContentGenerationServiceUnavailableError(RuntimeError):
    """Raised when no sentence-starter provider is available."""


class ContentGenerationService:
    def __init__(self, groq_service: GroqService | None = None) -> None:
        self._groq_service = groq_service

    async def generate_sentence_starters(
        self,
        request: SentenceStartersRequest,
    ) -> list[str]:
        if self._groq_service is None:
            raise ContentGenerationServiceUnavailableError

        try:
            return await self._groq_service.generate_sentence_starters(
                current_content=request.current_content,
                previous_entries=request.previous_entries,
            )
        except GroqServiceError as error:
            raise ContentGenerationServiceUnavailableError from error

    async def generate_inline_completion(
            self,
            request: InlineCompletionRequest
    ) -> str:
        if self._groq_service is None:
            raise ContentGenerationServiceUnavailableError

        try:
            return await self._groq_service.generate_inline_completion(
                current_content=request.current_content,
                previous_entries=request.previous_entries,
                current_text_block=request.current_text_block,
            )
        except GroqServiceError as error:
            raise ContentGenerationServiceUnavailableError from error

@lru_cache(maxsize=1)
def get_content_generation_service() -> ContentGenerationService:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return ContentGenerationService()

    model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)
    max_input_tokens = int(
        os.getenv(
            "GROQ_MAX_INPUT_TOKENS",
            str(DEFAULT_MAX_INPUT_TOKENS),
        ),
    )
    max_completion_tokens = int(
        os.getenv(
            "GROQ_MAX_COMPLETION_TOKENS",
            str(DEFAULT_MAX_COMPLETION_TOKENS),
        ),
    )
    reasoning_effort = os.getenv(
        "GROQ_REASONING_EFFORT",
        DEFAULT_REASONING_EFFORT,
    ).strip().lower()
    return ContentGenerationService(
        groq_service=GroqService(
            api_key=api_key,
            model=model,
            max_input_tokens=max_input_tokens,
            max_completion_tokens=max_completion_tokens,
            reasoning_effort=reasoning_effort,
        ),
    )
