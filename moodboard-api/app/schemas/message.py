import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserMini


class MessageSend(BaseModel):
    body: Optional[str] = None
    shared_post_id: Optional[uuid.UUID] = None
    reply_to_id: Optional[uuid.UUID] = None


class MessageEdit(BaseModel):
    body: str


class SharedPostMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    source_platform: Optional[str] = None


class ReplyToMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    body: Optional[str] = None
    sender: Optional[UserMini] = None


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: Optional[uuid.UUID] = None
    body: Optional[str] = None
    shared_post: Optional[SharedPostMini] = None
    reply_to: Optional[ReplyToMini] = None
    is_deleted: bool
    edited_at: Optional[datetime] = None
    created_at: datetime
    sender: Optional[UserMini] = None


class StartConversation(BaseModel):
    user_id: uuid.UUID


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    other_user: UserMini
    my_status: str
    request_status: str
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime


class ConversationMessages(BaseModel):
    messages: list[MessageResponse]
    next_cursor: Optional[str] = None
