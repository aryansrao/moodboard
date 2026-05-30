from __future__ import annotations

import asyncio
import base64
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import and_, delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db, get_pool
from app.core.security import get_current_user
from app.models.follow import Follow
from app.models.message import Conversation, ConversationParticipant, Message
from app.models.user import User
from app.schemas.message import (
    ConversationMessages,
    ConversationResponse,
    MessageEdit,
    MessageResponse,
    MessageSend,
    StartConversation,
)
from app.schemas.user import UserMini

router = APIRouter(tags=["messages"])


def _encode_cursor(created_at: datetime, msg_id: uuid.UUID) -> str:
    payload = {"created_at": created_at.isoformat(), "id": str(msg_id)}
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def _decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    payload = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
    return datetime.fromisoformat(payload["created_at"]), uuid.UUID(payload["id"])


async def _has_connection(user_a: uuid.UUID, user_b: uuid.UUID, db: AsyncSession) -> bool:
    result = await db.execute(
        select(Follow)
        .where(
            or_(
                and_(Follow.follower_id == user_a, Follow.following_id == user_b),
                and_(Follow.follower_id == user_b, Follow.following_id == user_a),
            )
        )
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def _assert_participant(conv_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> ConversationParticipant:
    result = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conv_id,
            ConversationParticipant.user_id == user_id,
        )
    )
    p = result.scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return p


def _row_to_msg(r: dict) -> dict:
    msg: dict[str, Any] = {
        "id": r["id"],
        "conversation_id": r["conversation_id"],
        "sender_id": r["sender_id"],
        "body": None if r["is_deleted"] else r["body"],
        "is_deleted": r["is_deleted"],
        "edited_at": r.get("edited_at"),
        "created_at": r["created_at"],
        "sender": (
            {
                "id": r["sender_id"],
                "username": r["username"],
                "display_name": r["display_name"],
                "avatar_url": r["avatar_url"],
            }
            if r.get("sender_id") and r.get("username")
            else None
        ),
        "reply_to": None,
        "shared_post": None,
    }
    if r.get("reply_to_id"):
        msg["reply_to"] = {
            "id": r["reply_to_id"],
            "body": r.get("reply_body"),
            "sender": (
                {
                    "id": r["reply_sender_id"],
                    "username": r["reply_username"],
                    "display_name": r["reply_display_name"],
                    "avatar_url": r.get("reply_avatar_url"),
                }
                if r.get("reply_sender_id") and r.get("reply_username")
                else None
            ),
        }
    if r.get("shared_post_id"):
        msg["shared_post"] = {
            "id": r["shared_post_id"],
            "title": r.get("post_title"),
            "thumbnail_url": r.get("post_thumbnail"),
            "source_platform": r.get("post_platform"),
        }
    return msg


_MSG_SELECT = """
    SELECT
        m.id, m.conversation_id, m.sender_id, m.body,
        m.shared_post_id, m.reply_to_id, m.is_deleted, m.edited_at, m.created_at,
        u.username, u.display_name, u.avatar_url,
        rm.body AS reply_body, rm.sender_id AS reply_sender_id,
        ru.username AS reply_username, ru.display_name AS reply_display_name,
        ru.avatar_url AS reply_avatar_url,
        p.title AS post_title, p.thumbnail_url AS post_thumbnail,
        p.source_platform AS post_platform
    FROM messages m
    LEFT JOIN users u ON u.id = m.sender_id
    LEFT JOIN messages rm ON rm.id = m.reply_to_id
    LEFT JOIN users ru ON ru.id = rm.sender_id
    LEFT JOIN posts p ON p.id = m.shared_post_id
"""


async def _fetch_msg(msg_id: uuid.UUID) -> dict:
    pool = await get_pool()
    rows = await pool.fetch(f"{_MSG_SELECT} WHERE m.id = $1::uuid", str(msg_id))
    if not rows:
        raise HTTPException(status_code=404, detail="Message not found")
    return _row_to_msg(dict(rows[0]))


