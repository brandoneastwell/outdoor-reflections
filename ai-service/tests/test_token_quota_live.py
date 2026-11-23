import asyncio
import os

import pytest
from redis.asyncio import Redis

from app.providers.token_quota import RedisTokenQuota, TokenQuotaExceededError


pytestmark = pytest.mark.redis_integration


def test_live_redis_reservation_and_reconciliation() -> None:
    if os.getenv("RUN_REDIS_INTEGRATION_TESTS") != "1":
        pytest.skip("Set RUN_REDIS_INTEGRATION_TESTS=1 to test Redis")

    async def run() -> None:
        redis = Redis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            decode_responses=True,
        )
        keys = ("ai:tokens:minute", "ai:tokens:day")
        try:
            await redis.delete(*keys)
            quota = RedisTokenQuota(redis, minute_limit=100, daily_limit=100)
            reservation = await quota.reserve(60)

            with pytest.raises(TokenQuotaExceededError):
                await quota.reserve(60)

            await quota.reconcile(reservation, actual_tokens=10)
            await quota.reserve(60)
        finally:
            await redis.delete(*keys)
            await redis.aclose()

    asyncio.run(run())
