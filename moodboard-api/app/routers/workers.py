from __future__ import annotations

import hashlib
import hmac
import json
import time
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db, get_pool
from app.core.redis import redis
from app.models.post import Post
from app.schemas.media import DownloadVideoPayload, MetadataJobPayload
from app.services.blurhash import generate_blurhash_from_url
from app.services.fetcher import fetch_url_metadata

router = APIRouter(tags=["workers"])


def _verify_qstash_signature(body: bytes, signature: str, signing_key: str) -> bool:
    """Verify QStash HMAC-SHA256 signature."""
    try:
        # QStash signature format: v1=<base64url-encoded-hmac>
        if signature.startswith("v1="):
            sig_b64 = signature[3:]
        else:
            sig_b64 = signature

        import base64
        expected_sig = hmac.new(signing_key.encode(), body, hashlib.sha256).digest()
        provided_sig = base64.urlsafe_b64decode(sig_b64 + "==")
        return hmac.compare_digest(expected_sig, provided_sig)
    except Exception:
        return False


async def _verify_qstash_request(request: Request) -> None:
    """Verify QStash signature using current or next signing key."""
    body = await request.body()
    signature = request.headers.get("upstash-signature", "")

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing QStash signature",
        )

    # Try current signing key first, then next signing key
    if _verify_qstash_signature(body, signature, settings.QSTASH_CURRENT_SIGNING_KEY):
        return
    if _verify_qstash_signature(body, signature, settings.QSTASH_NEXT_SIGNING_KEY):
        return

    # In development, skip signature verification
    if settings.ENVIRONMENT == "development":
        return

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid QStash signature",
    )


@router.post("/workers/fetch-metadata")
async def fetch_metadata_worker(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    QStash background worker: fetch full metadata for a post.
    Verifies QStash signature, fetches URL metadata, generates blurhash.
    """
    await _verify_qstash_request(request)

    body = await request.body()
    try:
        payload = MetadataJobPayload(**json.loads(body))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payload: {exc}",
        )

    # Fetch the post
    result = await db.execute(select(Post).where(Post.id == payload.post_id))
    post = result.scalar_one_or_none()

    if post is None:
        # Post was deleted before we could process it
        return {"status": "skipped", "reason": "post_not_found"}

    if post.is_deleted:
        return {"status": "skipped", "reason": "post_deleted"}

    updates: dict = {}

    # Fetch URL metadata if post has a source_url
    if post.source_url and not post.source_platform:
        meta = await fetch_url_metadata(
            post.source_url,
            instagram_token=settings.INSTAGRAM_ACCESS_TOKEN,
        )
        if meta.title and not post.title:
            updates["title"] = meta.title
        if meta.description and not post.description:
            updates["description"] = meta.description
        if meta.thumbnail_url and not post.thumbnail_url:
            updates["thumbnail_url"] = meta.thumbnail_url
        if meta.embed_url and not post.embed_url:
            updates["embed_url"] = meta.embed_url
        if meta.source_platform:
            updates["source_platform"] = meta.source_platform
        if meta.media_type:
            updates["media_type"] = meta.media_type
        if meta.og_data:
            updates["og_data"] = meta.og_data

    # Generate blurhash from thumbnail
    thumbnail_url = updates.get("thumbnail_url") or post.thumbnail_url
    if thumbnail_url and not post.blurhash:
        blurhash_str, aspect_ratio = await generate_blurhash_from_url(thumbnail_url)
        if blurhash_str:
            updates["blurhash"] = blurhash_str
            updates["aspect_ratio"] = aspect_ratio

    # Apply updates
    if updates:
        for field, value in updates.items():
            setattr(post, field, value)
        await db.commit()

    return {"status": "ok", "post_id": str(payload.post_id), "updated_fields": list(updates.keys())}


@router.post("/workers/download-video")
async def download_video_worker(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    QStash background worker: download video via yt-dlp and upload to Supabase.
    Updates post.file_url and post.media_type once complete.
    """
    await _verify_qstash_request(request)

    body = await request.body()
    try:
        payload = DownloadVideoPayload(**json.loads(body))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid payload: {exc}")

    result = await db.execute(select(Post).where(Post.id == payload.post_id))
    post = result.scalar_one_or_none()

    if post is None or post.is_deleted:
        return {"status": "skipped"}

    # Skip if already downloaded
    if post.file_url and post.media_type in ("video_upload", "image_upload"):
        return {"status": "already_done"}

    from app.services.ytdlp import download_media
    from app.services.storage import upload_bytes

    result_data = await download_media(payload.source_url)
    if not result_data:
        return {"status": "failed", "reason": "yt-dlp returned nothing"}

    media_bytes, content_type, media_type = result_data
    ext = ".mp4" if media_type == "video_upload" else (
        ".jpg" if "jpeg" in content_type else f".{content_type.split('/')[-1]}"
    )
    file_key = f"uploads/{post.user_id}/{post.id}{ext}"
    file_url = await upload_bytes(media_bytes, file_key, content_type)

    post.file_url = file_url
    post.media_type = media_type
    await db.commit()

    return {"status": "ok", "post_id": str(payload.post_id), "file_url": file_url, "media_type": media_type}


@router.post("/workers/trending-recalc")
async def trending_recalc_worker(request: Request):
    """
    Vercel Cron job: recalculate trending posts and cache in Redis for 1 hour.
    Score = like_count + save_count*2 + view_count*0.1 in the last 48 hours.
    """
    # Verify it's from Vercel Cron (Authorization header)
    auth = request.headers.get("authorization", "")
    cron_secret = settings.QSTASH_TOKEN  # Reuse as cron secret or add separate env var

    # In production, verify the cron authorization
    if settings.ENVIRONMENT == "production":
        if not auth or not hmac.compare_digest(auth, f"Bearer {cron_secret}"):
            # Also accept QStash verification
            await _verify_qstash_request(request)

    pool = await get_pool()

    rows = await pool.fetch(
        """
        SELECT
            p.id,
            p.user_id,
            p.title,
            p.description,
            p.source_url,
            p.source_platform,
            p.media_type,
            p.thumbnail_url,
            p.file_url,
            p.embed_url,
            p.og_data,
            p.blurhash,
            p.aspect_ratio,
            p.tags,
            p.is_public,
            p.is_anonymous,
            p.is_deleted,
            p.view_count,
            p.save_count,
            p.like_count,
            p.created_at,
            p.updated_at,
            u.username,
            u.display_name,
            u.avatar_url,
            (p.like_count + p.save_count * 2 + p.view_count * 0.1) AS score
        FROM posts p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE
            p.is_deleted = FALSE
            AND p.is_public = TRUE
            AND p.created_at >= NOW() - INTERVAL '48 hours'
        ORDER BY score DESC
        LIMIT 100
        """
    )

    trending = []
    for row in rows:
        r = dict(row)
        # Make JSON-serializable
        r["id"] = str(r["id"])
        r["user_id"] = str(r["user_id"]) if r["user_id"] else None
        r["created_at"] = r["created_at"].isoformat() if r.get("created_at") else None
        r["updated_at"] = r["updated_at"].isoformat() if r.get("updated_at") else None
        r.pop("score", None)
        trending.append(r)

    # Cache with 1 hour TTL
    await redis.set("feed:trending", json.dumps(trending), ex=3600)

    return {"status": "ok", "count": len(trending)}
