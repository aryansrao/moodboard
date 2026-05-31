from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import close_engine, close_pool, get_pool
from app.core.redis import redis
from app.routers import (
    ai,
    auth,
    collections,
    feed,
    media,
    messages,
    notifications,
    posts,
    search,
    seo,
    users,
    workers,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: initialize and tear down resources."""
    # Warm up the asyncpg connection pool
    try:
        await get_pool()
    except Exception as exc:
        print(f"Warning: could not initialize DB pool: {exc}")

    # Pre-fetch JWKS so the first authenticated request doesn't hang
    try:
        from app.core.security import _get_jwks_keys
        await _get_jwks_keys()
        print("✓ JWKS signing keys loaded.")
    except Exception as exc:
        print(f"Warning: could not pre-fetch JWKS: {exc}")

    yield

    # Shutdown
    await close_pool()
    await close_engine()


app = FastAPI(
    title="Moodboard API",
    description="Backend API for Moodboard — visual content curation platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://moodboard-web-aryansrao.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers — all under /api/v1 prefix
API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(posts.router, prefix=API_PREFIX)
app.include_router(collections.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(media.router, prefix=API_PREFIX)
app.include_router(search.router, prefix=API_PREFIX)
app.include_router(messages.router, prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)
app.include_router(feed.router, prefix=API_PREFIX)
app.include_router(ai.router, prefix=API_PREFIX)
app.include_router(workers.router, prefix=API_PREFIX)
app.include_router(seo.router, prefix=API_PREFIX)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "environment": settings.ENVIRONMENT}


@app.get("/")
async def root():
    return {"message": "Moodboard API", "docs": "/api/docs"}
