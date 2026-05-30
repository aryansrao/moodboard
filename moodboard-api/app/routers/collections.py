from __future__ import annotations

import re
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, get_optional_user
from app.models.collection import Collection, CollectionFollow, CollectionPost
from app.models.post import Post
from app.models.user import User
from app.schemas.collection import (
    CollectionCreate,
    CollectionDetail,
    CollectionFollowResponse,
    CollectionResponse,
    CollectionUpdate,
)

router = APIRouter(tags=["collections"])


def _slugify(text: str) -> str:
    """Convert title to URL-safe slug."""
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    slug = slug.strip("-")
    return slug


def _make_slug(title: str) -> str:
    """Generate unique slug: slugified title + short UUID suffix."""
    base = _slugify(title)[:200]
    suffix = str(uuid.uuid4())[:8]
    return f"{base}-{suffix}"


async def _attach_preview_posts(collections: list[Collection], db: AsyncSession) -> None:
    """Load first 4 thumbnail posts for each collection in one query."""
    if not collections:
        return
    col_ids = [c.id for c in collections]
    from sqlalchemy import and_
    rows = await db.execute(
        select(CollectionPost.collection_id, Post)
        .join(Post, CollectionPost.post_id == Post.id)
        .where(and_(CollectionPost.collection_id.in_(col_ids), Post.is_deleted == False))
        .order_by(CollectionPost.collection_id, CollectionPost.position)
    )
    from collections import defaultdict
    buckets: dict = defaultdict(list)
    for col_id, post in rows.all():
        if len(buckets[col_id]) < 4:
            buckets[col_id].append(post)
    for c in collections:
        c._preview_posts = buckets.get(c.id, [])


@router.get("/collections", response_model=list[CollectionResponse])
async def list_my_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the authenticated user's collections."""
    result = await db.execute(
        select(Collection)
        .where(Collection.user_id == current_user.id)
        .order_by(Collection.created_at.desc())
    )
    collections = list(result.scalars().all())
    await _attach_preview_posts(collections, db)
    from app.schemas.post import PostResponse as PostResp
    out = []
    for c in collections:
        c.user = current_user
        resp = CollectionResponse.model_validate(c)
        resp.posts = [PostResp.model_validate(p) for p in getattr(c, '_preview_posts', [])]
        out.append(resp)
    return out


