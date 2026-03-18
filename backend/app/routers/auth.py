from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, create_access_token,
    make_token, hash_token
)
from app.core.config import settings
from app.models.user import User
from app.models.token import RefreshToken, PasswordResetToken
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse,
    UserResponse, ForgotPasswordRequest, ResetPasswordRequest,
    LogoutRequest, RefreshRequest
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(User).where(User.email == data.email))
    if existing:
        raise HTTPException(400, "Email already registered")
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        middle_name=data.middle_name,
        phone=data.phone,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    # Create email verification token
    from app.models.token import EmailVerificationToken
    raw = make_token()
    evt = EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(raw),
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(evt)
    await db.commit()
    return user

@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == data.email))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    access_token = create_access_token(str(user.id))
    raw_refresh = make_token()
    rt = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(raw_refresh),
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    await db.commit()
    return TokenResponse(access_token=access_token, refresh_token=raw_refresh)

@router.post("/logout")
async def logout(data: LogoutRequest, db: AsyncSession = Depends(get_db)):
    rt = await db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_token(data.refresh_token))
    )
    if rt:
        rt.revoked = True
        await db.commit()
    return {"message": "Logged out"}

@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    rt = await db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == hash_token(data.refresh_token),
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.utcnow(),
        )
    )
    if not rt:
        raise HTTPException(401, "Invalid or expired refresh token")
    access_token = create_access_token(str(rt.user_id))
    rt.revoked = True
    raw_new = make_token()
    new_rt = RefreshToken(
        user_id=rt.user_id,
        token_hash=hash_token(raw_new),
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_rt)
    await db.commit()
    return TokenResponse(access_token=access_token, refresh_token=raw_new)

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == data.email))
    if user:
        raw = make_token()
        prt = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw),
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        db.add(prt)
        await db.commit()
    return {"message": "If email exists, reset link was sent"}

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    prt = await db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == hash_token(data.token),
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > datetime.utcnow(),
        )
    )
    if not prt:
        raise HTTPException(400, "Invalid or expired token")
    user = await db.get(User, prt.user_id)
    user.password_hash = hash_password(data.new_password)
    prt.used = True
    await db.commit()
    return {"message": "Password reset successful"}

@router.get("/verify-email")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    from app.models.token import EmailVerificationToken
    evt = await db.scalar(
        select(EmailVerificationToken).where(
            EmailVerificationToken.token_hash == hash_token(token),
            EmailVerificationToken.used == False,
            EmailVerificationToken.expires_at > datetime.utcnow(),
        )
    )
    if not evt:
        raise HTTPException(400, "Invalid or expired verification link")
    user = await db.get(User, evt.user_id)
    user.is_verified = True
    evt.used = True
    await db.commit()
    return {"message": "Email verified successfully"}

@router.post("/resend-verification")
async def resend_verification(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    from app.models.token import EmailVerificationToken
    user = await db.scalar(select(User).where(User.email == data.email))
    if user and not user.is_verified:
        raw = make_token()
        evt = EmailVerificationToken(
            user_id=user.id,
            token_hash=hash_token(raw),
            expires_at=datetime.utcnow() + timedelta(hours=24),
        )
        db.add(evt)
        await db.commit()
    return {"message": "If email exists and is unverified, a new link was sent"}
