from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.suggestions import SentenceStartersRequest
from app.services.suggestions import (
    SentenceStarterService,
    get_sentence_starter_service,
)


client = TestClient(app)


class StubSentenceStarterService:
    def __init__(self) -> None:
        self.request: SentenceStartersRequest | None = None

    async def generate_sentence_starters(
        self,
        request: SentenceStartersRequest,
    ) -> list[str]:
        self.request = request
        return [
            "As the path opened ahead, I...",
            "What stayed with me most was...",
            "The changing light made me notice...",
        ]


@pytest.fixture
def stub_service() -> Iterator[StubSentenceStarterService]:
    service = StubSentenceStarterService()
    app.dependency_overrides[get_sentence_starter_service] = lambda: service
    yield service
    app.dependency_overrides.clear()


def test_generate_sentence_starters(
    stub_service: StubSentenceStarterService,
) -> None:
    response = client.post(
        "/v1/suggestions/sentence-starters",
        json={
            "current_content": "Today I returned to the river path.",
            "previous_entries": [
                "Yesterday I noticed how quiet the woodland had become.",
                "The ridge walk left me feeling calmer.",
            ],
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "suggestions": [
            {
                "type": "sentence_starter",
                "text": "As the path opened ahead, I...",
            },
            {
                "type": "sentence_starter",
                "text": "What stayed with me most was...",
            },
            {
                "type": "sentence_starter",
                "text": "The changing light made me notice...",
            },
        ],
    }
    assert stub_service.request is not None
    assert stub_service.request.previous_entries == [
        "Yesterday I noticed how quiet the woodland had become.",
        "The ridge walk left me feeling calmer.",
    ]


def test_previous_entries_are_required() -> None:
    response = client.post(
        "/v1/suggestions/sentence-starters",
        json={
            "current_content": "Today I returned to the river path.",
            "previous_entries": [],
        },
    )

    assert response.status_code == 422


def test_returns_service_unavailable_without_a_provider() -> None:
    app.dependency_overrides[get_sentence_starter_service] = (
        lambda: SentenceStarterService()
    )
    try:
        response = client.post(
            "/v1/suggestions/sentence-starters",
            json={
                "current_content": "",
                "previous_entries": ["A previous outdoor reflection."],
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Sentence starter generation is unavailable",
    }
