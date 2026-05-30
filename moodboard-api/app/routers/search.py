from __future__ import annotations

from fastapi import APIRouter, Query
from typing import Literal, Optional

from app.schemas.search import SearchResults
from app.services.search import search_collections, search_posts, search_tags, search_users

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResults)
async def search(
    q: str = Query(..., min_length=1, max_length=200),
    type: str = Query("all", description="posts | collections | users | tags | all"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    Hybrid FTS + trigram search.
    type can be: posts, collections, users, tags, or all.
    """
    results = SearchResults(query=q, type=type)

    valid_types = {"posts", "collections", "users", "tags", "all"}
    if type not in valid_types:
        type = "all"

    if type in ("posts", "all"):
        results.posts = await search_posts(q, limit=limit, offset=offset)

    if type in ("collections", "all"):
        results.collections = await search_collections(q, limit=limit, offset=offset)

    if type in ("users", "all"):
        results.users = await search_users(q, limit=limit, offset=offset)

    if type in ("tags", "all"):
        results.tags = await search_tags(q, limit=limit, offset=offset)

    return results
