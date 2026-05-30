from __future__ import annotations

import io
from typing import Optional, Tuple

import httpx
from PIL import Image

try:
    import blurhash as _blurhash
except ImportError:
    _blurhash = None  # type: ignore


async def generate_blurhash_from_url(thumbnail_url: str) -> Tuple[Optional[str], float]:
    """
    Download an image from thumbnail_url, resize to 32x32, encode as blurhash.

    Returns:
        (blurhash_str, aspect_ratio) — aspect_ratio is width/height.
        On any failure returns (None, 1.0).
    """
    if _blurhash is None:
        return None, 1.0

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                thumbnail_url,
                follow_redirects=True,
                timeout=20.0,
                headers={"User-Agent": "moodboard-bot/1.0"},
            )
            resp.raise_for_status()
            image_bytes = resp.content

        with Image.open(io.BytesIO(image_bytes)) as img:
            original_width, original_height = img.size
            aspect_ratio = original_width / original_height if original_height > 0 else 1.0

            # Convert to RGB (handles RGBA, palette, etc.)
            img_rgb = img.convert("RGB")

            # Resize for fast blurhash encoding
            img_small = img_rgb.resize((32, 32), Image.LANCZOS)

            # Encode blurhash
            hash_str: str = _blurhash.encode(
                img_small,
                x_components=4,
                y_components=3,
            )

        return hash_str, aspect_ratio

    except Exception:
        return None, 1.0
