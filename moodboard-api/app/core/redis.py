from upstash_redis.asyncio import Redis as UpstashRedis
from app.core.config import settings

redis: UpstashRedis = UpstashRedis(
    url=settings.UPSTASH_REDIS_REST_URL,
    token=settings.UPSTASH_REDIS_REST_TOKEN,
)


async def get_redis() -> UpstashRedis:
    return redis
