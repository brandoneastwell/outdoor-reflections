import asyncio
import os

import pytest

from app.providers.groq import DEFAULT_GROQ_MODEL, GroqService
from app.providers.token_quota import get_token_quota


LIVE_TEST_FLAG = "RUN_LIVE_GROQ_TESTS"
TRUTHY_VALUES = {"1", "true", "yes", "on"}

pytestmark = pytest.mark.live_groq


@pytest.fixture(scope="module")
def live_groq_service() -> GroqService:
    live_tests_enabled = os.getenv(LIVE_TEST_FLAG, "").strip().lower()
    if live_tests_enabled not in TRUTHY_VALUES:
        pytest.skip(
            f"Set {LIVE_TEST_FLAG}=1 to enable paid live Groq tests",
        )

    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        pytest.fail(
            f"GROQ_API_KEY is required when {LIVE_TEST_FLAG}=1",
            pytrace=False,
        )

    model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip()
    return GroqService(
        api_key=api_key,
        model=model,
        token_quota=get_token_quota(),
    )


def test_live_sentence_starter_connection(
    live_groq_service: GroqService,
) -> None:
    suggestions = asyncio.run(
        live_groq_service.generate_sentence_starters(
            current_content="Today I paused beside a quiet woodland stream.",
            previous_entries=[
                "Yesterday I followed a ridge path as the weather cleared.",
                "Last week I noticed the first signs of autumn by the lake.",
            ],
        ),
    )

    assert len(suggestions) == 3
    assert all(suggestion.strip() for suggestion in suggestions)


def test_live_inline_completion_connection(
    live_groq_service: GroqService,
) -> None:
    completion = asyncio.run(
        live_groq_service.generate_inline_completion(
            current_content="The path was quiet after the rain.",
            previous_entries=[
                "A misty morning walk helped me slow down.",
                "I watched the light change across the hills.",
            ],
            current_text_block="As I reached the old oak tree, I",
        ),
    )

    assert completion.strip()