async def _fetch_conv(conv_id: uuid.UUID, user_id: uuid.UUID) -> dict:
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT
            c.id, c.created_at, c.updated_at,
            ou.id AS other_user_id, ou.username, ou.display_name, ou.avatar_url,
            my_p.request_status AS my_status,
            other_p.request_status AS other_status,
            lm.id AS lm_id, lm.body AS lm_body, lm.is_deleted AS lm_is_deleted,
            lm.created_at AS lm_created_at, lm.sender_id AS lm_sender_id,
            0::bigint AS unread_count
        FROM conversations c
        JOIN conversation_participants my_p
            ON my_p.conversation_id = c.id AND my_p.user_id = $1::uuid
        JOIN conversation_participants other_p
            ON other_p.conversation_id = c.id AND other_p.user_id != $1::uuid
        JOIN users ou ON ou.id = other_p.user_id
        LEFT JOIN LATERAL (
            SELECT id, body, is_deleted, created_at, sender_id
            FROM messages
            WHERE conversation_id = c.id
            ORDER BY created_at DESC, id DESC
            LIMIT 1
        ) lm ON TRUE
        WHERE c.id = $2::uuid
        """,
        str(user_id),
        str(conv_id),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Conversation not found")
    r = dict(rows[0])
    return _build_conv(r)


def _build_conv(r: dict) -> dict:
    last_msg = None
    if r.get("lm_id"):
        last_msg = {
            "id": r["lm_id"],
            "conversation_id": r["id"],
            "sender_id": r["lm_sender_id"],
            "body": None if r["lm_is_deleted"] else r["lm_body"],
            "is_deleted": r["lm_is_deleted"],
            "created_at": r["lm_created_at"],
        }
    return {
        "id": r["id"],
        "other_user": {
            "id": r["other_user_id"],
            "username": r["username"],
            "display_name": r["display_name"],
            "avatar_url": r["avatar_url"],
        },
        "my_status": r["my_status"],
        "request_status": r["other_status"],
        "last_message": last_msg,
        "unread_count": r.get("unread_count", 0),
        "created_at": r["created_at"],
        "updated_at": r["updated_at"],
    }


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
):
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT
            c.id, c.created_at, c.updated_at,
            ou.id AS other_user_id, ou.username, ou.display_name, ou.avatar_url,
            my_p.request_status AS my_status,
            other_p.request_status AS other_status,
            lm.id AS lm_id, lm.body AS lm_body, lm.is_deleted AS lm_is_deleted,
            lm.created_at AS lm_created_at, lm.sender_id AS lm_sender_id,
            (
                SELECT COUNT(*) FROM messages m2
                WHERE m2.conversation_id = c.id
                  AND m2.sender_id != $1::uuid
                  AND m2.is_deleted = FALSE
                  AND (my_p.last_read_at IS NULL OR m2.created_at > my_p.last_read_at)
            ) AS unread_count
        FROM conversations c
        JOIN conversation_participants my_p
            ON my_p.conversation_id = c.id AND my_p.user_id = $1::uuid
        JOIN conversation_participants other_p
            ON other_p.conversation_id = c.id AND other_p.user_id != $1::uuid
        JOIN users ou ON ou.id = other_p.user_id
        LEFT JOIN LATERAL (
            SELECT id, body, is_deleted, created_at, sender_id
            FROM messages
            WHERE conversation_id = c.id
            ORDER BY created_at DESC, id DESC
            LIMIT 1
        ) lm ON TRUE
        WHERE my_p.request_status = 'accepted'
        ORDER BY COALESCE(lm.created_at, c.created_at) DESC
        """,
        str(current_user.id),
    )
    return [_build_conv(dict(r)) for r in rows]


