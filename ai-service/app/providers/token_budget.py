import json
import math
import secrets
from copy import deepcopy
from dataclasses import dataclass
from typing import Any, Callable


DEFAULT_MAX_INPUT_TOKENS = 1_500
DEFAULT_ESTIMATED_BYTES_PER_TOKEN = 3
DEFAULT_ESTIMATION_SAFETY_FACTOR = 1.25


class PromptBudgetExceededError(ValueError):
    """Raised when required prompt instructions cannot fit within the budget."""


@dataclass(frozen=True)
class BudgetedPrompt:
    messages: list[dict[str, str]]
    journal_data: dict[str, Any]
    estimated_input_tokens: int
    truncated: bool


class ConservativeTokenEstimator:
    def __init__(
        self,
        bytes_per_token: int = DEFAULT_ESTIMATED_BYTES_PER_TOKEN,
        safety_factor: float = DEFAULT_ESTIMATION_SAFETY_FACTOR,
    ) -> None:
        if bytes_per_token <= 0:
            raise ValueError("bytes_per_token must be greater than zero")
        if safety_factor < 1:
            raise ValueError("safety_factor must be at least one")

        self._bytes_per_token = bytes_per_token
        self._safety_factor = safety_factor

    def estimate(self, payload: object) -> int:
        serialized = json.dumps(
            payload,
            ensure_ascii=False,
            separators=(",", ":"),
        )
        byte_count = len(serialized.encode("utf-8"))
        return math.ceil(
            byte_count / self._bytes_per_token * self._safety_factor,
        )


class PromptBudgeter:
    def __init__(
        self,
        max_input_tokens: int = DEFAULT_MAX_INPUT_TOKENS,
        estimator: ConservativeTokenEstimator | None = None,
    ) -> None:
        if max_input_tokens <= 0:
            raise ValueError("max_input_tokens must be greater than zero")

        self._max_input_tokens = max_input_tokens
        self._estimator = estimator or ConservativeTokenEstimator()

    def build(
        self,
        *,
        system_prompt: str,
        instruction: str,
        journal_data: dict[str, Any],
        response_format: dict[str, Any],
    ) -> BudgetedPrompt:
        context = deepcopy(journal_data)
        original_context = deepcopy(journal_data)

        def render() -> tuple[list[dict[str, str]], int]:
            messages = self._build_messages(
                system_prompt=system_prompt,
                instruction=instruction,
                journal_data=context,
            )
            estimated_tokens = self._estimator.estimate(
                {
                    "messages": messages,
                    "response_format": response_format,
                },
            )
            return messages, estimated_tokens

        messages, estimated_tokens = render()
        if estimated_tokens <= self._max_input_tokens:
            return BudgetedPrompt(
                messages=messages,
                journal_data=context,
                estimated_input_tokens=estimated_tokens,
                truncated=False,
            )

        previous_entries = context.get("previous_entries")
        if isinstance(previous_entries, list):
            while len(previous_entries) > 1:
                previous_entries.pop()
                messages, estimated_tokens = render()
                if estimated_tokens <= self._max_input_tokens:
                    return self._result(
                        messages,
                        context,
                        estimated_tokens,
                        original_context,
                    )

            if previous_entries:
                previous_entry = previous_entries[0]

                def set_previous_entry(value: str) -> None:
                    if value:
                        previous_entries[:] = [value]
                    else:
                        previous_entries.clear()

                messages, estimated_tokens = self._fit_suffix(
                    value=previous_entry,
                    set_value=set_previous_entry,
                    render=render,
                )
                if estimated_tokens <= self._max_input_tokens:
                    return self._result(
                        messages,
                        context,
                        estimated_tokens,
                        original_context,
                    )

        current_content = context.get("current_content")
        if isinstance(current_content, str) and current_content:
            messages, estimated_tokens = self._fit_suffix(
                value=current_content,
                set_value=lambda value: context.__setitem__(
                    "current_content",
                    value,
                ),
                render=render,
            )
            if estimated_tokens <= self._max_input_tokens:
                return self._result(
                    messages,
                    context,
                    estimated_tokens,
                    original_context,
                )

        current_text_block = context.get("current_text_block")
        if isinstance(current_text_block, str) and current_text_block:
            messages, estimated_tokens = self._fit_suffix(
                value=current_text_block,
                set_value=lambda value: context.__setitem__(
                    "current_text_block",
                    value,
                ),
                render=render,
                minimum_characters=1,
            )
            if estimated_tokens <= self._max_input_tokens:
                return self._result(
                    messages,
                    context,
                    estimated_tokens,
                    original_context,
                )

        raise PromptBudgetExceededError(
            "Required prompt instructions exceed the input token budget",
        )

    def _fit_suffix(
        self,
        *,
        value: str,
        set_value: Callable[[str], None],
        render: Callable[[], tuple[list[dict[str, str]], int]],
        minimum_characters: int = 0,
    ) -> tuple[list[dict[str, str]], int]:
        low = minimum_characters
        high = len(value)
        best_length: int | None = None
        best_messages: list[dict[str, str]] = []
        best_estimated_tokens = 0

        while low <= high:
            candidate_length = (low + high) // 2
            candidate = value[-candidate_length:] if candidate_length else ""
            set_value(candidate)
            messages, estimated_tokens = render()

            if estimated_tokens <= self._max_input_tokens:
                best_length = candidate_length
                best_messages = messages
                best_estimated_tokens = estimated_tokens
                low = candidate_length + 1
            else:
                high = candidate_length - 1

        if best_length is None:
            set_value(value[-minimum_characters:] if minimum_characters else "")
            return render()

        set_value(value[-best_length:] if best_length else "")
        return best_messages, best_estimated_tokens

    def _result(
        self,
        messages: list[dict[str, str]],
        journal_data: dict[str, Any],
        estimated_input_tokens: int,
        original_journal_data: dict[str, Any],
    ) -> BudgetedPrompt:
        return BudgetedPrompt(
            messages=messages,
            journal_data=journal_data,
            estimated_input_tokens=estimated_input_tokens,
            truncated=journal_data != original_journal_data,
        )

    def _build_messages(
        self,
        *,
        system_prompt: str,
        instruction: str,
        journal_data: dict[str, Any],
    ) -> list[dict[str, str]]:
        boundary_id = secrets.token_hex(16)
        serialized_journal_data = json.dumps(
            journal_data,
            ensure_ascii=False,
        )
        user_prompt = (
            f"{instruction}\n"
            f"BEGIN_UNTRUSTED_JOURNAL_DATA_{boundary_id}\n"
            f"{serialized_journal_data}\n"
            f"END_UNTRUSTED_JOURNAL_DATA_{boundary_id}"
        )
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
