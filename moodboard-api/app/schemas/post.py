import uuid
from datetime import datetime
import json
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.user import UserMini


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)
    parent_id: Optional[uuid.UUID] = None


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    post_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    parent_id: Optional[uuid.UUID] = None
    body: str
    upvote_count: int
    created_at: datetime
    user: Optional[UserMini] = None


class PostCreate(BaseModel):
    source_url: str = Field(..., description="URL of the content to save")
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    is_public: bool = True
    is_anonymous: bool = False
    collection_id: Optional[uuid.UUID] = None
    # Upload-specific fields (ignored for URL saves; used when client uploads directly)
    thumbnail_url: Optional[str] = None
    file_url: Optional[str] = None
    media_type: Optional[str] = None
    source_platform: Optional[str] = None
    aspect_ratio: float = 1.0
    blurhash: Optional[str] = None
    # Multi-image carousel: [{file_url, thumbnail_url, aspect_ratio, media_type}]
    media_items: Optional[list[dict[str, Any]]] = None


class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    is_public: Optional[bool] = None
    is_anonymous: Optional[bool] = None


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    description: Optional[str] = None
    source_url: Optional[str] = None
    source_platform: Optional[str] = None
    media_type: Optional[str] = None
    thumbnail_url: Optional[str] = None
    file_url: Optional[str] = None
    embed_url: Optional[str] = None
    og_data: Optional[dict[str, Any]] = None
    blurhash: Optional[str] = None
    aspect_ratio: float = 1.0
    tags: Optional[list[str]] = None
    media_items: Optional[list[dict[str, Any]]] = None
    is_public: bool
    is_anonymous: bool
    is_deleted: bool

    @field_validator('media_items', 'og_data', mode='before')
    @classmethod
    def _parse_json_str(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return None
        return v
    view_count: int
    save_count: int
    like_count: int
    created_at: datetime
    updated_at: datetime
    user: Optional[UserMini] = None


class PostCollectionMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    slug: str
    title: str


class PostDetail(PostResponse):
    comments: list[CommentResponse] = Field(default_factory=list)
    related_posts: list[PostResponse] = Field(default_factory=list)
    is_liked: bool = False
    is_saved: bool = False
    saved_in_collections: list[PostCollectionMini] = Field(default_factory=list)


class LikeResponse(BaseModel):
    liked: bool
    like_count: int


class SaveResponse(BaseModel):
    saved: bool
    save_count: int
    collection_id: Optional[uuid.UUID] = None


class SaveRequest(BaseModel):
    collection_id: Optional[uuid.UUID] = None
