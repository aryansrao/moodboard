from typing import Optional
from pydantic import BaseModel, Field

from app.schemas.post import PostResponse


class FeedCursor(BaseModel):
    cursor: Optional[str] = None
    limit: int = Field(default=20, ge=1, le=100)


class FeedResponse(BaseModel):
    posts: list[PostResponse]
    next_cursor: Optional[str] = None
    has_more: bool = False
