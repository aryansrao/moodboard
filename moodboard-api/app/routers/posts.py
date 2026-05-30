from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import cast, select, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy import Text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import AsyncSessionLocal, get_db
from app.core.security import get_current_user, get_optional_user
from app.models.post import Comment, Like, Post, Save
from app.models.user import User
from app.schemas.post import (
    CommentCreate,
    CommentResponse,
    LikeResponse,
    PostCreate,
    PostDetail,
    PostResponse,
    PostUpdate,
    SaveRequest,
    SaveResponse,
)

router = APIRouter(tags=["posts"])


async def _download_and_store_media(post_id: uuid.UUID, source_url: str) -> None:
    """Background task: download media via yt-dlp and upload to Supabase storage."""
    from app.services.ytdlp import download_media
    from app.services.storage import upload_bytes

    try:
        result_data = await download_media(source_url)
        if not result_data:
            return

        media_bytes, content_type, media_type = result_data
        if "jpeg" in content_type or content_type == "image/jpg":
            ext = ".jpg"
        elif "/" in content_type:
            ext = "." + content_type.split("/")[-1]
        else:
            ext = ".mp4"

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Post).where(Post.id == post_id))
            post = result.scalar_one_or_none()
            if not post or post.is_deleted:
                return
            if post.file_url and post.media_type in ("video_upload", "image_upload"):
                return

            file_key = f"uploads/{post.user_id}/{post.id}{ext}"
            file_url = await upload_bytes(media_bytes, file_key, content_type)

            post.file_url = file_url
            post.media_type = media_type
            await db.commit()
    except Exception:
        pass


async def _enqueue_metadata_job(post_id: uuid.UUID) -> None:
    """Fire-and-forget: enqueue QStash job to fetch metadata for post."""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://qstash.upstash.io/v2/publish/{settings.API_BASE_URL}/api/v1/workers/fetch-metadata",
                headers={
                    "Authorization": f"Bearer {settings.QSTASH_TOKEN}",
                    "Content-Type": "application/json",
                    "Upstash-Retries": "3",
                },
                json={"post_id": str(post_id)},
                timeout=5.0,
            )
    except Exception:
        # Fire-and-forget: swallow errors so post creation still succeeds
        pass


