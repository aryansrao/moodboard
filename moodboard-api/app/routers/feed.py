from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import redis
from app.core.security import get_current_user, get_optional_user
from app.models.user import User
from app.schemas.feed import FeedResponse
from app.schemas.post import PostResponse
from app.services.feed import get_following_feed, get_personalized_feed

router = APIRouter(tags=["feed"])


@router.get("/feed", response_model=FeedResponse)
async def get_feed(
    cursor: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Personalized feed — interests + follows + trending weighted."""
    interests = current_user.interests or []
    posts, next_cursor = await get_personalized_feed(
        user_id=current_user.id,
        interests=interests,
        cursor=cursor,
        limit=limit,
    )

    post_responses = []
    for p in posts:
        p_data = {k: v for k, v in p.items() if k not in ("username", "display_name", "avatar_url")}
        p_data["user"] = {
            "id": p.get("user_id"),
            "username": p.get("username"),
            "display_name": p.get("display_name") or "",
            "avatar_url": p.get("avatar_url"),
        }
        post_responses.append(PostResponse(**p_data))

    return FeedResponse(
        posts=post_responses,
        next_cursor=next_cursor,
        has_more=next_cursor is not None,
    )


@router.get("/feed/trending", response_model=FeedResponse)
async def get_trending_feed(
    cursor: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Trending posts — Redis-cached, recalculated hourly by Vercel Cron.
    Falls back to empty list if cache is cold.
    """
    cached = await redis.get("feed:trending")
    if not cached:
        return FeedResponse(posts=[], next_cursor=None, has_more=False)

    all_posts: list[dict] = json.loads(cached) if isinstance(cached, str) else cached

    # Apply cursor-based pagination over the cached list
    start_idx = 0
    if cursor:
        try:
            import base64
            payload = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
            cursor_post_id = payload.get("index", 0)
            start_idx = int(cursor_post_id)
        except Exception:
            start_idx = 0

    page = all_posts[start_idx: start_idx + limit + 1]
    has_more = len(page) > limit
    page = page[:limit]

    next_cursor: Optional[str] = None
    if has_more:
        import base64, json as _json
        next_cursor = base64.urlsafe_b64encode(
            _json.dumps({"index": start_idx + limit}).encode()
        ).decode()

    post_responses = []
    for p in page:
        p_data = {k: v for k, v in p.items() if k not in ("username", "display_name", "avatar_url")}
        p_data.setdefault("user", {
            "id": p.get("user_id"),
            "username": p.get("username"),
            "display_name": p.get("display_name") or "",
            "avatar_url": p.get("avatar_url"),
        })
        try:
            post_responses.append(PostResponse(**p_data))
        except Exception:
            pass

    return FeedResponse(posts=post_responses, next_cursor=next_cursor, has_more=has_more)


@router.get("/feed/following", response_model=FeedResponse)
async def get_following_feed_route(
    cursor: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """Posts from users the current user follows, cursor-paginated."""
    posts, next_cursor = await get_following_feed(
        user_id=current_user.id,
        cursor=cursor,
        limit=limit,
    )

    post_responses = []
    for p in posts:
        p_data = {k: v for k, v in p.items() if k not in ("username", "display_name", "avatar_url")}
        p_data["user"] = {
            "id": p.get("user_id"),
            "username": p.get("username"),
            "display_name": p.get("display_name") or "",
            "avatar_url": p.get("avatar_url"),
        }
        post_responses.append(PostResponse(**p_data))

    return FeedResponse(
        posts=post_responses,
        next_cursor=next_cursor,
        has_more=next_cursor is not None,
    )
