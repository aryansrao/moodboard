from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Path, status

from app.core.config import settings
from app.core.database import get_pool

router = APIRouter(tags=["seo"])


@router.get("/sitemap/{type}")
async def get_sitemap(
    type: str = Path(..., description="posts | collections | users | tags"),
) -> list[dict[str, Any]]:
    """
    Sitemap data for SEO crawlers.
    Returns list of {url, updated_at} for the given type.
    """
    valid_types = {"posts", "collections", "users", "tags"}
    if type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sitemap type. Must be one of: {', '.join(valid_types)}",
        )

    pool = await get_pool()
    base = settings.API_BASE_URL.rstrip("/")
    # Use the app's frontend domain for sitemap URLs
    frontend_base = base.replace("api.", "").replace("/api", "")

    if type == "posts":
        rows = await pool.fetch(
            """
            SELECT id, updated_at
            FROM posts
            WHERE is_deleted = FALSE AND is_public = TRUE
            ORDER BY updated_at DESC
            LIMIT 10000
            """
        )
        return [
            {
                "url": f"{frontend_base}/p/{row['id']}",
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
            }
            for row in rows
        ]

    elif type == "collections":
        rows = await pool.fetch(
            """
            SELECT slug, updated_at
            FROM collections
            WHERE visibility = 'public'
            ORDER BY updated_at DESC
            LIMIT 10000
            """
        )
        return [
            {
                "url": f"{frontend_base}/c/{row['slug']}",
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
            }
            for row in rows
        ]

    elif type == "users":
        rows = await pool.fetch(
            """
            SELECT username, updated_at
            FROM users
            WHERE is_anonymous = FALSE
            ORDER BY updated_at DESC
            LIMIT 10000
            """
        )
        return [
            {
                "url": f"{frontend_base}/u/{row['username']}",
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
            }
            for row in rows
        ]

    else:  # tags
        rows = await pool.fetch(
            """
            SELECT name, post_count
            FROM tags
            WHERE post_count > 0
            ORDER BY post_count DESC
            LIMIT 5000
            """
        )
        return [
            {
                "url": f"{frontend_base}/tag/{row['name']}",
                "updated_at": None,
                "post_count": row["post_count"],
            }
            for row in rows
        ]
