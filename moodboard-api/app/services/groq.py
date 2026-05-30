from __future__ import annotations

from typing import Any, AsyncIterator

from groq import AsyncGroq

from app.core.config import settings

# Shared async Groq client
client = AsyncGroq(api_key=settings.GROQ_API_KEY)

# Model routing
_MODEL_MAP = {
    "caption": "llama-3.1-8b-instant",
    "tags": "llama-3.1-8b-instant",
    "description": "llama-3.3-70b-versatile",
    "collection_name": "llama-3.1-8b-instant",
    "collection_desc": "llama-3.3-70b-versatile",
}


def get_model(request_type: str) -> str:
    return _MODEL_MAP.get(request_type, "llama-3.1-8b-instant")


def build_prompt(request_type: str, context: dict[str, Any]) -> str:
    """Build the appropriate prompt for each AI generation type."""
    title = context.get("title", "")
    url = context.get("url", "")
    platform = context.get("platform", "")
    existing_content = context.get("existing_content", "")
    description = context.get("description", "")

    if request_type == "caption":
        return (
            f"Write a short, engaging caption (1-2 sentences, max 120 characters) "
            f"for the following content saved on Moodboard.\n\n"
            f"Title: {title}\n"
            f"Platform: {platform}\n"
            f"URL: {url}\n"
            f"{'Description: ' + description if description else ''}\n\n"
            f"Return ONLY the caption text, no quotes, no explanation."
        )

    elif request_type == "tags":
        return (
            f"Generate 5-8 relevant tags for this content. "
            f"Tags should be single words or short hyphenated phrases, lowercase.\n\n"
            f"Title: {title}\n"
            f"Platform: {platform}\n"
            f"URL: {url}\n"
            f"{'Description: ' + description if description else ''}\n"
            f"{'Existing tags: ' + existing_content if existing_content else ''}\n\n"
            f"Return ONLY a comma-separated list of tags, no #, no explanation."
        )

    elif request_type == "description":
        return (
            f"Write a compelling description (2-4 sentences) for this content "
            f"that would help someone understand why it's worth saving.\n\n"
            f"Title: {title}\n"
            f"Platform: {platform}\n"
            f"URL: {url}\n"
            f"{'Existing description: ' + existing_content if existing_content else ''}\n\n"
            f"Return ONLY the description text, no quotes, no explanation."
        )

    elif request_type == "collection_name":
        return (
            f"Suggest a creative, memorable name for a collection with this theme or content:\n\n"
            f"{'Theme/context: ' + existing_content if existing_content else ''}\n"
            f"{'Example title: ' + title if title else ''}\n\n"
            f"Return ONLY the collection name (2-5 words), no quotes, no explanation."
        )

    elif request_type == "collection_desc":
        return (
            f"Write a short description (1-2 sentences) for a collection named: {title}\n\n"
            f"{'Context: ' + existing_content if existing_content else ''}\n\n"
            f"Return ONLY the description text, no quotes, no explanation."
        )

    else:
        return f"Describe this content briefly: {title} ({url})"


async def stream_completion(
    request_type: str,
    context: dict[str, Any],
) -> AsyncIterator[str]:
    """Stream a Groq completion as text chunks."""
    model = get_model(request_type)
    prompt = build_prompt(request_type, context)

    stream = await client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant for Moodboard, a visual content curation app. "
                    "Be concise, creative, and relevant."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        stream=True,
        max_tokens=512,
        temperature=0.7,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content


async def complete(request_type: str, context: dict[str, Any]) -> str:
    """Non-streaming Groq completion."""
    model = get_model(request_type)
    prompt = build_prompt(request_type, context)

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant for Moodboard, a visual content curation app. "
                    "Be concise, creative, and relevant."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        stream=False,
        max_tokens=512,
        temperature=0.7,
    )

    return response.choices[0].message.content or ""


async def analyze_image_vision(image_url: str) -> dict[str, Any]:
    """
    Use Llama 4 Scout vision model to analyze an image.
    Returns parsed dict with title, tags, description.
    """
    response = await client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Analyze this image and respond in exactly this format:\n"
                            "TITLE: <a short descriptive title, max 80 chars>\n"
                            "TAGS: <comma-separated tags, 5-8 tags, lowercase>\n"
                            "DESC: <a 1-2 sentence description of what you see>\n\n"
                            "Respond with ONLY these three lines."
                        ),
                    },
                ],
            }
        ],
        max_tokens=300,
        temperature=0.3,
    )

    raw = response.choices[0].message.content or ""
    return _parse_vision_response(raw)


def _parse_vision_response(raw: str) -> dict[str, Any]:
    """Parse the TITLE: | TAGS: | DESC: format from vision model output."""
    result: dict[str, Any] = {"title": None, "tags": [], "description": None}

    for line in raw.strip().splitlines():
        line = line.strip()
        if line.startswith("TITLE:"):
            result["title"] = line[6:].strip()
        elif line.startswith("TAGS:"):
            tags_raw = line[5:].strip()
            result["tags"] = [t.strip().lower() for t in tags_raw.split(",") if t.strip()]
        elif line.startswith("DESC:"):
            result["description"] = line[5:].strip()

    return result
