from collections.abc import Iterator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.models.suggestions import (
    InlineCompletion,
    InlineCompletionRequest,
    InlineCompletionResponse,
    SentenceStartersRequest,
)
from app.services.suggestions import (
    ContentGenerationService,
    get_content_generation_service,
)


client = TestClient(app)


class StubContentGenerationService:
    def __init__(self) -> None:
        self.sentence_starter_request: SentenceStartersRequest | None = None
        self.inline_completion_request: InlineCompletionRequest | None = None

    async def generate_sentence_starters(
        self,
        request: SentenceStartersRequest,
    ) -> list[str]:
        self.sentence_starter_request = request
        return [
            "As the path opened ahead, I...",
            "What stayed with me most was...",
            "The changing light made me notice...",
        ]

    async def generate_inline_completion(
        self,
        request: InlineCompletionRequest,
    ) -> str:
        self.inline_completion_request = request
        return " noticed how quiet the woodland had become."


@pytest.fixture
def stub_service() -> Iterator[StubContentGenerationService]:
    service = StubContentGenerationService()
    app.dependency_overrides[get_content_generation_service] = lambda: service
    yield service
    app.dependency_overrides.clear()


def test_generate_sentence_starters(
    stub_service: StubContentGenerationService,
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
    assert stub_service.sentence_starter_request is not None
    assert stub_service.sentence_starter_request.previous_entries == [
        "Yesterday I noticed how quiet the woodland had become.",
        "The ridge walk left me feeling calmer.",
    ]


def test_generate_inline_completion(
    stub_service: StubContentGenerationService,
) -> None:
    response = client.post(
        "/v1/suggestions/inline-completion",
        json={
            "current_content": "Today I returned to the river path.",
            "previous_entries": ["The ridge walk left me feeling calmer."],
            "current_text_block": "As I reached the old oak, I",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "suggestion": " noticed how quiet the woodland had become.",
    }
    assert stub_service.inline_completion_request is not None
    assert stub_service.inline_completion_request.current_text_block == (
        "As I reached the old oak, I"
    )
    assert stub_service.inline_completion_request.previous_entries == [
        "The ridge walk left me feeling calmer.",
    ]


@pytest.mark.parametrize(
    "payload",
    [
        {
            "current_content": "Current reflection.",
            "current_text_block": "The path",
        },
        {
            "current_content": "Current reflection.",
            "previous_entries": ["A previous outdoor reflection."],
            "current_text_block": "",
        },
        {
            "current_content": "Current reflection.",
            "previous_entries": ["A previous outdoor reflection."],
            "current_text_block": "The path",
            "unexpected": "field",
        },
    ],
)
def test_inline_completion_rejects_invalid_requests(
    payload: dict[str, object],
) -> None:
    response = client.post("/v1/suggestions/inline-completion", json=payload)

    assert response.status_code == 422


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
    app.dependency_overrides[get_content_generation_service] = (
        lambda: ContentGenerationService()
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


def test_inline_completion_returns_service_unavailable_without_a_provider() -> None:
    app.dependency_overrides[get_content_generation_service] = (
        lambda: ContentGenerationService()
    )
    try:
        response = client.post(
            "/v1/suggestions/inline-completion",
            json={
                "current_content": "Today I returned to the river path.",
                "previous_entries": ["A previous outdoor reflection."],
                "current_text_block": "As I reached the old oak, I",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Inline completion generation is unavailable",
    }


def test_inline_completion_response_accepts_100_characters() -> None:
    response = InlineCompletionResponse(suggestion="a" * 100)

    assert response.suggestion == "a" * 100


def test_inline_completion_response_rejects_more_than_100_characters() -> None:
    with pytest.raises(ValidationError):
        InlineCompletionResponse(suggestion="a" * 101)


def test_inline_completion_uses_the_inline_completion_type() -> None:
    completion = InlineCompletion(text=" continued along the path.")

    assert completion.type == "inline_completion"
    assert completion.text == " continued along the path."


def test_groq_generation_limits_are_configurable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "test-api-key")
    monkeypatch.setenv("GROQ_MODEL", "test-model")
    monkeypatch.setenv("GROQ_MAX_COMPLETION_TOKENS", "128")
    monkeypatch.setenv("GROQ_REASONING_EFFORT", "MEDIUM")
    get_content_generation_service.cache_clear()

    try:
        with patch("app.services.suggestions.GroqService") as groq_service:
            get_content_generation_service()

        groq_service.assert_called_once_with(
            api_key="test-api-key",
            model="test-model",
            max_completion_tokens=128,
            reasoning_effort="medium",
        )
    finally:
        get_content_generation_service.cache_clear()
