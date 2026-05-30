from __future__ import annotations

import mimetypes
import os
import tempfile
from typing import Optional

import anyio

# All platforms we attempt to extract + download media from
DOWNLOAD_PLATFORMS = frozenset({
    "youtube", "instagram", "tiktok", "pinterest",
    "twitter", "reddit", "vimeo", "facebook",
})

_VIDEO_EXTS = {".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"}
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".avif"}


def _run_extract_info(url: str) -> dict:
    import yt_dlp

    with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "skip_download": True}) as ydl:
        info = ydl.extract_info(url, download=False)
        return ydl.sanitize_info(info) if info else {}


def _run_download(url: str, out_dir: str) -> Optional[tuple[bytes, str, str]]:
    """Download best media. Returns (bytes, content_type, media_type_str) or None."""
    import yt_dlp

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        # 720p cap for videos; yt-dlp falls through to best available if 720p not found
        "format": (
            "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]"
            "/bestvideo[height<=720]+bestaudio"
            "/best[height<=720]"
            "/best"
        ),
        "outtmpl": os.path.join(out_dir, "media.%(ext)s"),
        "merge_output_format": "mp4",
        "socket_timeout": 60,
        "retries": 3,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            ydl.extract_info(url, download=True)
        except Exception:
            return None

    # Find whatever file was written
    for filename in os.listdir(out_dir):
        path = os.path.join(out_dir, filename)
        if not os.path.isfile(path):
            continue
        ext = os.path.splitext(filename)[1].lower()
        with open(path, "rb") as f:
            data = f.read()
        if ext in _VIDEO_EXTS:
            ct = "video/mp4" if ext == ".mp4" else f"video/{ext.lstrip('.')}"
            return data, ct, "video_upload"
        if ext in _IMAGE_EXTS:
            ct = f"image/{'jpeg' if ext in ('.jpg', '.jpeg') else ext.lstrip('.')}"
            return data, ct, "image_upload"
        # Unknown extension — guess
        ct = mimetypes.guess_type(path)[0] or "application/octet-stream"
        mt = "video_upload" if ct.startswith("video") else "image_upload"
        return data, ct, mt

    return None


async def extract_info(url: str) -> dict:
    """Fast metadata extraction, no download (~2-5 s)."""
    try:
        return await anyio.to_thread.run_sync(lambda: _run_extract_info(url))
    except Exception:
        return {}


async def download_media(url: str) -> Optional[tuple[bytes, str, str]]:
    """Download best media. Returns (bytes, content_type, media_type) or None."""
    with tempfile.TemporaryDirectory() as tmp:
        return await anyio.to_thread.run_sync(lambda: _run_download(url, tmp))


def _run_download_file(url: str, out_dir: str) -> Optional[tuple[str, str]]:
    """
    Download best merged audio+video to out_dir using yt-dlp + ffmpeg.
    Returns (absolute_filepath, content_type) or None.
    Uses %(title)s in the output template so yt-dlp names the file properly.
    """
    import yt_dlp

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        # Prefer up-to-1080p mp4+m4a merge; fall back to best available
        "format": (
            "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]"
            "/bestvideo[height<=1080]+bestaudio"
            "/best[height<=1080]"
            "/best"
        ),
        "outtmpl": os.path.join(out_dir, "%(title).80s.%(ext)s"),
        "merge_output_format": "mp4",
        "socket_timeout": 60,
        "retries": 3,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            ydl.extract_info(url, download=True)
        except Exception:
            return None

    for filename in os.listdir(out_dir):
        path = os.path.join(out_dir, filename)
        if not os.path.isfile(path):
            continue
        ext = os.path.splitext(filename)[1].lower()
        if ext in _VIDEO_EXTS:
            ct = "video/mp4" if ext == ".mp4" else f"video/{ext.lstrip('.')}"
        elif ext in _IMAGE_EXTS:
            ct = f"image/{'jpeg' if ext in ('.jpg', '.jpeg') else ext.lstrip('.')}"
        else:
            ct = "application/octet-stream"
        return path, ct

    return None


async def download_file(url: str, out_dir: str) -> Optional[tuple[str, str]]:
    """
    Download best merged audio+video to out_dir.
    Returns (absolute_filepath, content_type) or None.
    Caller is responsible for cleaning up out_dir.
    """
    try:
        return await anyio.to_thread.run_sync(lambda: _run_download_file(url, out_dir))
    except Exception:
        return None
