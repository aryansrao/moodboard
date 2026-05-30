"""
Database initialization script.
Run directly: python -m app.core.init_db

Creates all extensions, tables, indexes, and triggers from scratch.
Idempotent — uses IF NOT EXISTS guards throughout.
"""
from __future__ import annotations

import asyncio

import asyncpg

from app.core.config import settings
from app.models import FollowRequest  # noqa: F401 — ensures table is registered with metadata


DDL = """
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
-- Uncomment once pgvector is available on your Neon plan:
-- CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50) UNIQUE NOT NULL,
    display_name    VARCHAR(100) NOT NULL DEFAULT '',
    email           VARCHAR(255) UNIQUE,
    avatar_url      TEXT,
    bio             VARCHAR(160),
    website         VARCHAR(255),
    is_anonymous    BOOLEAN NOT NULL DEFAULT FALSE,
    is_private      BOOLEAN NOT NULL DEFAULT FALSE,
    device_token    VARCHAR(255),
    interests       TEXT[],
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username        ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email           ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_device_token    ON users (device_token) WHERE device_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_username_trgm   ON users USING GIN (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_dispname_trgm   ON users USING GIN (display_name gin_trgm_ops);

-- ============================================================
-- POSTS
-- search_vector is a plain TSVECTOR column maintained by trigger
-- (PostgreSQL does not allow to_tsvector() in GENERATED columns
--  because it is STABLE, not IMMUTABLE)
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(500),
    description     TEXT,
    source_url      TEXT,
    source_platform VARCHAR(50),
    media_type      VARCHAR(50),
    thumbnail_url   TEXT,
    file_url        TEXT,
    embed_url       TEXT,
    og_data         JSONB,
    blurhash        VARCHAR(100),
    aspect_ratio    FLOAT NOT NULL DEFAULT 1.0,
    tags            TEXT[],
    is_public       BOOLEAN NOT NULL DEFAULT TRUE,
    is_anonymous    BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    view_count      INTEGER NOT NULL DEFAULT 0,
    save_count      INTEGER NOT NULL DEFAULT 0,
    like_count      INTEGER NOT NULL DEFAULT 0,
    embedding       TEXT,
    search_vector   TSVECTOR,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id         ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at      ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_public          ON posts (is_deleted, is_public);
CREATE INDEX IF NOT EXISTS idx_posts_search_gin      ON posts USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_posts_title_trgm      ON posts USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_tags            ON posts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_posts_trending        ON posts (like_count DESC, save_count DESC, view_count DESC)
    WHERE is_deleted = FALSE AND is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_platform        ON posts (source_platform) WHERE source_platform IS NOT NULL;

-- ============================================================
-- COLLECTIONS
-- search_vector maintained by trigger (same reason as posts)
-- ============================================================
CREATE TABLE IF NOT EXISTS collections (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    slug             VARCHAR(300) UNIQUE NOT NULL,
    cover_image_url  TEXT,
    visibility       VARCHAR(20) NOT NULL DEFAULT 'public'
                         CHECK (visibility IN ('public', 'private', 'link_only')),
    is_collaborative BOOLEAN NOT NULL DEFAULT FALSE,
    follower_count   INTEGER NOT NULL DEFAULT 0,
    post_count       INTEGER NOT NULL DEFAULT 0,
    search_vector    TSVECTOR,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collections_user_id   ON collections (user_id);
CREATE INDEX IF NOT EXISTS idx_collections_slug      ON collections (slug);
CREATE INDEX IF NOT EXISTS idx_collections_vis       ON collections (visibility);
CREATE INDEX IF NOT EXISTS idx_collections_search    ON collections USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_collections_trgm      ON collections USING GIN (title gin_trgm_ops);

-- ============================================================
-- COLLECTION POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS collection_posts (
    collection_id   UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    position        INTEGER NOT NULL DEFAULT 0,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (collection_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_cp_collection ON collection_posts (collection_id, position);
CREATE INDEX IF NOT EXISTS idx_cp_post       ON collection_posts (post_id);

-- ============================================================
-- LIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS likes (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON likes (post_id);

-- ============================================================
-- SAVES
-- ============================================================
CREATE TABLE IF NOT EXISTS saves (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    collection_id   UUID REFERENCES collections(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_saves_post       ON saves (post_id);
CREATE INDEX IF NOT EXISTS idx_saves_collection ON saves (collection_id) WHERE collection_id IS NOT NULL;

-- ============================================================
-- FOLLOWS
-- ============================================================
CREATE TABLE IF NOT EXISTS follows (
    follower_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_following ON follows (following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows (follower_id);

-- ============================================================
-- MIGRATIONS (idempotent)
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- ============================================================
-- FOLLOW REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS follow_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fr_requester ON follow_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_fr_target    ON follow_requests (target_id);

-- ============================================================
-- COLLECTION FOLLOWS
-- ============================================================
CREATE TABLE IF NOT EXISTS collection_follows (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collection_id   UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_cf_collection ON collection_follows (collection_id);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id      UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    parent_id    UUID REFERENCES comments(id) ON DELETE CASCADE,
    body         VARCHAR(2000) NOT NULL,
    upvote_count INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post   ON comments (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user   ON comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments (parent_id) WHERE parent_id IS NOT NULL;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type VARCHAR(50),
    entity_id   UUID,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifs_user   ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifs_unread ON notifications (user_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- TAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) UNIQUE NOT NULL,
    post_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tags_name       ON tags (name);
CREATE INDEX IF NOT EXISTS idx_tags_name_trgm  ON tags USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tags_post_count ON tags (post_count DESC);

-- ============================================================
-- POST TAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS post_tags (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id  UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags (tag_id);

-- ============================================================
-- TRIGGER FUNCTIONS
-- ============================================================

-- updated_at
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Posts search_vector (title A, description B, tags A)
CREATE OR REPLACE FUNCTION fn_posts_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'A');
    RETURN NEW;
END;
$$;

-- Collections search_vector (title A, description B)
CREATE OR REPLACE FUNCTION fn_collections_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$;

-- PG NOTIFY for realtime notifications (WebSocket)
CREATE OR REPLACE FUNCTION fn_notify_notification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    PERFORM pg_notify(
        'user_notifications',
        json_build_object(
            'id',          NEW.id,
            'user_id',     NEW.user_id,
            'type',        NEW.type,
            'actor_id',    NEW.actor_id,
            'entity_type', NEW.entity_type,
            'entity_id',   NEW.entity_id,
            'created_at',  NEW.created_at
        )::text
    );
    RETURN NEW;
END;
$$;

-- ============================================================
-- TRIGGERS (idempotent via DO block)
-- ============================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    -- updated_at triggers
    FOR r IN SELECT unnest(ARRAY['users','posts','collections']) AS tbl LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'trg_' || r.tbl || '_updated_at'
              AND tgrelid = r.tbl::regclass
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER trg_%I_updated_at
                 BEFORE UPDATE ON %I
                 FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
                r.tbl, r.tbl
            );
        END IF;
    END LOOP;

    -- posts search_vector
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_posts_search_vector'
          AND tgrelid = 'posts'::regclass
    ) THEN
        CREATE TRIGGER trg_posts_search_vector
        BEFORE INSERT OR UPDATE OF title, description, tags ON posts
        FOR EACH ROW EXECUTE FUNCTION fn_posts_search_vector();
    END IF;

    -- collections search_vector
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_collections_search_vector'
          AND tgrelid = 'collections'::regclass
    ) THEN
        CREATE TRIGGER trg_collections_search_vector
        BEFORE INSERT OR UPDATE OF title, description ON collections
        FOR EACH ROW EXECUTE FUNCTION fn_collections_search_vector();
    END IF;

    -- notifications pg_notify
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_notify_notification'
          AND tgrelid = 'notifications'::regclass
    ) THEN
        CREATE TRIGGER trg_notify_notification
        AFTER INSERT ON notifications
        FOR EACH ROW EXECUTE FUNCTION fn_notify_notification();
    END IF;
END $$;
"""


async def init_db() -> None:
    from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
    import ssl as _ssl

    raw = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    parsed = urlparse(raw)
    params = parse_qs(parsed.query, keep_blank_values=True)
    sslmode = (params.pop('sslmode', [None])[0] or '').lower()
    params.pop('channel_binding', None)
    clean_dsn = urlunparse(parsed._replace(query=urlencode({k: v[0] for k, v in params.items()})))

    connect_kwargs: dict = {}
    if sslmode in ('require', 'verify-ca', 'verify-full', 'allow', 'prefer'):
        ctx = _ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = _ssl.CERT_NONE
        connect_kwargs['ssl'] = ctx

    conn = await asyncpg.connect(clean_dsn, **connect_kwargs)
    try:
        await conn.execute(DDL)
        print("✓ Database initialized successfully.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(init_db())
