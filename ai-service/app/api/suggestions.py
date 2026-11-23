from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.suggestions import (
    InlineCompletionRequest,
    InlineCompletionResponse,
    SentenceStarter,
    SentenceStartersRequest,
    SentenceStartersResponse,
)
from app.providers.token_quota import (
    TokenQuotaExceededError,
    TokenQuotaUnavailableError,
)
from app.services.suggestions import (
    ContentGenerationService,
    ContentGenerationServiceUnavailableError,
    get_content_generation_service,
)


router = APIRouter(prefix="/v1/suggestions", tags=["suggestions"])
ContentGenerationServiceDependency = Annotated[
    ContentGenerationService,
    Depends(get_content_generation_service),
]


def _quota_exceeded(error: TokenQuotaExceededError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "code": "global_token_quota_exceeded",
            "quota": error.quota,
            "retry_after_seconds": error.retry_after_seconds,
        },
        headers={"Retry-After": str(error.retry_after_seconds)},
    )


def _quota_unavailable() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={"code": "token_quota_unavailable"},
    )


@router.post(
    "/sentence-starters",
    response_model=SentenceStartersResponse,
    status_code=status.HTTP_200_OK,
)
async def generate_sentence_starters(
    request: SentenceStartersRequest,
    service: ContentGenerationServiceDependency,
) -> SentenceStartersResponse:
    try:
        suggestions = await service.generate_sentence_starters(request)
    except TokenQuotaExceededError as error:
        raise _quota_exceeded(error) from error
    except TokenQuotaUnavailableError as error:
        raise _quota_unavailable() from error
    except ContentGenerationServiceUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Sentence starter generation is unavailable",
        ) from error

    return SentenceStartersResponse(
        suggestions=[SentenceStarter(text=text) for text in suggestions],
    )


@router.post(
    "/inline-completion",
    response_model=InlineCompletionResponse,
    status_code=status.HTTP_200_OK,
)
async def generate_inline_completion(
    request: InlineCompletionRequest,
    service: ContentGenerationServiceDependency,
) -> InlineCompletionResponse:
    try:
        suggestion = await service.generate_inline_completion(request)
    except TokenQuotaExceededError as error:
        raise _quota_exceeded(error) from error
    except TokenQuotaUnavailableError as error:
        raise _quota_unavailable() from error
    except ContentGenerationServiceUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Inline completion generation is unavailable",
        ) from error

    return InlineCompletionResponse(suggestion=suggestion)
