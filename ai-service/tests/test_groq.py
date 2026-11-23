import asyncio
import json
import re
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from groq import APIError

from app.providers.groq import GroqService, GroqServiceError


def extract_delimited_journal_data(content: str) -> dict[str, object]:
    match = re.search(
        r"BEGIN_UNTRUSTED_JOURNAL_DATA_([0-9a-f]{32})\n"
        r"(.*)\nEND_UNTRUSTED_JOURNAL_DATA_\1$",
        content,
        re.DOTALL,
    )
    assert match is not None
    return json.loads(match.group(2))


def build_client(
    content: str,
    *,
    include_usage: bool = True,
) -> tuple[SimpleNamespace, AsyncMock]:
    response = SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content=content),
            ),
        ],
    )
    if include_usage:
        response.usage = SimpleNamespace(
            prompt_tokens=120,
            completion_tokens=30,
            total_tokens=150,
        )

    create = AsyncMock(return_value=response)
    client = SimpleNamespace(
        chat=SimpleNamespace(
            completions=SimpleNamespace(create=create),
        ),
    )
    return client, create


def test_generate_sentence_starters_with_structured_output(
    caplog: pytest.LogCaptureFixture,
) -> None:
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

    caplog.set_level("INFO", logger="app.providers.groq")
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
    journal_data = extract_delimited_journal_data(request["messages"][1]["content"])
    assert journal_data == {
        "current_content": "Today I returned to the river path.",
        "previous_entries": ["The ridge walk left me feeling calmer."],
    }
    usage_record = next(
        record for record in caplog.records if record.event == "groq_token_usage"
    )
    assert usage_record.operation == "sentence_starters"
    assert usage_record.model == "test-model"
    assert usage_record.prompt_tokens == 120
    assert usage_record.completion_tokens == 30
    assert usage_record.total_tokens == 150
    assert "Today I returned" not in caplog.text


def test_generate_inline_completion_with_structured_output(
    caplog: pytest.LogCaptureFixture,
) -> None:
    client, create = build_client(
        json.dumps({"text": " noticed how quiet the woodland had become."}),
    )
    service = GroqService(
        api_key="test-api-key",
        model="test-model",
        client=client,
    )

    caplog.set_level("INFO", logger="app.providers.groq")
    result = asyncio.run(
        service.generate_inline_completion(
            current_content="Today I returned to the river path.",
            previous_entries=["The ridge walk left me feeling calmer."],
            current_text_block="As I reached the old oak, I",
        ),
    )

    assert result == " noticed how quiet the woodland had become."
    request = create.await_args.kwargs
    assert request["response_format"]["type"] == "json_schema"
    assert request["response_format"]["json_schema"]["strict"] is True
    assert request["response_format"]["json_schema"]["schema"]["properties"][
        "text"
    ]["maxLength"] == 100
    assert "exactly one short inline continuation" in request["messages"][0][
        "content"
    ]
    journal_data = extract_delimited_journal_data(request["messages"][1]["content"])
    assert journal_data == {
        "current_content": "Today I returned to the river path.",
        "previous_entries": ["The ridge walk left me feeling calmer."],
        "current_text_block": "As I reached the old oak, I",
    }
    usage_record = next(
        record for record in caplog.records if record.event == "groq_token_usage"
    )
    assert usage_record.operation == "inline_completion"
    assert usage_record.total_tokens == 150
    assert "As I reached the old oak" not in caplog.text


def test_records_missing_token_usage_without_failing_generation(
    caplog: pytest.LogCaptureFixture,
) -> None:
    client, _ = build_client(
        json.dumps({"text": " beneath the shifting leaves."}),
        include_usage=False,
    )
    service = GroqService(api_key="test-api-key", client=client)

    completion = asyncio.run(
        service.generate_inline_completion(
            current_content="",
            previous_entries=["A previous outdoor reflection."],
            current_text_block="I paused",
        ),
    )

    assert completion == " beneath the shifting leaves."
    missing_record = next(
        record
        for record in caplog.records
        if record.event == "groq_token_usage_missing"
    )
    assert missing_record.operation == "inline_completion"


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


def test_rejects_inline_completion_over_100_characters() -> None:
    client, _ = build_client(json.dumps({"text": "a" * 101}))
    service = GroqService(api_key="test-api-key", client=client)

    with pytest.raises(GroqServiceError, match="invalid response"):
        asyncio.run(
            service.generate_inline_completion(
                current_content="",
                previous_entries=["A previous outdoor reflection."],
                current_text_block="The path",
            ),
        )


def test_rejects_empty_inline_completion_response() -> None:
    client, _ = build_client("")
    service = GroqService(api_key="test-api-key", client=client)

    with pytest.raises(GroqServiceError, match="empty response"):
        asyncio.run(
            service.generate_inline_completion(
                current_content="",
                previous_entries=["A previous outdoor reflection."],
                current_text_block="The path",
            ),
        )


def test_rejects_malformed_inline_completion_response() -> None:
    client, _ = build_client("not-json")
    service = GroqService(api_key="test-api-key", client=client)

    with pytest.raises(GroqServiceError, match="invalid response"):
        asyncio.run(
            service.generate_inline_completion(
                current_content="",
                previous_entries=["A previous outdoor reflection."],
                current_text_block="The path",
            ),
        )


def test_wraps_inline_completion_api_errors() -> None:
    client, create = build_client("")
    create.side_effect = APIError(
        "Groq is unavailable",
        request=httpx.Request("POST", "https://api.groq.com"),
        body=None,
    )
    service = GroqService(api_key="test-api-key", client=client)

    with pytest.raises(GroqServiceError, match="request failed"):
        asyncio.run(
            service.generate_inline_completion(
                current_content="",
                previous_entries=["A previous outdoor reflection."],
                current_text_block="The path",
            ),
        )
