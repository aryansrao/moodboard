from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlparse

import httpx


@dataclass
class FetchedMetadata:
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    embed_url: Optional[str] = None
    og_data: dict = field(default_factory=dict)
    source_platform: Optional[str] = None
    media_type: Optional[str] = None


def _detect_platform(url: str) -> str:
    """Detect the source platform from URL domain."""
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return "web"

    if "youtube.com" in host or "youtu.be" in host:
        return "youtube"
    elif "tiktok.com" in host:
        return "tiktok"
    elif "instagram.com" in host:
        return "instagram"
    elif "pinterest.com" in host or "pin.it" in host:
        return "pinterest"
    elif "twitter.com" in host or "x.com" in host or "t.co" in host:
        return "twitter"
    elif "reddit.com" in host or "redd.it" in host:
        return "reddit"
    elif "vimeo.com" in host:
        return "vimeo"
    elif "spotify.com" in host:
        return "spotify"
    elif "soundcloud.com" in host:
        return "soundcloud"
    else:
        return "web"


def _parse_og_tags(html: str, base_url: str) -> dict:
    """Extract Open Graph and meta tags from raw HTML."""
    og: dict = {}

    og_pattern = re.compile(
        r'<meta[^>]+property=["\']og:(\w+)["\'][^>]+content=["\']([^"\']*)["\']',
        re.IGNORECASE,
    )
    for match in og_pattern.finditer(html):
        og[match.group(1)] = match.group(2)

    # Also try reversed attribute order
    og_pattern2 = re.compile(
        r'<meta[^>]+content=["\']([^"\']*)["\'][^>]+property=["\']og:(\w+)["\']',
        re.IGNORECASE,
    )
    for match in og_pattern2.finditer(html):
        if match.group(2) not in og:
            og[match.group(2)] = match.group(1)

    # Twitter meta tags as fallback
    tw_pattern = re.compile(
        r'<meta[^>]+name=["\']twitter:(\w+)["\'][^>]+content=["\']([^"\']*)["\']',
        re.IGNORECASE,
    )
    for match in tw_pattern.finditer(html):
        if match.group(1) not in og:
            og[f"twitter_{match.group(1)}"] = match.group(2)

    # Page title fallback
    title_match = re.search(r"<title[^>]*>([^<]+)</title>", html, re.IGNORECASE)
    if title_match and "title" not in og:
        og["page_title"] = title_match.group(1).strip()

    return og


async def _fetch_oembed(client: httpx.AsyncClient, oembed_url: str) -> Optional[dict]:
    """Fetch oEmbed data from a given endpoint."""
    try:
        resp = await client.get(oembed_url, follow_redirects=True, timeout=10.0)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return None


async def _fetch_youtube(client: httpx.AsyncClient, url: str) -> FetchedMetadata:
    oembed_url = f"https://www.youtube.com/oembed?url={url}&format=json"
    data = await _fetch_oembed(client, oembed_url)
    if data:
        return FetchedMetadata(
            title=data.get("title"),
            description=None,
            thumbnail_url=data.get("thumbnail_url"),
            embed_url=data.get("html"),
            og_data=data,
            source_platform="youtube",
            media_type="video",
        )
    return FetchedMetadata(source_platform="youtube", media_type="video")


async def _fetch_tiktok(client: httpx.AsyncClient, url: str) -> FetchedMetadata:
    oembed_url = f"https://www.tiktok.com/oembed?url={url}"
    data = await _fetch_oembed(client, oembed_url)
    if data:
        return FetchedMetadata(
            title=data.get("title"),
            description=None,
            thumbnail_url=data.get("thumbnail_url"),
            embed_url=data.get("html"),
            og_data=data,
            source_platform="tiktok",
            media_type="video",
        )
    return FetchedMetadata(source_platform="tiktok", media_type="video")


