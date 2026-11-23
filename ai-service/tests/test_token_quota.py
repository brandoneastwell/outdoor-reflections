import asyncio
from unittest.mock import AsyncMock

import pytest
from redis.exceptions import ConnectionError

from app.providers.token_quota import (
    RedisTokenQuota,
    TokenQuotaExceededError,
    TokenQuotaUnavailableError,
    TokenReservation,
)


def test_reserves_and_reconciles_tokens() -> None:
    redis = AsyncMock()
    redis.eval.side_effect = [[1, 0, 0], 1]
    quota = RedisTokenQuota(redis=redis)

    reservation = asyncio.run(quota.reserve(1_000))
    asyncio.run(quota.reconcile(reservation, actual_tokens=600))

    assert reservation == TokenReservation(reserved_tokens=1_000)
    assert redis.eval.await_count == 2
    assert redis.eval.await_args_list[1].args[4] == 400


def test_reports_the_exhausted_quota_and_retry_time() -> None:
    redis = AsyncMock()
    redis.eval.return_value = [0, 42, 2]
    quota = RedisTokenQuota(redis=redis)

    with pytest.raises(TokenQuotaExceededError) as raised:
        asyncio.run(quota.reserve(1_000))

    assert raised.value.quota == "tokens_per_day"
    assert raised.value.retry_after_seconds == 42


def test_fails_closed_when_redis_is_unavailable() -> None:
    redis = AsyncMock()
    redis.eval.side_effect = ConnectionError("Redis unavailable")
    quota = RedisTokenQuota(redis=redis)

    with pytest.raises(TokenQuotaUnavailableError):
        asyncio.run(quota.reserve(1_000))
