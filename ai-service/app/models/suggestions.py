from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


PreviousEntry = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=10_000),
]


class SentenceStartersRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_content: Annotated[str, Field(max_length=10_000)]
    previous_entries: Annotated[
        list[PreviousEntry],
        Field(min_length=1, max_length=10),
    ]


class SentenceStarter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["sentence_starter"] = "sentence_starter"
    text: Annotated[str, Field(min_length=1, max_length=200)]


class SentenceStartersResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    suggestions: Annotated[
        list[SentenceStarter],
        Field(min_length=3, max_length=3),
    ]

class InlineCompletionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_content: Annotated[str, Field(max_length=10_000)]
    previous_entries: Annotated[
        list[PreviousEntry],
        Field(min_length=1, max_length=10),
    ]
    current_text_block: Annotated[str, Field(max_length=10_000)]

class InlineCompletionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