@router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    req: PostCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a post from a URL. Saves basic fields immediately,
    then enqueues QStash job to fetch full metadata asynchronously.
    """
    post = Post(
        id=uuid.uuid4(),
        user_id=current_user.id,
        source_url=req.source_url,
        title=req.title,
        description=req.description,
        tags=req.tags or [],
        is_public=req.is_public,
        is_anonymous=req.is_anonymous,
        thumbnail_url=req.thumbnail_url,
        file_url=req.file_url,
        media_type=req.media_type,
        source_platform=req.source_platform,
        aspect_ratio=req.aspect_ratio,
        blurhash=req.blurhash or None,
        media_items=req.media_items or None,
    )
    db.add(post)
    await db.flush()  # Get post.id without committing

    # If collection_id provided, add to collection
    if req.collection_id:
        from app.models.collection import Collection, CollectionPost
        coll_result = await db.execute(
            select(Collection).where(
                Collection.id == req.collection_id,
                Collection.user_id == current_user.id,
            )
        )
        collection = coll_result.scalar_one_or_none()
        if collection:
            # Get current max position
            max_pos_result = await db.execute(
                select(func.coalesce(func.max(CollectionPost.position), 0)).where(
                    CollectionPost.collection_id == collection.id
                )
            )
            max_pos = max_pos_result.scalar() or 0
            cp = CollectionPost(
                collection_id=collection.id,
                post_id=post.id,
                position=max_pos + 1,
            )
            db.add(cp)
            collection.post_count = collection.post_count + 1

    await db.commit()
    await db.refresh(post)

    # Enqueue async metadata fetch (fire-and-forget)
    await _enqueue_metadata_job(post.id)

    # Kick off media download in background (works locally + prod, no QStash needed)
    from app.services.ytdlp import DOWNLOAD_PLATFORMS
    if req.source_platform in DOWNLOAD_PLATFORMS:
        background_tasks.add_task(_download_and_store_media, post.id, req.source_url)

    # Load user for response
    await db.refresh(current_user)
    post.user = current_user
    return post


@router.get("/posts/{post_id}", response_model=PostDetail)
async def get_post(
    post_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Get post details with comments and related posts."""
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.user), selectinload(Post.comments).selectinload(Comment.user))
        .where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()

    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    if post.is_deleted:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Post has been deleted")

    if not post.is_public and (current_user is None or current_user.id != post.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Post is private")

    # Determine is_liked and is_saved for current user
    is_liked = False
    is_saved = False
    saved_in_collections = []
    if current_user:
        like_result = await db.execute(
            select(Like).where(Like.user_id == current_user.id, Like.post_id == post_id)
        )
        is_liked = like_result.scalar_one_or_none() is not None

        save_result = await db.execute(
            select(Save).where(Save.user_id == current_user.id, Save.post_id == post_id)
        )
        is_saved = save_result.scalar_one_or_none() is not None

        # Load collections this post is saved in for current user
        from app.models.collection import Collection
        saves_result = await db.execute(
            select(Collection)
            .join(Save, Save.collection_id == Collection.id)
            .where(Save.user_id == current_user.id, Save.post_id == post_id, Save.collection_id.isnot(None))
        )
        saved_in_collections = list(saves_result.scalars().all())

    # Related posts: same tags, excluding this post
    related: list[Post] = []
    if post.tags:
        rel_result = await db.execute(
            select(Post)
            .options(selectinload(Post.user))
            .where(
                Post.id != post_id,
                Post.is_deleted == False,
                Post.is_public == True,
                Post.tags.overlap(cast(post.tags, ARRAY(Text))),
            )
            .order_by(Post.like_count.desc())
            .limit(6)
        )
        related = list(rel_result.scalars().all())

    from app.schemas.post import PostCollectionMini
    detail = PostDetail.model_validate(post)
    detail.comments = [CommentResponse.model_validate(c) for c in post.comments]
    detail.related_posts = [PostResponse.model_validate(r) for r in related]
    detail.is_liked = is_liked
    detail.is_saved = is_saved
    detail.saved_in_collections = [PostCollectionMini.model_validate(c) for c in saved_in_collections]
    return detail


@router.patch("/posts/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: uuid.UUID,
    req: PostUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update post (owner only)."""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()

    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    if post.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the post owner")

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(post, field, value)

    await db.commit()
    await db.refresh(post)
    post.user = current_user
    return post


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a post (owner only)."""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()

    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    if post.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the post owner")

    post.is_deleted = True
    await db.commit()


@router.post("/posts/{post_id}/like", response_model=LikeResponse)
async def toggle_like(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle like on a post."""
    post_result = await db.execute(
        select(Post).where(Post.id == post_id, Post.is_deleted == False)
    )
    post = post_result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    like_result = await db.execute(
        select(Like).where(Like.user_id == current_user.id, Like.post_id == post_id)
    )
    existing_like = like_result.scalar_one_or_none()

    if existing_like:
        await db.delete(existing_like)
        post.like_count = max(0, post.like_count - 1)
        liked = False
    else:
        like = Like(user_id=current_user.id, post_id=post_id)
        db.add(like)
        post.like_count = post.like_count + 1
        liked = True

        # Create notification for post owner
        if post.user_id and post.user_id != current_user.id:
            from app.models.notification import Notification
            notif = Notification(
                user_id=post.user_id,
                type="like",
                actor_id=current_user.id,
                entity_type="post",
                entity_id=post_id,
            )
            db.add(notif)

    await db.commit()
    return LikeResponse(liked=liked, like_count=post.like_count)


@router.post("/posts/{post_id}/save", response_model=SaveResponse)
async def toggle_save(
    post_id: uuid.UUID,
    req: SaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save/unsave a post, optionally to a collection."""
    post_result = await db.execute(
        select(Post).where(Post.id == post_id, Post.is_deleted == False)
    )
    post = post_result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    save_result = await db.execute(
        select(Save).where(Save.user_id == current_user.id, Save.post_id == post_id)
    )
    existing_save = save_result.scalar_one_or_none()

    if existing_save:
        await db.delete(existing_save)
        post.save_count = max(0, post.save_count - 1)
        saved = False
        collection_id = None
    else:
        save = Save(
            user_id=current_user.id,
            post_id=post_id,
            collection_id=req.collection_id,
        )
        db.add(save)
        post.save_count = post.save_count + 1
        saved = True
        collection_id = req.collection_id

        # Update collection post_count if applicable
        if req.collection_id:
            from app.models.collection import Collection, CollectionPost
            coll_result = await db.execute(
                select(Collection).where(
                    Collection.id == req.collection_id,
                    Collection.user_id == current_user.id,
                )
            )
            collection = coll_result.scalar_one_or_none()
            if collection:
                # Add to collection_posts if not already there
                cp_result = await db.execute(
                    select(CollectionPost).where(
                        CollectionPost.collection_id == collection.id,
                        CollectionPost.post_id == post_id,
                    )
                )
                if cp_result.scalar_one_or_none() is None:
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

        # Notification for post owner
        if post.user_id and post.user_id != current_user.id:
            from app.models.notification import Notification
            notif = Notification(
                user_id=post.user_id,
                type="save",
                actor_id=current_user.id,
                entity_type="post",
                entity_id=post_id,
            )
            db.add(notif)

    await db.commit()
    return SaveResponse(saved=saved, save_count=post.save_count, collection_id=collection_id)


@router.post("/posts/{post_id}/view", status_code=status.HTTP_204_NO_CONTENT)
async def increment_view(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Increment view count for a post."""
    result = await db.execute(
        select(Post).where(Post.id == post_id, Post.is_deleted == False, Post.is_public == True)
    )
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    post.view_count = post.view_count + 1
    await db.commit()


@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    post_id: uuid.UUID,
    req: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a comment to a post."""
    post_result = await db.execute(
        select(Post).where(Post.id == post_id, Post.is_deleted == False)
    )
    post = post_result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    # Validate parent_id if provided
    if req.parent_id:
        parent_result = await db.execute(
            select(Comment).where(Comment.id == req.parent_id, Comment.post_id == post_id)
        )
        if parent_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Parent comment not found"
            )

    comment = Comment(
        id=uuid.uuid4(),
        post_id=post_id,
        user_id=current_user.id,
        parent_id=req.parent_id,
        body=req.body,
    )
    db.add(comment)

    # Notification for post owner
    if post.user_id and post.user_id != current_user.id:
        from app.models.notification import Notification
        notif = Notification(
            user_id=post.user_id,
            type="comment",
            actor_id=current_user.id,
            entity_type="post",
            entity_id=post_id,
        )
        db.add(notif)

    await db.commit()
    await db.refresh(comment)
    comment.user = current_user
    return comment


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a comment (owner only)."""
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()

    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    if comment.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the comment owner")

    await db.delete(comment)
    await db.commit()
