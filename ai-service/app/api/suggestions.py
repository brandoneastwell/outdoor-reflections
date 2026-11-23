from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.suggestions import (
    InlineCompletion,
    SentenceStarter,
    SentenceStartersRequest,
    SentenceStartersResponse, InlineCompletionResponse, InlineCompletionRequest
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
        suggestions = await service.generate_inline_completion(request)
    except ContentGenerationServiceUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Inline completion generation is unavailable",
        ) from error

    return InlineCompletionResponse(
        suggestions=[InlineCompletion(text=text) for text in suggestions]
    )
