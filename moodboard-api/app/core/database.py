import ssl as _ssl
from typing import AsyncGenerator
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
import asyncpg

from app.core.config import settings


def _prepare_db_url(url: str) -> tuple[str, dict]:
    """Strip params asyncpg doesn't accept (sslmode, channel_binding) and return connect_args."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query, keep_blank_values=True)
    sslmode = (params.pop('sslmode', [None])[0] or '').lower()
    params.pop('channel_binding', None)  # asyncpg doesn't accept this
    new_query = urlencode({k: v[0] for k, v in params.items()})
    clean_url = urlunparse(parsed._replace(query=new_query))

    connect_args: dict = {}
    if sslmode in ('require', 'verify-ca', 'verify-full', 'allow', 'prefer'):
        ctx = _ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = _ssl.CERT_NONE
        connect_args['ssl'] = ctx

    return clean_url, connect_args


_db_url, _connect_args = _prepare_db_url(settings.DATABASE_URL)

engine: AsyncEngine = create_async_engine(
    _db_url,
    connect_args=_connect_args,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# asyncpg raw connection pool for services that need high-performance raw queries
_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        raw_dsn = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        _, pool_connect_args = _prepare_db_url(raw_dsn)
        clean_dsn, _ = _prepare_db_url(raw_dsn)
        _pool = await asyncpg.create_pool(
            clean_dsn,
            min_size=2,
            max_size=10,
            command_timeout=30,
            **pool_connect_args,
        )
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def close_engine() -> None:
    await engine.dispose()
