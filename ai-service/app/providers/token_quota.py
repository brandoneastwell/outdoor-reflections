import logging
import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from redis.asyncio import Redis
from redis.exceptions import RedisError


DEFAULT_MINUTE_TOKEN_LIMIT = 6_000
DEFAULT_DAILY_TOKEN_LIMIT = 150_000
MINUTE_MS = 60_000
DAY_MS = 86_400_000
logger = logging.getLogger(__name__)

RESERVE_SCRIPT = """
local now = redis.call('TIME')
local now_ms = now[1] * 1000 + math.floor(now[2] / 1000)
local requested = tonumber(ARGV[1])

local function load_bucket(key, capacity, window_ms)
  local values = redis.call('HMGET', key, 'tokens', 'updated_at')
  local tokens = tonumber(values[1]) or capacity
  local updated_at = tonumber(values[2]) or now_ms
  tokens = math.min(capacity, tokens + (now_ms - updated_at) * capacity / window_ms)
  return tokens
end

local minute_capacity = tonumber(ARGV[2])
local day_capacity = tonumber(ARGV[3])
local minute_tokens = load_bucket(KEYS[1], minute_capacity, tonumber(ARGV[4]))
local day_tokens = load_bucket(KEYS[2], day_capacity, tonumber(ARGV[5]))

if minute_tokens < requested or day_tokens < requested then
  local minute_retry = math.max(0, (requested - minute_tokens) * tonumber(ARGV[4]) / minute_capacity)
  local day_retry = math.max(0, (requested - day_tokens) * tonumber(ARGV[5]) / day_capacity)
  redis.call('HSET', KEYS[1], 'tokens', minute_tokens, 'updated_at', now_ms)
  redis.call('HSET', KEYS[2], 'tokens', day_tokens, 'updated_at', now_ms)
  redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[4]) * 2)
  redis.call('PEXPIRE', KEYS[2], tonumber(ARGV[5]) * 2)
  if minute_retry >= day_retry then
    return {0, math.ceil(minute_retry / 1000), 1}
  end
  return {0, math.ceil(day_retry / 1000), 2}
end

redis.call('HSET', KEYS[1], 'tokens', minute_tokens - requested, 'updated_at', now_ms)
redis.call('HSET', KEYS[2], 'tokens', day_tokens - requested, 'updated_at', now_ms)
redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[4]) * 2)
redis.call('PEXPIRE', KEYS[2], tonumber(ARGV[5]) * 2)
return {1, 0, 0}
"""

RECONCILE_SCRIPT = """
local now = redis.call('TIME')
local now_ms = now[1] * 1000 + math.floor(now[2] / 1000)
local adjustment = tonumber(ARGV[1])

local function adjust_bucket(key, capacity, window_ms)
  local values = redis.call('HMGET', key, 'tokens', 'updated_at')
  if not values[1] then return end
  local tokens = tonumber(values[1])
  local updated_at = tonumber(values[2]) or now_ms
  tokens = math.min(capacity, tokens + (now_ms - updated_at) * capacity / window_ms)
  tokens = math.max(0, math.min(capacity, tokens + adjustment))
  redis.call('HSET', key, 'tokens', tokens, 'updated_at', now_ms)
  redis.call('PEXPIRE', key, window_ms * 2)
end

adjust_bucket(KEYS[1], tonumber(ARGV[2]), tonumber(ARGV[4]))
adjust_bucket(KEYS[2], tonumber(ARGV[3]), tonumber(ARGV[5]))
return 1
"""


class TokenQuotaExceededError(RuntimeError):
    def __init__(self, quota: str, retry_after_seconds: int) -> None:
        self.quota = quota
        self.retry_after_seconds = max(1, retry_after_seconds)
        super().__init__(f"Global {quota} token quota exceeded")


class TokenQuotaUnavailableError(RuntimeError):
    """Raised when token quota state cannot be read or updated."""


@dataclass(frozen=True)
class TokenReservation:
    reserved_tokens: int


class RedisTokenQuota:
    def __init__(
        self,
        redis: Any,
        minute_limit: int = DEFAULT_MINUTE_TOKEN_LIMIT,
        daily_limit: int = DEFAULT_DAILY_TOKEN_LIMIT,
    ) -> None:
        if minute_limit <= 0 or daily_limit <= 0:
            raise ValueError("Token quota limits must be greater than zero")
        self._redis = redis
        self._minute_limit = minute_limit
        self._daily_limit = daily_limit

    async def reserve(self, tokens: int) -> TokenReservation:
        if tokens <= 0:
            raise ValueError("Reserved tokens must be greater than zero")
        if tokens > self._daily_limit:
            raise TokenQuotaExceededError("tokens_per_day", 86_400)
        if tokens > self._minute_limit:
            raise TokenQuotaExceededError("tokens_per_minute", 60)

        try:
            allowed, retry_after, quota_index = await self._redis.eval(
                RESERVE_SCRIPT,
                2,
                "ai:tokens:minute",
                "ai:tokens:day",
                tokens,
                self._minute_limit,
                self._daily_limit,
                MINUTE_MS,
                DAY_MS,
            )
        except RedisError as error:
            raise TokenQuotaUnavailableError from error

        if not allowed:
            quota = "tokens_per_minute" if quota_index == 1 else "tokens_per_day"
            raise TokenQuotaExceededError(quota, int(retry_after))
        return TokenReservation(reserved_tokens=tokens)

    async def reconcile(
        self,
        reservation: TokenReservation,
        actual_tokens: int,
    ) -> None:
        adjustment = reservation.reserved_tokens - actual_tokens
        if adjustment == 0:
            return
        try:
            await self._redis.eval(
                RECONCILE_SCRIPT,
                2,
                "ai:tokens:minute",
                "ai:tokens:day",
                adjustment,
                self._minute_limit,
                self._daily_limit,
                MINUTE_MS,
                DAY_MS,
            )
        except RedisError as error:
            raise TokenQuotaUnavailableError from error


@lru_cache(maxsize=1)
def get_token_quota() -> RedisTokenQuota:
    redis = Redis.from_url(
        os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        decode_responses=True,
    )
    return RedisTokenQuota(
        redis=redis,
        minute_limit=int(
            os.getenv("GROQ_TOKEN_LIMIT_PER_MINUTE", DEFAULT_MINUTE_TOKEN_LIMIT),
        ),
        daily_limit=int(
            os.getenv("GROQ_TOKEN_LIMIT_PER_DAY", DEFAULT_DAILY_TOKEN_LIMIT),
        ),
    )
