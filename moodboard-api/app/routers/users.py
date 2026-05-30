from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, get_optional_user
from app.models.collection import Collection
from app.models.follow import Follow
from app.models.follow_request import FollowRequest, FollowRequestStatus
from app.models.notification import Notification
from app.models.post import Post
from app.models.user import User
from app.schemas.collection import CollectionResponse
from app.schemas.post import PostResponse
from app.schemas.user import UserMini, UserProfile, UserUpdate

router = APIRouter(tags=["users"])


@router.get("/u/{username}", response_model=UserProfile)
async def get_profile(
    username: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.username == username, User.is_anonymous == False)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Three independent counts in a single DB round-trip via scalar subqueries
    follower_sub = select(func.count()).where(Follow.following_id == user.id).scalar_subquery()
    following_sub = select(func.count()).where(Follow.follower_id == user.id).scalar_subquery()
    post_sub = select(func.count()).where(
        Post.user_id == user.id,
        Post.is_public == True,
        Post.is_deleted == False,
    ).scalar_subquery()
    counts_result = await db.execute(select(follower_sub, following_sub, post_sub))
    row = counts_result.one()
    follower_count = row[0] or 0
    following_count = row[1] or 0
    post_count = row[2] or 0

    is_following = False
    follow_request_pending = False

    if current_user is not None and current_user.id != user.id:
        try:
            follow_result = await db.execute(
                select(Follow).where(
                    Follow.follower_id == current_user.id,
                    Follow.following_id == user.id,
                )
            )
            is_following = follow_result.scalar_one_or_none() is not None

            if not is_following:
                req_result = await db.execute(
                    select(FollowRequest).where(
                        FollowRequest.requester_id == current_user.id,
                        FollowRequest.target_id == user.id,
                        FollowRequest.status == FollowRequestStatus.pending,
                    )
                )
                follow_request_pending = req_result.scalar_one_or_none() is not None
        except Exception:
            pass  # Degrade gracefully — profile loads without follow status

    profile = UserProfile.model_validate(user)
    profile.follower_count = follower_count
    profile.following_count = following_count
    profile.post_count = post_count
    profile.is_following = is_following
    profile.follow_request_pending = follow_request_pending
    return profile


@router.get("/u/{username}/posts", response_model=list[PostResponse])
async def get_user_posts(
    username: str,
    cursor: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.feed import _decode_cursor, _encode_cursor, _POST_SELECT
    from app.core.database import get_pool
    import base64, json
    from datetime import datetime

    user_result = await db.execute(
        select(User).where(User.username == username, User.is_anonymous == False)
    )
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_private:
        viewer_is_owner = current_user is not None and current_user.id == user.id
        if not viewer_is_owner:
            is_following = False
            if current_user is not None:
                follow_result = await db.execute(
                    select(Follow).where(
                        Follow.follower_id == current_user.id,
                        Follow.following_id == user.id,
                    )
                )
                is_following = follow_result.scalar_one_or_none() is not None
            if not is_following:
                return []

    pool = await get_pool()

    params: list = [str(user.id), limit + 1]
    cursor_clause = ""

    if cursor:
        try:
            payload = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
            cur_dt = datetime.fromisoformat(payload["created_at"])
            cur_id = uuid.UUID(payload["id"])
            cursor_clause = (
                "AND (p.created_at < $3::timestamptz OR "
                "(p.created_at = $3::timestamptz AND p.id < $4::uuid))"
            )
            params.append(cur_dt.isoformat())
            params.append(str(cur_id))
        except Exception:
            pass

    sql = f"""
        {_POST_SELECT}
        WHERE p.user_id = $1::uuid
          AND p.is_public = TRUE
          AND p.is_deleted = FALSE
          {cursor_clause}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT $2
    """
    rows = await pool.fetch(sql, *params)
    result_dicts = [dict(r) for r in rows]

    posts = []
    for r in result_dicts[:limit]:
        p_data = {k: v for k, v in r.items() if k not in ("username", "display_name", "avatar_url")}
        p_data["user"] = {
            "id": p_data.get("user_id"),
            "username": r.get("username"),
            "display_name": r.get("display_name"),
            "avatar_url": r.get("avatar_url"),
        }
        posts.append(PostResponse(**p_data))

    return posts


@router.get("/u/{username}/collections", response_model=list[CollectionResponse])
async def get_user_collections(
    username: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    user_result = await db.execute(
        select(User).where(User.username == username, User.is_anonymous == False)
    )
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    result = await db.execute(
        select(Collection)
        .where(
            Collection.user_id == user.id,
            Collection.visibility == "public",
        )
        .order_by(Collection.created_at.desc())
    )
    collections = list(result.scalars().all())
    from app.routers.collections import _attach_preview_posts
    await _attach_preview_posts(collections, db)
    from app.schemas.collection import CollectionResponse
    from app.schemas.post import PostResponse as PostResp
    out = []
    for c in collections:
        c.user = user
        resp = CollectionResponse.model_validate(c)
        resp.posts = [PostResp.model_validate(p) for p in getattr(c, '_preview_posts', [])]
        out.append(resp)
    return out


@router.post("/follows/{user_id}")
async def toggle_follow(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow yourself"
        )

    target_result = await db.execute(
        select(User).where(User.id == user_id, User.is_anonymous == False)
    )
    target = target_result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    follow_result = await db.execute(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id,
        )
    )
    existing_follow = follow_result.scalar_one_or_none()

    if existing_follow:
        await db.delete(existing_follow)
        await db.commit()
        return {"following": False, "requested": False, "user_id": str(user_id)}

    if target.is_private:
        req_result = await db.execute(
            select(FollowRequest).where(
                FollowRequest.requester_id == current_user.id,
                FollowRequest.target_id == user_id,
                FollowRequest.status == FollowRequestStatus.pending,
            )
        )
        existing_request = req_result.scalar_one_or_none()

        if existing_request:
            await db.delete(existing_request)
            await db.commit()
            return {"following": False, "requested": False, "user_id": str(user_id)}

        follow_req = FollowRequest(
            requester_id=current_user.id,
            target_id=user_id,
            status=FollowRequestStatus.pending,
        )
        db.add(follow_req)
        await db.commit()
        return {"following": False, "requested": True, "user_id": str(user_id)}

    follow = Follow(follower_id=current_user.id, following_id=user_id)
    db.add(follow)

    notif = Notification(
        user_id=user_id,
        type="follow",
        actor_id=current_user.id,
        entity_type="user",
        entity_id=current_user.id,
    )
    db.add(notif)

    await db.commit()
    return {"following": True, "requested": False, "user_id": str(user_id)}


@router.get("/follow-requests")
async def list_follow_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FollowRequest).where(
            FollowRequest.target_id == current_user.id,
            FollowRequest.status == FollowRequestStatus.pending,
        ).order_by(FollowRequest.created_at.desc())
    )
    requests = list(result.scalars().all())

    items = []
    for req in requests:
        requester_result = await db.execute(select(User).where(User.id == req.requester_id))
        requester = requester_result.scalar_one_or_none()
        if requester is None:
            continue
        requester_mini = UserMini.model_validate(requester)
        items.append({
            "id": str(req.id),
            "requester": requester_mini.model_dump(),
            "created_at": req.created_at.isoformat(),
        })
    return items


