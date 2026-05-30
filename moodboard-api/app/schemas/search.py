from typing import Any, Optional
from pydantic import BaseModel, Field


class SearchResults(BaseModel):
    posts: list[dict[str, Any]] = Field(default_factory=list)
    collections: list[dict[str, Any]] = Field(default_factory=list)
    users: list[dict[str, Any]] = Field(default_factory=list)
    tags: list[dict[str, Any]] = Field(default_factory=list)
    query: str
    type: str


class TagResponse(BaseModel):
    id: str
    name: str
    post_count: int
