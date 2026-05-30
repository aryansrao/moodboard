import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class UserMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    display_name: str
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    display_name: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    is_anonymous: bool
    is_private: bool = False
    interests: Optional[list[str]] = None
    created_at: datetime
    updated_at: datetime


class UserProfile(UserResponse):
    follower_count: int = 0
    following_count: int = 0
    post_count: int = 0
    is_following: bool = False
    follow_request_pending: bool = False


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    display_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=160)
    website: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    interests: Optional[list[str]] = None
    is_private: Optional[bool] = None
