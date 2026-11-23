import json
import re

import pytest

from app.providers.token_budget import (
    ConservativeTokenEstimator,
    PromptBudgetExceededError,
    PromptBudgeter,
)


SYSTEM_PROMPT = "Follow the journaling instructions."
INSTRUCTION = "Generate a suggestion from this journal data:"
RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "suggestion",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
            "additionalProperties": False,
        },
    },
}


def extract_journal_data(user_prompt: str) -> dict[str, object]:
    match = re.search(
        r"BEGIN_UNTRUSTED_JOURNAL_DATA_([0-9a-f]{32})\n"
        r"(.*)\nEND_UNTRUSTED_JOURNAL_DATA_\1$",
        user_prompt,
        re.DOTALL,
    )
    assert match is not None
    return json.loads(match.group(2))


def test_keeps_context_that_fits_without_mutating_the_request() -> None:
    journal_data = {
        "current_content": "Today I returned to the river path.",
        "previous_entries": [
            "The newest reflection.",
            "The older reflection.",
        ],
        "current_text_block": "I noticed",
    }
    original_previous_entries = list(journal_data["previous_entries"])

    prompt = PromptBudgeter(max_input_tokens=1_500).build(
        system_prompt=SYSTEM_PROMPT,
        instruction=INSTRUCTION,
        journal_data=journal_data,
        response_format=RESPONSE_FORMAT,
    )

    assert prompt.truncated is False
    assert prompt.estimated_input_tokens <= 1_500
    assert prompt.journal_data == journal_data
    assert journal_data["previous_entries"] == original_previous_entries
    assert extract_journal_data(prompt.messages[1]["content"]) == journal_data


def test_removes_the_oldest_previous_entry_first() -> None:
    journal_data = {
        "current_content": "c" * 500,
        "previous_entries": ["newest", "o" * 2_000],
        "current_text_block": "prefix-" + "x" * 500,
    }

    prompt = PromptBudgeter(max_input_tokens=1_000).build(
        system_prompt="system rules",
        instruction="generate",
        journal_data=journal_data,
        response_format={"type": "json_schema"},
    )

    assert prompt.truncated is True
    assert prompt.estimated_input_tokens <= 1_000
    assert prompt.journal_data["previous_entries"] == ["newest"]
    assert prompt.journal_data["current_content"] == "c" * 500
    assert prompt.journal_data["current_text_block"] == "prefix-" + "x" * 500
    assert journal_data["previous_entries"] == ["newest", "o" * 2_000]


def test_preserves_a_unicode_safe_suffix_of_the_active_text_block() -> None:
    current_text_block = "🌲" * 500 + " trail ending"
    prompt = PromptBudgeter(max_input_tokens=200).build(
        system_prompt="system rules",
        instruction="generate",
        journal_data={
            "current_content": "",
            "previous_entries": [],
            "current_text_block": current_text_block,
        },
        response_format={"type": "json_schema"},
    )

    budgeted_text_block = prompt.journal_data["current_text_block"]
    assert isinstance(budgeted_text_block, str)
    assert len(budgeted_text_block) < len(current_text_block)
    assert current_text_block.endswith(budgeted_text_block)
    assert budgeted_text_block.endswith(" trail ending")
    assert prompt.estimated_input_tokens <= 200
    assert extract_journal_data(prompt.messages[1]["content"]) == (
        prompt.journal_data
    )


def test_rejects_a_budget_too_small_for_required_instructions() -> None:
    with pytest.raises(PromptBudgetExceededError):
        PromptBudgeter(max_input_tokens=50).build(
            system_prompt=SYSTEM_PROMPT,
            instruction=INSTRUCTION,
            journal_data={
                "current_content": "",
                "previous_entries": [],
                "current_text_block": "I",
            },
            response_format=RESPONSE_FORMAT,
        )


def test_estimator_includes_structured_output_schema() -> None:
    estimator = ConservativeTokenEstimator()
    messages = [{"role": "user", "content": "Generate a suggestion."}]

    without_schema = estimator.estimate({"messages": messages})
    with_schema = estimator.estimate(
        {"messages": messages, "response_format": RESPONSE_FORMAT},
    )

    assert with_schema > without_schema
