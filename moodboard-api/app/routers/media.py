from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.post import Post
from app.models.user import User
from app.schemas.media import (
    DownloadURLRequest,
    DownloadURLResponse,
    FetchURLRequest,
    FetchURLResponse,
    MetadataJobPayload,
    UploadConfirmRequest,
    UploadInitRequest,
    UploadInitResponse,
)
from app.services.fetcher import fetch_url_metadata
from app.services.storage import generate_presigned_put_url, generate_upload_key, get_public_url

router = APIRouter(tags=["media"])


@router.post("/media/fetch", response_model=FetchURLResponse)
async def fetch_url(
    req: FetchURLRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Fetch metadata for a URL immediately.
    Also enqueues a QStash job for background enrichment.
    """
    meta = await fetch_url_metadata(
        req.url,
        instagram_token=settings.INSTAGRAM_ACCESS_TOKEN,
    )

    return FetchURLResponse(
        title=meta.title,
        description=meta.description,
        thumbnail_url=meta.thumbnail_url,
        embed_url=meta.embed_url,
        source_platform=meta.source_platform,
        media_type=meta.media_type,
        og_data=meta.og_data,
    )


@router.post("/media/upload/init", response_model=UploadInitResponse)
async def upload_init(
    req: UploadInitRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate a presigned R2 PUT URL for direct client-side upload.
    Returns the upload URL and the file_key to confirm after upload.
    """
    file_key = generate_upload_key(req.filename, prefix=f"uploads/{current_user.id}")

    upload_url = await generate_presigned_put_url(
        file_key=file_key,
        content_type=req.content_type,
        expires_in=300,
    )

    return UploadInitResponse(
        upload_url=upload_url,
        file_key=file_key,
        expires_in=300,
    )


@router.post("/media/upload/confirm", status_code=status.HTTP_201_CREATED)
async def upload_confirm(
    req: UploadConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Confirm a completed R2 upload and create a Post record.
    Enqueues QStash job for blurhash generation and vision analysis.
    """
    # Build public URL from file key
    file_url = get_public_url(req.file_key)

    # Determine media type from file extension
    ext = req.file_key.rsplit(".", 1)[-1].lower() if "." in req.file_key else ""
    media_type_map = {
        "jpg": "image", "jpeg": "image", "png": "image", "gif": "image",
        "webp": "image", "heic": "image",
        "mp4": "video", "mov": "video", "avi": "video", "webm": "video",
        "mp3": "audio", "wav": "audio", "ogg": "audio",
        "pdf": "document",
    }
    media_type = media_type_map.get(ext, "image")

    post = Post(
        id=uuid.uuid4(),
        user_id=current_user.id,
        title=req.title,
        description=req.description,
        source_url=file_url,  # NOT NULL — use storage URL as canonical source
        file_url=file_url,
        media_type=media_type,
        tags=req.tags or [],
        is_public=req.is_public,
        source_platform="upload",
    )
    db.add(post)

    # Add to collection if specified
    if req.collection_id:
        from app.models.collection import Collection, CollectionPost
        from sqlalchemy import select, func

        coll_result = await db.execute(
            select(Collection).where(
                Collection.id == req.collection_id,
                Collection.user_id == current_user.id,
            )
        )
        collection = coll_result.scalar_one_or_none()
        if collection:
            max_pos_result = await db.execute(
                select(func.coalesce(func.max(CollectionPost.position), 0)).where(
                    CollectionPost.collection_id == collection.id
                )
            )
            max_pos = max_pos_result.scalar() or 0
            cp = CollectionPost(
                collection_id=collection.id,
                post_id=post.id,
                position=max_pos + 1,
            )
            db.add(cp)
            collection.post_count = collection.post_count + 1

    await db.flush()
    post_id = post.id
    await db.commit()

    # Enqueue blurhash + vision analysis job (fire-and-forget)
    await _enqueue_vision_job(post_id, file_url)

    return {
        "id": str(post_id),
        "file_url": file_url,
        "media_type": media_type,
        "message": "Upload confirmed, processing started",
    }


@router.post("/media/download-url", response_model=DownloadURLResponse)
async def get_download_url(
    req: DownloadURLRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Get a direct downloadable URL for a media source using yt-dlp.
    Works for Instagram, TikTok, YouTube, Twitter, Reddit, Vimeo, etc.
    """
    from app.services.ytdlp import extract_info

    info = await extract_info(req.source_url)
    if not info:
        raise HTTPException(status_code=422, detail="Could not extract media from this URL")

    title = info.get("title") or "download"
    safe_title = "".join(c for c in title if c.isalnum() or c in " -_").strip() or "download"
    safe_title = safe_title[:80]

    best_url, best_ext = _pick_best_format(info)

    if not best_url:
        raise HTTPException(status_code=422, detail="No downloadable URL found")

    return DownloadURLResponse(
        url=best_url,
        filename=f"{safe_title}.{best_ext}",
        ext=best_ext,
    )


@router.post("/media/download")
async def download_media_proxy(
    req: DownloadURLRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Download social media content via yt-dlp (with ffmpeg merge for proper audio+video),
    then stream the result to the client. Handles YouTube, Instagram, TikTok, etc.
    """
    import shutil
    import tempfile
    from fastapi.responses import StreamingResponse

    from app.services.ytdlp import download_file

    tmpdir = tempfile.mkdtemp()
    try:
        result = await download_file(req.source_url, tmpdir)
    except Exception:
        shutil.rmtree(tmpdir, ignore_errors=True)
        raise HTTPException(status_code=422, detail="Could not download media")

    if not result:
        shutil.rmtree(tmpdir, ignore_errors=True)
        raise HTTPException(status_code=422, detail="Could not download media from this URL")

    filepath, content_type = result
    filename = os.path.basename(filepath)

    def _stream_and_cleanup():
        try:
            with open(filepath, "rb") as f:
                while True:
                    chunk = f.read(65536)
                    if not chunk:
                        break
                    yield chunk
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    return StreamingResponse(
        _stream_and_cleanup(),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _pick_best_format(info: dict) -> tuple[str | None, str]:
    """
    Two-pass format selection:
    1. Best combined audio+video (any container)
    2. Fallback: best video-only
    Returns (url, ext).
    """
    formats = info.get("formats") or []

    # Pass 1: combined audio+video
    for fmt in reversed(formats):
        furl = fmt.get("url")
        if not furl:
            continue
        ext = (fmt.get("ext") or "mp4").lower()
        vcodec = fmt.get("vcodec") or ""
        acodec = fmt.get("acodec") or ""
        has_video = vcodec not in ("none", "")
        has_audio = acodec not in ("none", "")
        if has_video and has_audio and ext in ("mp4", "webm", "mov", "m4v"):
            return furl, ext
        if has_video and has_audio and ext in ("jpg", "jpeg", "png", "webp"):
            return furl, ext

    # Pass 2: any video (video-only fallback)
    for fmt in reversed(formats):
        furl = fmt.get("url")
        if not furl:
            continue
        ext = (fmt.get("ext") or "mp4").lower()
        vcodec = fmt.get("vcodec") or ""
        if vcodec not in ("none", "") and ext in ("mp4", "webm", "mov", "m4v"):
            return furl, ext

    # Top-level URL
    top_url = info.get("url")
    top_ext = (info.get("ext") or "mp4").lower()
    return top_url, top_ext


async def _enqueue_vision_job(post_id: uuid.UUID, image_url: str) -> None:
    """Enqueue QStash job for blurhash + vision analysis."""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://qstash.upstash.io/v2/publish/{settings.API_BASE_URL}/api/v1/workers/fetch-metadata",
                headers={
                    "Authorization": f"Bearer {settings.QSTASH_TOKEN}",
                    "Content-Type": "application/json",
                    "Upstash-Retries": "3",
                },
                json={"post_id": str(post_id)},
                timeout=5.0,
            )
    except Exception:
        pass