async def _fetch_instagram(
    client: httpx.AsyncClient, url: str, access_token: str = ""
) -> FetchedMetadata:
    # Try Facebook Graph API oembed first if token present
    if access_token:
        graph_url = (
            f"https://graph.facebook.com/v19.0/instagram_oembed"
            f"?url={url}&access_token={access_token}"
        )
        data = await _fetch_oembed(client, graph_url)
        if data:
            return FetchedMetadata(
                title=data.get("title"),
                thumbnail_url=data.get("thumbnail_url"),
                embed_url=data.get("html"),
                og_data=data,
                source_platform="instagram",
                media_type="video",
            )
    # Use yt-dlp to extract thumbnail and title (no download)
    try:
        from app.services.ytdlp import extract_info
        info = await extract_info(url)
        if info:
            thumbnail = info.get("thumbnail") or (info.get("thumbnails") or [{}])[-1].get("url")
            media_type = "video" if info.get("duration") else "image"
            return FetchedMetadata(
                title=info.get("title"),
                description=info.get("description"),
                thumbnail_url=thumbnail,
                og_data={},
                source_platform="instagram",
                media_type=media_type,
            )
    except Exception:
        pass
    return await _fetch_generic(client, url, platform="instagram")


async def _fetch_pinterest(client: httpx.AsyncClient, url: str) -> FetchedMetadata:
    oembed_url = f"https://www.pinterest.com/oembed/?url={url}"
    data = await _fetch_oembed(client, oembed_url)
    if data:
        return FetchedMetadata(
            title=data.get("title"),
            thumbnail_url=data.get("thumbnail_url"),
            embed_url=data.get("html"),
            og_data=data,
            source_platform="pinterest",
            media_type="image",
        )
    # Try yt-dlp for Pinterest video pins
    try:
        from app.services.ytdlp import extract_info
        info = await extract_info(url)
        if info and info.get("duration"):
            thumbnail = info.get("thumbnail") or (info.get("thumbnails") or [{}])[-1].get("url")
            return FetchedMetadata(
                title=info.get("title"),
                thumbnail_url=thumbnail,
                og_data={},
                source_platform="pinterest",
                media_type="video",
            )
    except Exception:
        pass
    return await _fetch_generic(client, url, platform="pinterest")


async def _fetch_twitter(client: httpx.AsyncClient, url: str) -> FetchedMetadata:
    oembed_url = f"https://publish.twitter.com/oembed?url={url}"
    data = await _fetch_oembed(client, oembed_url)
    if data:
        return FetchedMetadata(
            title=data.get("author_name"),
            description=data.get("html"),
            thumbnail_url=None,
            embed_url=data.get("html"),
            og_data=data,
            source_platform="twitter",
            media_type="post",
        )
    return await _fetch_generic(client, url, platform="twitter")


async def _fetch_reddit(client: httpx.AsyncClient, url: str) -> FetchedMetadata:
    # Strip trailing slash, append .json
    clean = url.rstrip("/")
    json_url = f"{clean}.json"
    try:
        resp = await client.get(
            json_url,
            follow_redirects=True,
            timeout=10.0,
            headers={"User-Agent": "moodboard-bot/1.0"},
        )
        if resp.status_code == 200:
            data = resp.json()
            post = data[0]["data"]["children"][0]["data"]
            return FetchedMetadata(
                title=post.get("title"),
                description=post.get("selftext") or post.get("url_overridden_by_dest"),
                thumbnail_url=post.get("thumbnail") if post.get("thumbnail", "").startswith("http") else None,
                og_data={"reddit_post": post},
                source_platform="reddit",
                media_type="post",
            )
    except Exception:
        pass
    return await _fetch_generic(client, url, platform="reddit")


async def _fetch_vimeo(client: httpx.AsyncClient, url: str) -> FetchedMetadata:
    oembed_url = f"https://vimeo.com/api/oembed.json?url={url}"
    data = await _fetch_oembed(client, oembed_url)
    if data:
        return FetchedMetadata(
            title=data.get("title"),
            description=data.get("description"),
            thumbnail_url=data.get("thumbnail_url"),
            embed_url=data.get("html"),
            og_data=data,
            source_platform="vimeo",
            media_type="video",
        )
    return FetchedMetadata(source_platform="vimeo", media_type="video")


