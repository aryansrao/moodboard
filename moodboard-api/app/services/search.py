from __future__ import annotations

from typing import Any

from app.core.database import get_pool


async def search_posts(query: str, limit: int = 20, offset: int = 0) -> list[dict[str, Any]]:
    """
    Hybrid FTS + trigram search for posts.
    Ranks by full-text search rank first, then trigram similarity as tiebreaker.
    """
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT
            p.id,
            p.title,
            p.description,
            p.source_url,
            p.source_platform,
            p.media_type,
            p.thumbnail_url,
            p.blurhash,
            p.aspect_ratio,
            p.tags,
            p.is_public,
            p.is_anonymous,
            p.view_count,
            p.save_count,
            p.like_count,
            p.created_at,
            p.updated_at,
            p.user_id,
            u.username,
            u.display_name,
            u.avatar_url,
            ts_rank(p.search_vector, plainto_tsquery('english', $1)) AS fts_rank,
            similarity(p.title, $1) AS trgm_rank
        FROM posts p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE
            p.is_deleted = FALSE
            AND p.is_public = TRUE
            AND (
                p.search_vector @@ plainto_tsquery('english', $1)
                OR similarity(p.title, $1) > 0.1
                OR similarity(COALESCE(p.description, ''), $1) > 0.1
            )
        ORDER BY fts_rank DESC, trgm_rank DESC, p.created_at DESC
        LIMIT $2 OFFSET $3
        """,
        query,
        limit,
        offset,
    )
    return [dict(r) for r in rows]


async def search_collections(query: str, limit: int = 20, offset: int = 0) -> list[dict[str, Any]]:
    """Hybrid FTS + trigram search for collections."""
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT
            c.id,
            c.title,
            c.description,
            c.slug,
            c.cover_image_url,
            c.visibility,
            c.follower_count,
            c.post_count,
            c.created_at,
            c.updated_at,
            c.user_id,
            u.username,
            u.display_name,
            u.avatar_url,
            ts_rank(c.search_vector, plainto_tsquery('english', $1)) AS fts_rank,
            similarity(c.title, $1) AS trgm_rank,
            ARRAY(
                SELECT p.thumbnail_url
                FROM collection_posts cp
                JOIN posts p ON p.id = cp.post_id
                WHERE cp.collection_id = c.id
                  AND p.thumbnail_url IS NOT NULL
                  AND p.is_deleted = FALSE
                ORDER BY cp.position
                LIMIT 4
            ) AS preview_thumbnails
        FROM collections c
        LEFT JOIN users u ON u.id = c.user_id
        WHERE
            c.visibility = 'public'
            AND (
                c.search_vector @@ plainto_tsquery('english', $1)
                OR similarity(c.title, $1) > 0.1
                OR similarity(COALESCE(c.description, ''), $1) > 0.1
            )
        ORDER BY fts_rank DESC, trgm_rank DESC, c.follower_count DESC
        LIMIT $2 OFFSET $3
        """,
        query,
        limit,
        offset,
    )
    return [dict(r) for r in rows]


async def search_users(query: str, limit: int = 20, offset: int = 0) -> list[dict[str, Any]]:
    """Trigram-based user search on username and display_name."""
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT
            u.id,
            u.username,
            u.display_name,
            u.avatar_url,
            u.bio,
            u.created_at,
            similarity(u.username, $1) AS username_sim,
            similarity(u.display_name, $1) AS display_sim
        FROM users u
        WHERE
            u.is_anonymous = FALSE
            AND (
                similarity(u.username, $1) > 0.1
                OR similarity(u.display_name, $1) > 0.1
                OR u.username ILIKE '%' || $1 || '%'
                OR u.display_name ILIKE '%' || $1 || '%'
            )
        ORDER BY GREATEST(similarity(u.username, $1), similarity(u.display_name, $1)) DESC
        LIMIT $2 OFFSET $3
        """,
        query,
        limit,
        offset,
    )
    return [dict(r) for r in rows]


async def search_tags(query: str, limit: int = 20, offset: int = 0) -> list[dict[str, Any]]:
    """Search tags by name similarity and post count."""
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT
            t.id,
            t.name,
            t.post_count,
            similarity(t.name, $1) AS sim
        FROM tags t
        WHERE
            similarity(t.name, $1) > 0.1
            OR t.name ILIKE '%' || $1 || '%'
        ORDER BY sim DESC, t.post_count DESC
        LIMIT $2 OFFSET $3
        """,
        query,
        limit,
        offset,
    )
    return [dict(r) for r in rows]
