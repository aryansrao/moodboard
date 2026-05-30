from __future__ import annotations

import uuid
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


class OTPSendRequest(BaseModel):
    email: str


class OTPVerifyRequest(BaseModel):
    email: str
    token: str
    type: str = "email"


class OAuthCallbackRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


class ClaimAnonymousRequest(BaseModel):
    device_token: str


def _supabase_headers() -> dict:
    return {
        "apikey": settings.SUPABASE_JWT_SECRET,
        "Content-Type": "application/json",
    }


@router.get("/lookup")
async def lookup_email_by_identifier(
    username: str,
    db: AsyncSession = Depends(get_db),
):
    """Return the email address for a given username (for OTP sign-in by username)."""
    result = await db.execute(
        select(User.email).where(User.username == username)
    )
    email = result.scalar_one_or_none()
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with that username",
        )
    return {"email": email}


@router.post("/otp/send", status_code=status.HTTP_200_OK)
async def send_otp(req: OTPSendRequest):
    """Send OTP email via Supabase Auth REST API."""
    url = f"{settings.SUPABASE_URL}/auth/v1/otp"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            json={"email": req.email},
            headers=_supabase_headers(),
            timeout=15.0,
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=resp.json().get("msg", "Failed to send OTP"),
        )
    return {"message": "OTP sent successfully"}


@router.post("/otp/verify")
async def verify_otp(req: OTPVerifyRequest):
    """Verify OTP token via Supabase Auth REST API."""
    url = f"{settings.SUPABASE_URL}/auth/v1/verify"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            json={"email": req.email, "token": req.token, "type": req.type},
            headers=_supabase_headers(),
            timeout=15.0,
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=resp.json().get("msg", "OTP verification failed"),
        )
    data = resp.json()
    return {
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
        "token_type": "bearer",
        "expires_in": data.get("expires_in"),
        "user": data.get("user"),
    }


@router.post("/oauth/callback")
async def oauth_callback(req: OAuthCallbackRequest):
    """Exchange OAuth authorization code for tokens via Supabase."""
    url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=authorization_code"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            json={"code": req.code, "redirect_uri": req.redirect_uri},
            headers=_supabase_headers(),
            timeout=15.0,
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=resp.json().get("msg", "OAuth callback failed"),
        )
    data = resp.json()
    return {
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
        "token_type": "bearer",
        "expires_in": data.get("expires_in"),
        "user": data.get("user"),
    }


@router.post("/refresh")
async def refresh_token(req: RefreshRequest):
    """Exchange refresh token for new access token via Supabase."""
    url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            json={"refresh_token": req.refresh_token},
            headers=_supabase_headers(),
            timeout=15.0,
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=resp.json().get("msg", "Token refresh failed"),
        )
    data = resp.json()
    return {
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
        "token_type": "bearer",
        "expires_in": data.get("expires_in"),
    }


@router.post("/claim-anonymous")
async def claim_anonymous(
    req: ClaimAnonymousRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Merge an anonymous device_token account into the authenticated account.
    Reassigns posts, collections, etc. from the anonymous user to current_user.
    """
    # Find anonymous user by device_token
    result = await db.execute(
        select(User).where(User.device_token == req.device_token, User.is_anonymous == True)
    )
    anon_user = result.scalar_one_or_none()

    if anon_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anonymous account not found for this device token",
        )

    if anon_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot claim your own account",
        )

    pool = await _get_raw_pool()
    async with pool.acquire() as conn:
        anon_id = str(anon_user.id)
        real_id = str(current_user.id)

        # Reassign posts
        await conn.execute(
            "UPDATE posts SET user_id = $1 WHERE user_id = $2",
            real_id,
            anon_id,
        )
        # Reassign collections
        await conn.execute(
            "UPDATE collections SET user_id = $1 WHERE user_id = $2",
            real_id,
            anon_id,
        )
        # Delete the anonymous user
        await conn.execute("DELETE FROM users WHERE id = $1", anon_id)

    return {"message": "Anonymous account merged successfully"}


async def _get_raw_pool():
    from app.core.database import get_pool
    return await get_pool()
