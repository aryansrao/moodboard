from __future__ import annotations

import uuid
from functools import lru_cache

import anyio
from supabase import Client, create_client

from app.core.config import settings

BUCKET = "moodboard-uploads"


@lru_cache()
def _client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def generate_upload_key(filename: str, prefix: str = "uploads") -> str:
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    return f"{prefix}/{uuid.uuid4().hex}{ext}"


async def generate_presigned_put_url(
    file_key: str,
    content_type: str,
    expires_in: int = 300,
) -> str:
    """Return a Supabase Storage signed upload URL for direct browser PUT."""
    def _create() -> str:
        result = _client().storage.from_(BUCKET).create_signed_upload_url(file_key)
        return result.signed_url

    return await anyio.to_thread.run_sync(_create)


def get_public_url(file_key: str) -> str:
    base = settings.SUPABASE_URL.rstrip("/")
    return f"{base}/storage/v1/object/public/{BUCKET}/{file_key}"


async def upload_bytes(data: bytes, file_key: str, content_type: str) -> str:
    """Upload raw bytes server-side and return the public URL."""
    def _upload() -> None:
        _client().storage.from_(BUCKET).upload(
            file_key,
            data,
            file_options={"content-type": content_type, "upsert": "true"},
        )

    await anyio.to_thread.run_sync(_upload)
    return get_public_url(file_key)


async def delete_object(file_key: str) -> None:
    def _delete() -> None:
        _client().storage.from_(BUCKET).remove([file_key])

    await anyio.to_thread.run_sync(_delete)
