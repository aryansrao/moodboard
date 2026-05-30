from __future__ import annotations

import asyncio
import base64
import json
import uuid
from datetime import datetime
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationFeed, NotificationResponse

router = APIRouter(tags=["notifications"])


def _encode_notif_cursor(created_at: datetime, notif_id: uuid.UUID) -> str:
    payload = {"created_at": created_at.isoformat(), "id": str(notif_id)}
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def _decode_notif_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    payload = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
    return datetime.fromisoformat(payload["created_at"]), uuid.UUID(payload["id"])


@router.get("/notifications", response_model=NotificationFeed)
async def get_notifications(
    cursor: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get notification feed for the current user, cursor-paginated."""
    query = (
        select(Notification)
        .options(selectinload(Notification.actor))
        .where(Notification.user_id == current_user.id)
    )

    if cursor:
        try:
            cur_dt, cur_id = _decode_notif_cursor(cursor)
            query = query.where(
                (Notification.created_at < cur_dt)
                | ((Notification.created_at == cur_dt) & (Notification.id < cur_id))
            )
        except Exception:
            pass

    query = query.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(limit + 1)

    result = await db.execute(query)
    notifications = list(result.scalars().all())

    has_more = len(notifications) > limit
    notifications = notifications[:limit]

    next_cursor: Optional[str] = None
    if has_more and notifications:
        last = notifications[-1]
        next_cursor = _encode_notif_cursor(last.created_at, last.id)

    # Count unread
    unread_result = await db.execute(
        select(func.count()).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    )
    unread_count = unread_result.scalar() or 0

    return NotificationFeed(
        notifications=[NotificationResponse.model_validate(n) for n in notifications],
        next_cursor=next_cursor,
        unread_count=unread_count,
    )


@router.post("/notifications/read-all", status_code=200)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read for the current user."""
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "All notifications marked as read"}


@router.websocket("/ws/notifications/{user_id}")
async def notifications_ws(
    websocket: WebSocket,
    user_id: uuid.UUID,
):
    """
    WebSocket endpoint for real-time notifications.
    Uses PostgreSQL LISTEN/NOTIFY on 'user_notifications' channel.
    Sends a ping every 30s to keep connection alive.
    """
    await websocket.accept()

    dsn = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

    conn: Optional[asyncpg.Connection] = None
    notification_queue: asyncio.Queue = asyncio.Queue()

    def _pg_notify_handler(connection, pid, channel, payload):
        try:
            data = json.loads(payload)
            if str(data.get("user_id")) == str(user_id):
                notification_queue.put_nowait(data)
        except Exception:
            pass

    try:
        conn = await asyncpg.connect(dsn)
        await conn.add_listener("user_notifications", _pg_notify_handler)

        async def _receive_from_client():
            """Handle incoming WS messages (ping/pong, close)."""
            while True:
                try:
                    msg = await websocket.receive_text()
                    if msg == "ping":
                        await websocket.send_text("pong")
                except WebSocketDisconnect:
                    break
                except Exception:
                    break

        async def _send_notifications():
            """Forward PG notifications to the WebSocket client."""
            while True:
                try:
                    notification = await asyncio.wait_for(
                        notification_queue.get(), timeout=30.0
                    )
                    await websocket.send_json(notification)
                except asyncio.TimeoutError:
                    # Send keepalive ping
                    try:
                        await websocket.send_json({"type": "ping"})
                    except Exception:
                        break
                except WebSocketDisconnect:
                    break
                except Exception:
                    break

        # Run both coroutines concurrently
        done, pending = await asyncio.wait(
            [
                asyncio.ensure_future(_receive_from_client()),
                asyncio.ensure_future(_send_notifications()),
            ],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json({"error": str(exc)})
        except Exception:
            pass
    finally:
        if conn:
            try:
                await conn.remove_listener("user_notifications", _pg_notify_handler)
                await conn.close()
            except Exception:
                pass
        try:
            await websocket.close()
        except Exception:
            pass
