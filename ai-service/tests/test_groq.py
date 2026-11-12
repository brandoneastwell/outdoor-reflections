import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.providers.groq import GroqService, GroqServiceError


def build_client(content: str) -> tuple[SimpleNamespace, AsyncMock]:
    create = AsyncMock(
        return_value=SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content=content),
                ),
            ],
        ),
    )
    client = SimpleNamespace(
        chat=SimpleNamespace(
            completions=SimpleNamespace(create=create),
        ),
    )
    return client, create


def test_generate_sentence_starters_with_structured_output() -> None:
    client, create = build_client(
        json.dumps(
            {
                "starters": [
                    {"text": "As the path opened ahead, I..."},
                    {"text": "What stayed with me most was..."},
                    {"text": "The changing light made me notice..."},
                ],
            },
        ),
    )
    service = GroqService(
        api_key="test-api-key",
        model="test-model",
        client=client,
    )

    result = asyncio.run(
        service.generate_sentence_starters(
            current_content="Today I returned to the river path.",
            previous_entries=["The ridge walk left me feeling calmer."],
        ),
    )

    assert result == [
        "As the path opened ahead, I...",
        "What stayed with me most was...",
        "The changing light made me notice...",
    ]
    request = create.await_args.kwargs
    assert request["model"] == "test-model"
    assert request["response_format"]["type"] == "json_schema"
    assert request["response_format"]["json_schema"]["strict"] is True
    assert request["temperature"] == 0.7
    assert "Today I returned to the river path." in request["messages"][1][
        "content"
    ]
    assert "The ridge walk left me feeling calmer." in request["messages"][1][
        "content"
    ]


def test_rejects_invalid_groq_response() -> None:
    client, _ = build_client('{"starters": [{"text": "Only one"}]}')
    service = GroqService(api_key="test-api-key", client=client)

    with pytest.raises(GroqServiceError, match="invalid response"):
        asyncio.run(
            service.generate_sentence_starters(
                current_content="",
                previous_entries=["A previous outdoor reflection."],
            ),
        )
