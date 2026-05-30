import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.post import PostResponse
from app.schemas.user import UserMini


class CollectionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    visibility: str = Field("public", pattern="^(public|private|link_only)$")
    is_collaborative: bool = False


class CollectionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    visibility: Optional[str] = Field(None, pattern="^(public|private|link_only)$")
    is_collaborative: Optional[bool] = None
    cover_image_url: Optional[str] = None


class CollectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str] = None
    slug: str
    cover_image_url: Optional[str] = None
    visibility: str
    is_collaborative: bool
    follower_count: int
    post_count: int
    created_at: datetime
    updated_at: datetime
    user: Optional[UserMini] = None
    posts: list[PostResponse] = Field(default_factory=list)


class CollectionDetail(CollectionResponse):
    pass
    is_following: bool = False


class CollectionFollowResponse(BaseModel):
    following: bool
    follower_count: int
