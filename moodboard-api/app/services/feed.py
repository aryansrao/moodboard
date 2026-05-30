from __future__ import annotations

import base64
import json
import uuid
from datetime import datetime
from typing import Any, Optional

from app.core.database import get_pool


def _encode_cursor(created_at: datetime, post_id: uuid.UUID) -> str:
    """Encode a feed cursor as base64 JSON."""
    payload = {"created_at": created_at.isoformat(), "id": str(post_id)}
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def _decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    """Decode a base64 feed cursor."""
    payload = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
    return datetime.fromisoformat(payload["created_at"]), uuid.UUID(payload["id"])


_POST_SELECT = """
    SELECT
        p.id, p.user_id, p.title, p.description, p.source_url, p.source_platform,
        p.media_type, p.thumbnail_url, p.file_url, p.embed_url, p.og_data,
        p.media_items, p.blurhash, p.aspect_ratio, p.tags, p.is_public, p.is_anonymous,
        p.is_deleted, p.view_count, p.save_count, p.like_count,
        p.created_at, p.updated_at,
        u.username, u.display_name, u.avatar_url
    FROM posts p
    LEFT JOIN users u ON u.id = p.user_id
"""


async def get_personalized_feed(
    user_id: uuid.UUID,
    interests: list[str],
    cursor: Optional[str] = None,
    limit: int = 20,
) -> tuple[list[dict[str, Any]], Optional[str]]:
    """
    Personalized feed: weighted mix of user interests (tags), followed users, trending.
    Cursor-based pagination using (created_at, id).
    """
    pool = await get_pool()

    cursor_filter = "TRUE"
    cursor_params: list[Any] = [str(user_id), limit + 1]

    if cursor:
        try:
            cur_dt, cur_id = _decode_cursor(cursor)
            cursor_filter = f"(p.created_at, p.id) < ($3::timestamptz, $4::uuid)"
            cursor_params += [cur_dt, cur_id]
        except Exception:
            pass

    interests_filter = ""
    if interests:
        interests_filter = "OR p.tags && $5::text[]"
        cursor_params.append(interests)

    query = f"""
        {_POST_SELECT}
        WHERE
            p.is_deleted = FALSE
            AND p.is_public = TRUE
            AND {cursor_filter}
            AND (
                p.user_id IN (
                    SELECT following_id FROM follows WHERE follower_id = $1::uuid
                )
                {interests_filter}
                OR p.created_at >= NOW() - INTERVAL '7 days'
            )
        ORDER BY
            (
                CASE WHEN p.user_id IN (
                    SELECT following_id FROM follows WHERE follower_id = $1::uuid
                ) THEN 3 ELSE 0 END
                + CASE WHEN p.tags && COALESCE($5::text[], ARRAY[]::text[]) THEN 2 ELSE 0 END
                + (p.like_count + p.save_count * 2 + p.view_count * 0.1) / 100.0
            ) DESC,
            p.created_at DESC,
            p.id DESC
        LIMIT $2
    """

    # Re-parametrize query if no cursor and no interests cleanly
    # Build a simpler version instead to avoid parameter index confusion
    rows = await _personalized_feed_raw(user_id, interests, cursor, limit)
    return rows


async def _personalized_feed_raw(
    user_id: uuid.UUID,
    interests: list[str],
    cursor: Optional[str],
    limit: int,
) -> tuple[list[dict[str, Any]], Optional[str]]:
    pool = await get_pool()

    cur_dt: Optional[datetime] = None
    cur_id: Optional[uuid.UUID] = None
    if cursor:
        try:
            cur_dt, cur_id = _decode_cursor(cursor)
        except Exception:
            pass

    has_cursor = cur_dt is not None and cur_id is not None
    has_interests = bool(interests)

    # Build query dynamically
    where_clauses = ["p.is_deleted = FALSE", "p.is_public = TRUE"]
    params: list[Any] = [str(user_id)]
    param_idx = 2

    if has_cursor:
        where_clauses.append(
            f"(p.created_at < ${param_idx}::timestamptz OR "
            f"(p.created_at = ${param_idx}::timestamptz AND p.id < ${param_idx + 1}::uuid))"
        )
        params.append(cur_dt)
        params.append(cur_id)
        param_idx += 2

    interest_expr = "ARRAY[]::text[]"
    if has_interests:
        interest_expr = f"${param_idx}::text[]"
        params.append(interests)
        param_idx += 1

    params.append(limit + 1)
    limit_param = param_idx

    sql = f"""
        {_POST_SELECT}
        WHERE
            {" AND ".join(where_clauses)}
            AND (
                p.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1::uuid)
                OR p.tags && {interest_expr}
                OR p.created_at >= NOW() - INTERVAL '7 days'
            )
        ORDER BY
            (
                CASE WHEN p.user_id IN (
                    SELECT following_id FROM follows WHERE follower_id = $1::uuid
                ) THEN 3 ELSE 0 END
                + CASE WHEN p.tags && {interest_expr} THEN 2 ELSE 0 END
                + (p.like_count + p.save_count * 2 + p.view_count * 0.1) / 100.0
            ) DESC,
            p.created_at DESC,
            p.id DESC
        LIMIT ${limit_param}
    """

    rows = await pool.fetch(sql, *params)
    result = [dict(r) for r in rows]

    next_cursor: Optional[str] = None
    if len(result) > limit:
        result = result[:limit]
        last = result[-1]
        next_cursor = _encode_cursor(last["created_at"], last["id"])

    return result, next_cursor


async def get_following_feed(
    user_id: uuid.UUID,
    cursor: Optional[str] = None,
    limit: int = 20,
) -> tuple[list[dict[str, Any]], Optional[str]]:
    """Posts from followed users only, cursor-paginated."""
    pool = await get_pool()

    cur_dt: Optional[datetime] = None
    cur_id: Optional[uuid.UUID] = None
    if cursor:
        try:
            cur_dt, cur_id = _decode_cursor(cursor)
        except Exception:
            pass

    where_clauses = [
        "p.is_deleted = FALSE",
        "p.is_public = TRUE",
        "p.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1::uuid)",
    ]
    params: list[Any] = [str(user_id)]
    param_idx = 2

    if cur_dt and cur_id:
        where_clauses.append(
            f"(p.created_at < ${param_idx}::timestamptz OR "
            f"(p.created_at = ${param_idx}::timestamptz AND p.id < ${param_idx + 1}::uuid))"
        )
        params.append(cur_dt.isoformat())
        params.append(str(cur_id))
        param_idx += 2

    params.append(limit + 1)

    sql = f"""
        {_POST_SELECT}
        WHERE {" AND ".join(where_clauses)}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ${param_idx}
    """

    rows = await pool.fetch(sql, *params)
    result = [dict(r) for r in rows]

    next_cursor: Optional[str] = None
    if len(result) > limit:
        result = result[:limit]
        last = result[-1]
        next_cursor = _encode_cursor(last["created_at"], last["id"])

    return result, next_cursor