@router.get("/conversations/requests", response_model=list[ConversationResponse])
async def list_dm_requests(
    current_user: User = Depends(get_current_user),
):
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT
            c.id, c.created_at, c.updated_at,
            ou.id AS other_user_id, ou.username, ou.display_name, ou.avatar_url,
            my_p.request_status AS my_status,
            other_p.request_status AS other_status,
            fm.id AS lm_id, fm.body AS lm_body, fm.is_deleted AS lm_is_deleted,
            fm.created_at AS lm_created_at, fm.sender_id AS lm_sender_id,
            0::bigint AS unread_count
        FROM conversations c
        JOIN conversation_participants my_p
            ON my_p.conversation_id = c.id AND my_p.user_id = $1::uuid
        JOIN conversation_participants other_p
            ON other_p.conversation_id = c.id AND other_p.user_id != $1::uuid
        JOIN users ou ON ou.id = other_p.user_id
        LEFT JOIN LATERAL (
            SELECT id, body, is_deleted, created_at, sender_id
            FROM messages
            WHERE conversation_id = c.id
            ORDER BY created_at ASC, id ASC
            LIMIT 1
        ) fm ON TRUE
        WHERE my_p.request_status = 'pending'
        ORDER BY c.created_at DESC
        """,
        str(current_user.id),
    )
    return [_build_conv(dict(r)) for r in rows]


@router.get("/conversations/contacts", response_model=list[UserMini])
async def recent_contacts(
    limit: int = Query(10, ge=1, le=30),
    current_user: User = Depends(get_current_user),
):
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT
            ou.id, ou.username, ou.display_name, ou.avatar_url,
            COALESCE(lm.created_at, c.created_at) AS last_activity
        FROM conversations c
        JOIN conversation_participants my_p
            ON my_p.conversation_id = c.id AND my_p.user_id = $1::uuid
        JOIN conversation_participants other_p
            ON other_p.conversation_id = c.id AND other_p.user_id != $1::uuid
        JOIN users ou ON ou.id = other_p.user_id
        LEFT JOIN LATERAL (
            SELECT created_at FROM messages
            WHERE conversation_id = c.id
            ORDER BY created_at DESC LIMIT 1
        ) lm ON TRUE
        WHERE my_p.request_status = 'accepted'
        ORDER BY last_activity DESC
        LIMIT $2
        """,
        str(current_user.id),
        limit,
    )
    return [
        {"id": r["id"], "username": r["username"], "display_name": r["display_name"], "avatar_url": r["avatar_url"]}
        for r in rows
    ]


