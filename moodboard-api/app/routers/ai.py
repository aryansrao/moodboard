from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.redis import redis
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.ai import AIGenerateRequest, ImageAnalyzeResponse, ImageAnalyzeRequest
from app.services.groq import analyze_image_vision, stream_completion

router = APIRouter(tags=["ai"])

# Rate limits per hour
_RATE_LIMITS = {
    "caption": 20,
    "tags": 30,
    "description": 20,
    "collection_name": 10,
    "collection_desc": 20,
    "vision": 5,
}


def _rate_limit_key(user_id: str, request_type: str) -> str:
    hour = datetime.now(timezone.utc).strftime("%Y%m%d%H")
    return f"ai:{user_id}:{request_type}:{hour}"


async def _check_rate_limit(user_id: str, request_type: str) -> None:
    """Check and increment rate limit counter. Raises 429 if exceeded."""
    limit = _RATE_LIMITS.get(request_type, 10)
    key = _rate_limit_key(user_id, request_type)

    # Get current count
    current = await redis.get(key)
    current_count = int(current) if current else 0

    if current_count >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: {limit} requests per hour for {request_type}",
            headers={"Retry-After": "3600"},
        )

    # Increment counter with 1-hour TTL
    await redis.incr(key)
    if current_count == 0:
        await redis.expire(key, 3600)


@router.post("/ai/generate")
async def generate_ai_content(
    req: AIGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Stream AI-generated content (caption, tags, description, collection_name, collection_desc).
    Returns Server-Sent Events stream.
    Rate limited per user per hour.
    """
    await _check_rate_limit(str(current_user.id), req.type)

    async def event_stream():
        try:
            async for chunk in stream_completion(req.type, req.context):
                # SSE format
                data = json.dumps({"chunk": chunk, "type": req.type})
                yield f"data: {data}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/ai/analyze-image", response_model=ImageAnalyzeResponse)
async def analyze_image(
    req: ImageAnalyzeRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Analyze an image using Llama 4 Scout vision model.
    Parses TITLE: | TAGS: | DESC: format from model output.
    Rate limited to 5 requests per hour per user.
    """
    await _check_rate_limit(str(current_user.id), "vision")

    result = await analyze_image_vision(req.image_url)

    return ImageAnalyzeResponse(
        title=result.get("title"),
        tags=result.get("tags", []),
        description=result.get("description"),
    )