async def _fetch_spotify(client: httpx.AsyncClient, url: str) -> FetchedMetadata:
    oembed_url = f"https://open.spotify.com/oembed?url={url}"
    data = await _fetch_oembed(client, oembed_url)
    if data:
        return FetchedMetadata(
            title=data.get("title"),
            thumbnail_url=data.get("thumbnail_url"),
            embed_url=data.get("html"),
            og_data=data,
            source_platform="spotify",
            media_type="audio",
        )
    return FetchedMetadata(source_platform="spotify", media_type="audio")


async def _fetch_soundcloud(client: httpx.AsyncClient, url: str) -> FetchedMetadata:
    oembed_url = f"https://soundcloud.com/oembed?url={url}&format=json"
    data = await _fetch_oembed(client, oembed_url)
    if data:
        return FetchedMetadata(
            title=data.get("title"),
            thumbnail_url=data.get("thumbnail_url"),
            embed_url=data.get("html"),
            og_data=data,
            source_platform="soundcloud",
            media_type="audio",
        )
    return FetchedMetadata(source_platform="soundcloud", media_type="audio")


async def _fetch_generic(
    client: httpx.AsyncClient,
    url: str,
    platform: str = "web",
) -> FetchedMetadata:
    """Generic fallback: fetch URL and parse OG tags."""
    try:
        resp = await client.get(
            url,
            follow_redirects=True,
            timeout=15.0,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; moodboard-bot/1.0; "
                    "+https://getmoodboard.app/bot)"
                )
            },
        )
        if resp.status_code == 200:
            og = _parse_og_tags(resp.text, url)
            return FetchedMetadata(
                title=og.get("title") or og.get("page_title"),
                description=og.get("description"),
                thumbnail_url=og.get("image"),
                og_data=og,
                source_platform=platform,
                media_type=og.get("type", "website"),
            )
    except Exception:
        pass
    return FetchedMetadata(source_platform=platform)


async def fetch_url_metadata(url: str, instagram_token: str = "") -> FetchedMetadata:
    """Main entry point — detect platform and fetch metadata."""
    from app.services.ytdlp import DOWNLOAD_PLATFORMS, extract_info

    platform = _detect_platform(url)

    async with httpx.AsyncClient() as client:
        if platform == "youtube":
            result = await _fetch_youtube(client, url)
        elif platform == "tiktok":
            result = await _fetch_tiktok(client, url)
        elif platform == "instagram":
            result = await _fetch_instagram(client, url, access_token=instagram_token)
        elif platform == "pinterest":
            result = await _fetch_pinterest(client, url)
        elif platform == "twitter":
            result = await _fetch_twitter(client, url)
        elif platform == "reddit":
            result = await _fetch_reddit(client, url)
        elif platform == "vimeo":
            result = await _fetch_vimeo(client, url)
        elif platform == "spotify":
            result = await _fetch_spotify(client, url)
        elif platform == "soundcloud":
            result = await _fetch_soundcloud(client, url)
        else:
            result = await _fetch_generic(client, url)

    # For any social platform missing a thumbnail, fill in via yt-dlp info extraction
    if platform in DOWNLOAD_PLATFORMS and not result.thumbnail_url:
        try:
            info = await extract_info(url)
            if info:
                thumbs = info.get("thumbnails") or []
                thumb = (
                    info.get("thumbnail")
                    or next((t["url"] for t in reversed(thumbs) if t.get("url")), None)
                )
                if thumb:
                    result.thumbnail_url = thumb
                if not result.title and info.get("title"):
                    result.title = info["title"]
                if not result.description and info.get("description"):
                    result.description = info["description"]
                # Determine media_type from yt-dlp if still unknown
                if not result.media_type or result.media_type in ("website",):
                    result.media_type = "video" if info.get("duration") else "image"
        except Exception:
            pass

    return result