@router.get("/collections/discover", response_model=list[CollectionResponse])
async def discover_collections(
    limit: int = 40,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Public collections from all users, newest first. Used for feed discovery."""
    query = (
        select(Collection)
        .options(selectinload(Collection.user))
        .where(Collection.visibility == "public")
        .order_by(Collection.updated_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    collections = list(result.scalars().all())
    await _attach_preview_posts(collections, db)
    from app.schemas.post import PostResponse as PostResp
    out = []
    for c in collections:
        resp = CollectionResponse.model_validate(c)
        resp.posts = [PostResp.model_validate(p) for p in getattr(c, '_preview_posts', [])]
        out.append(resp)
    return out


@router.post("/collections", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_collection(
    req: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new collection."""
    slug = _make_slug(req.title)

    collection = Collection(
        id=uuid.uuid4(),
        user_id=current_user.id,
        title=req.title,
        description=req.description,
        slug=slug,
        visibility=req.visibility,
        is_collaborative=req.is_collaborative,
    )
    db.add(collection)
    await db.commit()
    await db.refresh(collection)
    collection.user = current_user
    return collection


@router.get("/c/{slug}", response_model=CollectionDetail)
async def get_collection(
    slug: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a collection by slug with its posts."""
    result = await db.execute(
        select(Collection)
        .options(selectinload(Collection.user))
        .where(Collection.slug == slug)
    )
    collection = result.scalar_one_or_none()

    if collection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")

    # Visibility checks
    if collection.visibility == "private":
        if current_user is None or current_user.id != collection.user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Collection is private")

    # Load posts in order
    posts_result = await db.execute(
        select(Post)
        .options(selectinload(Post.user))
        .join(CollectionPost, CollectionPost.post_id == Post.id)
        .where(
            CollectionPost.collection_id == collection.id,
            Post.is_deleted == False,
        )
        .order_by(CollectionPost.position.asc())
    )
    posts = list(posts_result.scalars().all())

    is_following = False
    if current_user:
        follow_result = await db.execute(
            select(CollectionFollow).where(
                CollectionFollow.user_id == current_user.id,
                CollectionFollow.collection_id == collection.id,
            )
        )
        is_following = follow_result.scalar_one_or_none() is not None

    from app.schemas.post import PostResponse

    detail = CollectionDetail.model_validate(collection)
    detail.posts = [PostResponse.model_validate(p) for p in posts]
    detail.is_following = is_following
    return detail


@router.patch("/c/{slug}", response_model=CollectionResponse)
async def update_collection(
    slug: str,
    req: CollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a collection (owner only)."""
    result = await db.execute(select(Collection).where(Collection.slug == slug))
    collection = result.scalar_one_or_none()

    if collection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")

    if collection.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the collection owner")

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(collection, field, value)

    await db.commit()
    await db.refresh(collection)
    collection.user = current_user
    return collection


@router.post("/c/{slug}/posts/{post_id}", status_code=status.HTTP_201_CREATED)
async def add_post_to_collection(
    slug: str,
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a post to a collection."""
    coll_result = await db.execute(select(Collection).where(Collection.slug == slug))
    collection = coll_result.scalar_one_or_none()

    if collection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")

    if collection.user_id != current_user.id and not collection.is_collaborative:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Check post exists
    post_result = await db.execute(
        select(Post).where(Post.id == post_id, Post.is_deleted == False)
    )
    if post_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    # Check not already in collection
    cp_result = await db.execute(
        select(CollectionPost).where(
            CollectionPost.collection_id == collection.id,
            CollectionPost.post_id == post_id,
        )
    )
    if cp_result.scalar_one_or_none() is not None:
        return {"message": "Post already in collection"}

    # Get next position
    max_pos_result = await db.execute(
        select(func.coalesce(func.max(CollectionPost.position), 0)).where(
            CollectionPost.collection_id == collection.id
        )
    )
    max_pos = max_pos_result.scalar() or 0

    cp = CollectionPost(
        collection_id=collection.id,
        post_id=post_id,
        position=max_pos + 1,
    )
    db.add(cp)
    collection.post_count = collection.post_count + 1

    await db.commit()
    return {"message": "Post added to collection", "position": max_pos + 1}


@router.delete("/c/{slug}/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_post_from_collection(
    slug: str,
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a post from a collection (owner only)."""
    coll_result = await db.execute(select(Collection).where(Collection.slug == slug))
    collection = coll_result.scalar_one_or_none()

    if collection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")

    if collection.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the collection owner")

    cp_result = await db.execute(
        select(CollectionPost).where(
            CollectionPost.collection_id == collection.id,
            CollectionPost.post_id == post_id,
        )
    )
    cp = cp_result.scalar_one_or_none()
    if cp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not in collection")

    await db.delete(cp)
    collection.post_count = max(0, collection.post_count - 1)
    await db.commit()


@router.post("/c/{slug}/follow", response_model=CollectionFollowResponse)
async def toggle_collection_follow(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Follow or unfollow a collection."""
    coll_result = await db.execute(
        select(Collection).where(Collection.slug == slug, Collection.visibility == "public")
    )
    collection = coll_result.scalar_one_or_none()

    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found or not public"
        )

    if collection.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow your own collection"
        )

    follow_result = await db.execute(
        select(CollectionFollow).where(
            CollectionFollow.user_id == current_user.id,
            CollectionFollow.collection_id == collection.id,
        )
    )
    existing = follow_result.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        collection.follower_count = max(0, collection.follower_count - 1)
        following = False
    else:
        follow = CollectionFollow(user_id=current_user.id, collection_id=collection.id)
        db.add(follow)
        collection.follower_count = collection.follower_count + 1
        following = True

        # Notify collection owner
        from app.models.notification import Notification
        notif = Notification(
            user_id=collection.user_id,
            type="collection_follow",
            actor_id=current_user.id,
            entity_type="collection",
            entity_id=collection.id,
        )
        db.add(notif)

    await db.commit()
    return CollectionFollowResponse(following=following, follower_count=collection.follower_count)
