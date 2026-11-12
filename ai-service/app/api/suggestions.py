from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.suggestions import (
    SentenceStarter,
    SentenceStartersRequest,
    SentenceStartersResponse,
)
from app.services.suggestions import (
    SentenceStarterService,
    SentenceStarterServiceUnavailableError,
    get_sentence_starter_service,
)


router = APIRouter(prefix="/v1/suggestions", tags=["suggestions"])
SentenceStarterServiceDependency = Annotated[
    SentenceStarterService,
    Depends(get_sentence_starter_service),
]


@router.post(
    "/sentence-starters",
    response_model=SentenceStartersResponse,
    status_code=status.HTTP_200_OK,
)
async def generate_sentence_starters(
    request: SentenceStartersRequest,
    service: SentenceStarterServiceDependency,
) -> SentenceStartersResponse:
    try:
        suggestions = await service.generate_sentence_starters(request)
    except SentenceStarterServiceUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Sentence starter generation is unavailable",
        ) from error

    return SentenceStartersResponse(
        suggestions=[SentenceStarter(text=text) for text in suggestions],
    )
