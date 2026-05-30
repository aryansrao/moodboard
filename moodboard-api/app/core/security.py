import time
import uuid
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)

# JWKS cache — Supabase edge caches it for 10 min, we match that
_jwks_keys: list = []
_jwks_fetched_at: float = 0.0
_JWKS_TTL = 600  # seconds


async def _get_jwks_keys() -> list:
    global _jwks_keys, _jwks_fetched_at
    now = time.monotonic()
    if _jwks_keys and (now - _jwks_fetched_at) < _JWKS_TTL:
        return _jwks_keys
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        )
        resp.raise_for_status()
    _jwks_keys = resp.json().get("keys", [])
    _jwks_fetched_at = now
    return _jwks_keys


async def _decode_jwt(token: str) -> dict:
    """Verify a Supabase JWT — supports both new asymmetric keys and legacy HS256."""
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    alg = header.get("alg", "HS256")
    kid = header.get("kid")

    # ── Legacy HS256 path ──────────────────────────────────────────────────────
    if alg == "HS256":
        try:
            return jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        except JWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc

    # ── Asymmetric key path (RS256 / ES256) ───────────────────────────────────
    try:
        keys = await _get_jwks_keys()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not fetch JWT signing keys",
        )

    # Find the key matching the token's kid (or use first key if no kid)
    matched = None
    for key_data in keys:
        if kid is None or key_data.get("kid") == kid:
            try:
                matched = jwk.construct(key_data)
                break
            except Exception:
                continue

    if matched is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signing key not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return jwt.decode(
            token,
            matched,
            algorithms=[alg],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def _get_user_from_payload(payload: dict, db: AsyncSession) -> User:
    """Fetch (or auto-provision) user from DB using the JWT sub claim."""
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )

    try:
        user_id = uuid.UUID(sub)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid subject claim format",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        email = payload.get("email", "")
        user_meta = payload.get("user_metadata", {})
        user = User(
            id=user_id,
            email=email,
            username=user_meta.get("username") or f"user_{str(user_id)[:8]}",
            display_name=(
                user_meta.get("display_name")
                or user_meta.get("full_name")
                or user_meta.get("name")
                or ""
            ),
            avatar_url=user_meta.get("avatar_url"),
            is_anonymous=False,
        )
        db.add(user)
        try:
            await db.commit()
            await db.refresh(user)
        except IntegrityError:
            await db.rollback()
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one()

    return user


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency: require authenticated user."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = await _decode_jwt(credentials.credentials)
    return await _get_user_from_payload(payload, db)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """FastAPI dependency: return user if authenticated, None otherwise."""
    if credentials is None:
        return None
    try:
        payload = await _decode_jwt(credentials.credentials)
        return await _get_user_from_payload(payload, db)
    except Exception:
        return None