@router.post("/conversations", response_model=ConversationResponse)
async def start_or_get_conversation(
    body: StartConversation,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")

    # Check for existing conversation between these two users
    pool = await get_pool()
    existing = await pool.fetchrow(
        """
        SELECT cp1.conversation_id
        FROM conversation_participants cp1
        JOIN conversation_participants cp2
            ON cp2.conversation_id = cp1.conversation_id AND cp2.user_id = $2::uuid
        WHERE cp1.user_id = $1::uuid
        LIMIT 1
        """,
        str(current_user.id),
        str(body.user_id),
    )
    if existing:
        return await _fetch_conv(existing["conversation_id"], current_user.id)

    # Check target user exists
    result = await db.execute(select(User).where(User.id == body.user_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")

    connected = await _has_connection(current_user.id, body.user_id, db)
    other_status = "accepted" if connected else "pending"

    conv = Conversation()
    db.add(conv)
    await db.flush()

    db.add_all([
        ConversationParticipant(conversation_id=conv.id, user_id=current_user.id, request_status="accepted"),
        ConversationParticipant(conversation_id=conv.id, user_id=body.user_id, request_status=other_status),
    ])
    await db.commit()

    return await _fetch_conv(conv.id, current_user.id)


@router.post("/conversations/{conv_id}/accept", status_code=200)
async def accept_dm_request(
    conv_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conv_id,
            ConversationParticipant.user_id == current_user.id,
            ConversationParticipant.request_status == "pending",
        )
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Request not found")
    p.request_status = "accepted"
    await db.commit()
    return {"accepted": True}


@router.delete("/conversations/{conv_id}", status_code=204)
async def reject_or_leave_conversation(
    conv_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_participant(conv_id, current_user.id, db)
    await db.execute(delete(Conversation).where(Conversation.id == conv_id))
    await db.commit()


@router.get("/conversations/{conv_id}/messages", response_model=ConversationMessages)
async def get_messages(
    conv_id: uuid.UUID,
    cursor: Optional[str] = Query(None),
    limit: int = Query(30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = await _assert_participant(conv_id, current_user.id, db)
    # Mark read
    p.last_read_at = datetime.now(timezone.utc)
    await db.commit()

    pool = await get_pool()
    params: list[Any] = [str(conv_id), limit + 1]
    cursor_clause = ""
    if cursor:
        try:
            cur_dt, cur_id = _decode_cursor(cursor)
            cursor_clause = (
                "AND (m.created_at < $3::timestamptz OR "
                "(m.created_at = $3::timestamptz AND m.id < $4::uuid))"
            )
            params += [cur_dt.isoformat(), str(cur_id)]
        except Exception:
            pass

    rows = await pool.fetch(
        f"{_MSG_SELECT} WHERE m.conversation_id = $1::uuid {cursor_clause}"
        " ORDER BY m.created_at DESC, m.id DESC LIMIT $2",
        *params,
    )
    msgs = [_row_to_msg(dict(r)) for r in rows]
    has_more = len(msgs) > limit
    msgs = msgs[:limit]
    next_cursor = None
    if has_more and msgs:
        last = msgs[-1]
        next_cursor = _encode_cursor(last["created_at"], last["id"])
    return {"messages": msgs, "next_cursor": next_cursor}


@router.post("/conversations/{conv_id}/messages", response_model=MessageResponse)
async def send_message(
    conv_id: uuid.UUID,
    body: MessageSend,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.body and not body.shared_post_id:
        raise HTTPException(status_code=400, detail="Message must have body or shared post")

    result = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conv_id,
            ConversationParticipant.user_id == current_user.id,
            ConversationParticipant.request_status == "accepted",
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Cannot send messages here")

    msg = Message(
        conversation_id=conv_id,
        sender_id=current_user.id,
        body=body.body,
        shared_post_id=body.shared_post_id,
        reply_to_id=body.reply_to_id,
    )
    db.add(msg)
    await db.execute(
        update(Conversation)
        .where(Conversation.id == conv_id)
        .values(updated_at=datetime.now(timezone.utc))
    )
    await db.commit()
    await db.refresh(msg)

    # PG NOTIFY other participants
    try:
        pool = await get_pool()
        other_rows = await pool.fetch(
            "SELECT user_id FROM conversation_participants WHERE conversation_id = $1::uuid AND user_id != $2::uuid",
            str(conv_id),
            str(current_user.id),
        )
        payload = json.dumps({
            "type": "new_message",
            "conversation_id": str(conv_id),
            "message_id": str(msg.id),
            "sender_id": str(current_user.id),
        })
        async with pool.acquire() as conn:
            for row in other_rows:
                channel = f"dm_user_{row['user_id']}"
                await conn.execute("SELECT pg_notify($1, $2)", channel, payload)
    except Exception:
        pass

    return await _fetch_msg(msg.id)


@router.patch("/conversations/{conv_id}/messages/{msg_id}", response_model=MessageResponse)
async def edit_message(
    conv_id: uuid.UUID,
    msg_id: uuid.UUID,
    body: MessageEdit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Message).where(
            Message.id == msg_id,
            Message.conversation_id == conv_id,
            Message.sender_id == current_user.id,
            Message.is_deleted == False,  # noqa: E712
        )
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.body = body.body
    msg.edited_at = datetime.now(timezone.utc)
    await db.commit()
    return await _fetch_msg(msg_id)


@router.delete("/conversations/{conv_id}/messages/{msg_id}", status_code=204)
async def delete_message(
    conv_id: uuid.UUID,
    msg_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Message).where(
            Message.id == msg_id,
            Message.conversation_id == conv_id,
            Message.sender_id == current_user.id,
            Message.is_deleted == False,  # noqa: E712
        )
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.is_deleted = True
    await db.commit()


@router.websocket("/ws/dm/{user_id}")
async def dm_websocket(websocket: WebSocket, user_id: uuid.UUID):
    """Real-time DM notifications via PG LISTEN on 'dm_user_{user_id}'."""
    await websocket.accept()

    dsn = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

    conn = None
    queue: asyncio.Queue = asyncio.Queue()
    channel = f"dm_user_{user_id}"

    def _handler(connection, pid, ch, payload):
        try:
            queue.put_nowait(json.loads(payload))
        except Exception:
            pass

    try:
        conn = await asyncpg.connect(dsn)
        await conn.add_listener(channel, _handler)

        async def _recv():
            while True:
                try:
                    msg = await websocket.receive_text()
                    if msg == "ping":
                        await websocket.send_text("pong")
                except (WebSocketDisconnect, Exception):
                    break

        async def _send():
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=30.0)
                    await websocket.send_json(data)
                except asyncio.TimeoutError:
                    try:
                        await websocket.send_json({"type": "ping"})
                    except Exception:
                        break
                except (WebSocketDisconnect, Exception):
                    break

        done, pending = await asyncio.wait(
            [asyncio.ensure_future(_recv()), asyncio.ensure_future(_send())],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for t in pending:
            t.cancel()

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if conn:
            try:
                await conn.remove_listener(channel, _handler)
                await conn.close()
            except Exception:
                pass
        try:
            await websocket.close()
        except Exception:
            pass
