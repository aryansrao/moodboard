import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserMini


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    actor_id: Optional[uuid.UUID] = None
    entity_type: Optional[str] = None
    entity_id: Optional[uuid.UUID] = None
    is_read: bool
    created_at: datetime
    actor: Optional[UserMini] = None


class NotificationFeed(BaseModel):
    notifications: list[NotificationResponse]
    next_cursor: Optional[str] = None
    unread_count: int = 0