@router.post("/follow-requests/{request_id}/accept")
async def accept_follow_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_result = await db.execute(
        select(FollowRequest).where(FollowRequest.id == request_id)
    )
    req = req_result.scalar_one_or_none()
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow request not found")
    if req.target_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    follow = Follow(follower_id=req.requester_id, following_id=current_user.id)
    db.add(follow)

    notif = Notification(
        user_id=req.requester_id,
        type="follow",
        actor_id=current_user.id,
        entity_type="user",
        entity_id=current_user.id,
    )
    db.add(notif)

    await db.delete(req)
    await db.commit()
    return {"accepted": True, "request_id": str(request_id)}


@router.post("/follow-requests/{request_id}/reject")
async def reject_follow_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_result = await db.execute(
        select(FollowRequest).where(FollowRequest.id == request_id)
    )
    req = req_result.scalar_one_or_none()
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow request not found")
    if req.target_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    await db.delete(req)
    await db.commit()
    return {"rejected": True, "request_id": str(request_id)}


@router.get("/me", response_model=UserProfile)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    follower_sub = select(func.count()).where(Follow.following_id == current_user.id).scalar_subquery()
    following_sub = select(func.count()).where(Follow.follower_id == current_user.id).scalar_subquery()
    post_sub = select(func.count()).where(
        Post.user_id == current_user.id,
        Post.is_public == True,
        Post.is_deleted == False,
    ).scalar_subquery()
    counts = await db.execute(select(follower_sub, following_sub, post_sub))
    row = counts.one()
    profile = UserProfile.model_validate(current_user)
    profile.follower_count = row[0] or 0
    profile.following_count = row[1] or 0
    profile.post_count = row[2] or 0
    return profile


@router.patch("/me", response_model=UserProfile)
async def update_profile(
    req: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.username and req.username != current_user.username:
        existing = await db.execute(
            select(User).where(User.username == req.username)
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Username already taken"
            )

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)

    follower_sub = select(func.count()).where(Follow.following_id == current_user.id).scalar_subquery()
    following_sub = select(func.count()).where(Follow.follower_id == current_user.id).scalar_subquery()
    post_sub = select(func.count()).where(
        Post.user_id == current_user.id,
        Post.is_public == True,
        Post.is_deleted == False,
    ).scalar_subquery()
    counts = await db.execute(select(follower_sub, following_sub, post_sub))
    row = counts.one()
    profile = UserProfile.model_validate(current_user)
    profile.follower_count = row[0] or 0
    profile.following_count = row[1] or 0
    profile.post_count = row[2] or 0
    return profile
