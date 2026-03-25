# Admissions Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a trilingual (ru/kz/en) applications portal for НАО Алтынсарина where individuals and companies submit applications (courses, jobs, research, internship) with document uploads, admin review, and email notifications.

**Architecture:** React (Vite) frontend + FastAPI backend + PostgreSQL database. Frontend on `apply.uba.edu.kz`, backend REST API with JWT auth. Files stored locally in `uploads/`.

**Tech Stack:** React 18, Vite, react-i18next, React Router v6, Axios | FastAPI, SQLAlchemy (async), Alembic, Pydantic v2, python-jose, fastapi-mail, python-multipart | PostgreSQL 15 | Docker Compose

**Spec:** `docs/superpowers/specs/2026-03-18-admissions-portal-design.md`

---

## Task 1: Project scaffold & Docker

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/core/config.py`
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
# docker-compose.yml
version: "3.9"
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: uba
      POSTGRES_PASSWORD: uba_pass
      POSTGRES_DB: uba_portal
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    env_file: ./backend/.env
    depends_on: [db]
    volumes:
      - ./backend:/app
      - ./backend/uploads:/app/uploads

  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    volumes: ["./frontend:/app"]
    environment:
      - VITE_API_URL=http://localhost:8000

volumes:
  pgdata:
```

- [ ] **Step 2: Create backend/requirements.txt**

```
fastapi==0.111.0
uvicorn[standard]==0.30.0
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
alembic==1.13.1
pydantic[email]==2.7.1
pydantic-settings==2.2.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
fastapi-mail==1.4.1
pytest==8.2.0
pytest-asyncio==0.23.6
httpx==0.27.0
```

- [ ] **Step 3: Create backend/.env.example**

```
DATABASE_URL=postgresql+asyncpg://uba:uba_pass@db:5432/uba_portal
SECRET_KEY=change-this-to-a-random-secret-key-32chars
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
MAIL_USERNAME=noreply@uba.edu.kz
MAIL_PASSWORD=smtp_password
MAIL_FROM=noreply@uba.edu.kz
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_STARTTLS=true
ALLOWED_ORIGINS=http://localhost:5173,https://apply.uba.edu.kz
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
ADMIN_EMAIL=admin@uba.edu.kz
```

- [ ] **Step 4: Create backend/app/core/config.py**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_PORT: int = 587
    MAIL_SERVER: str = ""
    MAIL_STARTTLS: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:5173"
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 10

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    model_config = {"env_file": ".env"}

settings = Settings()
```

- [ ] **Step 5: Create backend/app/main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(title="НАО Алтынсарина — Портал заявок")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Create backend/Dockerfile**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

- [ ] **Step 7: Scaffold React frontend**

```bash
cd /Users/talgatsayat/Desktop/наоалтынсарин
npm create vite@latest frontend -- --template react
cd frontend && npm install
npm install react-router-dom axios react-i18next i18next i18next-browser-languagedetector
```

- [ ] **Step 8: Verify backend starts**

```bash
cd backend && cp .env.example .env
docker-compose up db -d
pip install -r requirements.txt
uvicorn app.main:app --reload
# GET http://localhost:8000/health → {"status":"ok"}
```

- [ ] **Step 9: Commit**

```bash
git init
git add .
git commit -m "chore: project scaffold — FastAPI + React + Docker"
```

---

## Task 2: Database models & migrations

**Files:**
- Create: `backend/app/core/database.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/application.py`
- Create: `backend/app/models/document.py`
- Create: `backend/app/models/token.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`

- [ ] **Step 1: Create backend/app/core/database.py**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Step 2: Create backend/app/models/user.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
import enum

class UserRole(str, enum.Enum):
    applicant = "applicant"
    admin = "admin"

class ApplicantType(str, enum.Enum):
    individual = "individual"
    company = "company"

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    middle_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    iin: Mapped[str | None] = mapped_column(String(12), nullable=True)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.applicant)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    applicant_type: Mapped[ApplicantType] = mapped_column(
        SAEnum(ApplicantType), default=ApplicantType.individual
    )
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bin: Mapped[str | None] = mapped_column(String(12), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 3: Create backend/app/models/application.py**

```python
import uuid, enum
from datetime import datetime
from sqlalchemy import String, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class ApplicationType(str, enum.Enum):
    courses = "courses"
    jobs = "jobs"
    research = "research"
    internship = "internship"

class ApplicationStatus(str, enum.Enum):
    draft = "draft"
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class Application(Base):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    type: Mapped[ApplicationType] = mapped_column(SAEnum(ApplicationType), nullable=False)
    status: Mapped[ApplicationStatus] = mapped_column(
        SAEnum(ApplicationStatus), default=ApplicationStatus.draft
    )
    extra_data: Mapped[dict] = mapped_column(JSONB, default=dict)
    admin_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    documents: Mapped[list["Document"]] = relationship(back_populates="application")
    status_history: Mapped[list["StatusHistory"]] = relationship(back_populates="application")

class StatusHistory(Base):
    __tablename__ = "status_history"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("applications.id"))
    old_status: Mapped[ApplicationStatus | None] = mapped_column(SAEnum(ApplicationStatus), nullable=True)
    new_status: Mapped[ApplicationStatus] = mapped_column(SAEnum(ApplicationStatus))
    changed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    application: Mapped["Application"] = relationship(back_populates="status_history")
```

- [ ] **Step 4: Create backend/app/models/document.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("applications.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    document_type: Mapped[str] = mapped_column(String(100))
    original_filename: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(500))
    file_size: Mapped[int] = mapped_column(Integer)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    application: Mapped["Application"] = relationship(back_populates="documents")
```

- [ ] **Step 5: Create backend/app/models/token.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used: Mapped[bool] = mapped_column(Boolean, default=False)

class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
```

- [ ] **Step 6: Init Alembic and create first migration**

```bash
cd backend
alembic init alembic
```

Then replace the contents of `backend/alembic/env.py` with:

```python
import asyncio
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context
from app.core.config import settings
from app.core.database import Base
# import all models so Alembic can detect them
import app.models.user  # noqa
import app.models.application  # noqa
import app.models.document  # noqa
import app.models.token  # noqa

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations():
    connectable = create_async_engine(settings.DATABASE_URL)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def run_migrations_online():
    asyncio.run(run_async_migrations())

run_migrations_online()
```

```bash
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

- [ ] **Step 7: Write test — models can be imported**

```python
# backend/tests/test_models.py
def test_imports():
    from app.models.user import User, UserRole, ApplicantType
    from app.models.application import Application, ApplicationType, ApplicationStatus
    from app.models.document import Document
    from app.models.token import RefreshToken, PasswordResetToken
    assert UserRole.admin == "admin"
    assert ApplicationStatus.draft == "draft"
```

Run: `pytest tests/test_models.py -v` → PASS

- [ ] **Step 8: Commit**

```bash
git add backend/app/models backend/app/core/database.py backend/alembic
git commit -m "feat: database models and initial migration"
```

---

## Task 3: Auth backend

**Files:**
- Create: `backend/app/core/security.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/routers/auth.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Create backend/app/core/security.py**

```python
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
import hashlib, secrets

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.SECRET_KEY, algorithm="HS256")

def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload.get("sub")
    except JWTError:
        return None

def make_token() -> str:
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
```

- [ ] **Step 2: Create backend/app/schemas/auth.py**

```python
from pydantic import BaseModel, EmailStr
from uuid import UUID
from app.models.user import UserRole, ApplicantType

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    middle_name: str | None = None
    phone: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    role: UserRole
    is_verified: bool
    applicant_type: ApplicantType
    model_config = {"from_attributes": True}

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
```

- [ ] **Step 3: Create backend/app/routers/auth.py**

```python
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
    UserResponse, ForgotPasswordRequest, ResetPasswordRequest
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
    # Create email verification token (sent in Task 6 after email service is wired)
    from app.models.token import EmailVerificationToken
    raw = make_token()
    evt = EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(raw),
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(evt)
    await db.commit()
    # TODO: send email with link: GET /api/auth/verify-email?token={raw}  (wired in Task 6)
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
async def logout(refresh_token: str, db: AsyncSession = Depends(get_db)):
    rt = await db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_token(refresh_token))
    )
    if rt:
        rt.revoked = True
        await db.commit()
    return {"message": "Logged out"}

@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_token: str, db: AsyncSession = Depends(get_db)):
    rt = await db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == hash_token(refresh_token),
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.utcnow(),
        )
    )
    if not rt:
        raise HTTPException(401, "Invalid or expired refresh token")
    access_token = create_access_token(str(rt.user_id))
    # rotate refresh token
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
        # TODO: send email (Task 6)
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
        # TODO: send verification email via email service (Task 6)
    return {"message": "If email exists and is unverified, a new link was sent"}
```

- [ ] **Step 4: Register router in main.py**

```python
# backend/app/main.py — add:
from app.routers.auth import router as auth_router
app.include_router(auth_router)
```

- [ ] **Step 5: Write tests**

```python
# backend/tests/test_auth.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_register_and_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/auth/register", json={
            "email": "test@example.com", "password": "pass123",
            "first_name": "Test", "last_name": "User"
        })
        assert r.status_code == 201
        assert r.json()["email"] == "test@example.com"

        r = await c.post("/api/auth/login", json={
            "email": "test@example.com", "password": "pass123"
        })
        assert r.status_code == 200
        assert "access_token" in r.json()

@pytest.mark.asyncio
async def test_login_wrong_password():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        await c.post("/api/auth/register", json={
            "email": "test2@example.com", "password": "correct",
            "first_name": "A", "last_name": "B"
        })
        r = await c.post("/api/auth/login", json={
            "email": "test2@example.com", "password": "wrong"
        })
        assert r.status_code == 401
```

- [ ] **Step 6: Run tests** `pytest tests/test_auth.py -v` → PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/core/security.py backend/app/schemas/auth.py backend/app/routers/auth.py backend/tests/test_auth.py
git commit -m "feat: auth endpoints — register, login, logout, refresh, password reset"
```

---

## Task 4: Current user dependency + Applications API

**Files:**
- Create: `backend/app/core/deps.py`
- Create: `backend/app/schemas/application.py`
- Create: `backend/app/routers/applications.py`
- Create: `backend/tests/test_applications.py`

- [ ] **Step 1: Create backend/app/core/deps.py**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole

bearer = HTTPBearer()

async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    user_id = decode_access_token(creds.credentials)
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user

async def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin only")
    return user
```

- [ ] **Step 2: Create backend/app/schemas/application.py**

```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.models.application import ApplicationType, ApplicationStatus

class ApplicationCreate(BaseModel):
    type: ApplicationType
    extra_data: dict = {}

class ApplicationUpdate(BaseModel):
    extra_data: dict | None = None

class StatusHistoryItem(BaseModel):
    new_status: ApplicationStatus
    comment: str | None
    changed_at: datetime
    model_config = {"from_attributes": True}

class ApplicationResponse(BaseModel):
    id: UUID
    type: ApplicationType
    status: ApplicationStatus
    extra_data: dict
    admin_comment: str | None
    submitted_at: datetime | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class PaginatedApplications(BaseModel):
    items: list[ApplicationResponse]
    total: int
    page: int
    page_size: int
```

- [ ] **Step 3: Create backend/app/routers/applications.py**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.application import Application, ApplicationStatus, StatusHistory
from app.schemas.application import (
    ApplicationCreate, ApplicationUpdate,
    ApplicationResponse, PaginatedApplications
)

router = APIRouter(prefix="/api/applications", tags=["applications"])

@router.get("", response_model=PaginatedApplications)
async def list_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(Application).where(Application.user_id == user.id)
    if type:
        q = q.where(Application.type == type)
    if status:
        q = q.where(Application.status == status)
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    items = (await db.scalars(q.offset((page - 1) * page_size).limit(page_size))).all()
    return PaginatedApplications(items=items, total=total, page=page, page_size=page_size)

@router.post("", response_model=ApplicationResponse, status_code=201)
async def create_application(
    data: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app_ = Application(user_id=user.id, type=data.type, extra_data=data.extra_data)
    db.add(app_)
    await db.commit()
    await db.refresh(app_)
    return app_

@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app_ = await db.get(Application, app_id)
    if not app_ or app_.user_id != user.id:
        raise HTTPException(404, "Not found")
    return app_

@router.patch("/{app_id}", response_model=ApplicationResponse)
async def update_application(
    app_id: str,
    data: ApplicationUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app_ = await db.get(Application, app_id)
    if not app_ or app_.user_id != user.id:
        raise HTTPException(404, "Not found")
    if app_.status != ApplicationStatus.draft:
        raise HTTPException(400, "Only drafts can be updated")
    if data.extra_data is not None:
        app_.extra_data = data.extra_data
    await db.commit()
    await db.refresh(app_)
    return app_

@router.post("/{app_id}/submit", response_model=ApplicationResponse)
async def submit_application(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app_ = await db.get(Application, app_id)
    if not app_ or app_.user_id != user.id:
        raise HTTPException(404, "Not found")
    if app_.status != ApplicationStatus.draft:
        raise HTTPException(400, "Already submitted")
    app_.status = ApplicationStatus.pending
    app_.submitted_at = datetime.utcnow()
    history = StatusHistory(
        application_id=app_.id,
        old_status=ApplicationStatus.draft,
        new_status=ApplicationStatus.pending,
        changed_by_user_id=user.id,
    )
    db.add(history)
    await db.commit()
    await db.refresh(app_)
    return app_

@router.delete("/{app_id}", status_code=204)
async def delete_application(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app_ = await db.get(Application, app_id)
    if not app_ or app_.user_id != user.id:
        raise HTTPException(404, "Not found")
    if app_.status != ApplicationStatus.draft:
        raise HTTPException(400, "Only drafts can be deleted")
    await db.delete(app_)
    await db.commit()
```

- [ ] **Step 4: Register router in main.py**

```python
from app.routers.applications import router as app_router
app.include_router(app_router)
```

- [ ] **Step 5: Write tests**

```python
# backend/tests/test_applications.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

async def get_token(client, email="app_test@example.com"):
    await client.post("/api/auth/register", json={
        "email": email, "password": "pass123",
        "first_name": "A", "last_name": "B"
    })
    r = await client.post("/api/auth/login", json={"email": email, "password": "pass123"})
    return r.json()["access_token"]

@pytest.mark.asyncio
async def test_create_and_submit():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        token = await get_token(c)
        headers = {"Authorization": f"Bearer {token}"}
        r = await c.post("/api/applications", json={"type": "courses", "extra_data": {}}, headers=headers)
        assert r.status_code == 201
        app_id = r.json()["id"]
        assert r.json()["status"] == "draft"
        r = await c.post(f"/api/applications/{app_id}/submit", headers=headers)
        assert r.json()["status"] == "pending"
```

- [ ] **Step 6: Run tests** `pytest tests/test_applications.py -v` → PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/core/deps.py backend/app/schemas/application.py backend/app/routers/applications.py backend/tests/test_applications.py
git commit -m "feat: applications CRUD, submit endpoint"
```

---

## Task 5: Documents API

**Files:**
- Create: `backend/app/services/file_storage.py`
- Create: `backend/app/schemas/document.py`
- Create: `backend/app/routers/documents.py`
- Create: `backend/tests/test_documents.py`

- [ ] **Step 1: Create backend/app/services/file_storage.py**

```python
import os, uuid, shutil
from fastapi import UploadFile, HTTPException
from app.core.config import settings

ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png"}
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}

def validate_file(file: UploadFile, size: int):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type not allowed. Use: {ALLOWED_EXTENSIONS}")
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if size > max_bytes:
        raise HTTPException(400, f"File too large. Max {settings.MAX_FILE_SIZE_MB}MB")

def save_file(file_bytes: bytes, original_filename: str, application_id: str) -> str:
    folder = os.path.join(settings.UPLOAD_DIR, application_id)
    os.makedirs(folder, exist_ok=True)
    ext = os.path.splitext(original_filename)[1].lower()
    unique_name = f"{uuid.uuid4()}{ext}"
    path = os.path.join(folder, unique_name)
    with open(path, "wb") as f:
        f.write(file_bytes)
    return path

def delete_file(file_path: str):
    if os.path.exists(file_path):
        os.remove(file_path)
```

- [ ] **Step 2: Create backend/app/schemas/document.py**

```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class DocumentResponse(BaseModel):
    id: UUID
    document_type: str
    original_filename: str
    file_size: int
    uploaded_at: datetime
    model_config = {"from_attributes": True}
```

- [ ] **Step 3: Create backend/app/routers/documents.py**

```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.models.application import Application, ApplicationStatus
from app.models.document import Document
from app.schemas.document import DocumentResponse
from app.services.file_storage import validate_file, save_file, delete_file

router = APIRouter(tags=["documents"])

@router.post("/api/applications/{app_id}/documents", response_model=DocumentResponse, status_code=201)
async def upload_document(
    app_id: str,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app_ = await db.get(Application, app_id)
    if not app_ or app_.user_id != user.id:
        raise HTTPException(404, "Application not found")
    file_bytes = await file.read()
    validate_file(file, len(file_bytes))
    path = save_file(file_bytes, file.filename, app_id)
    doc = Document(
        application_id=app_.id,
        user_id=user.id,
        document_type=document_type,
        original_filename=file.filename,
        file_path=path,
        file_size=len(file_bytes),
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc

@router.get("/api/applications/{app_id}/documents", response_model=list[DocumentResponse])
async def list_documents(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    app_ = await db.get(Application, app_id)
    if not app_:
        raise HTTPException(404, "Not found")
    if app_.user_id != user.id and user.role != UserRole.admin:
        raise HTTPException(403, "Forbidden")
    docs = (await db.scalars(select(Document).where(Document.application_id == app_.id))).all()
    return docs

@router.get("/api/documents/{doc_id}/download")
async def download_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Not found")
    # Access control: owner or admin only
    if doc.user_id != user.id and user.role != UserRole.admin:
        raise HTTPException(403, "Forbidden")
    if not __import__("os").path.exists(doc.file_path):
        raise HTTPException(404, "File not found on disk")
    return FileResponse(doc.file_path, filename=doc.original_filename)

@router.delete("/api/documents/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = await db.get(Document, doc_id)
    if not doc or doc.user_id != user.id:
        raise HTTPException(404, "Not found")
    app_ = await db.get(Application, doc.application_id)
    if app_.status != ApplicationStatus.draft:
        raise HTTPException(400, "Cannot delete documents from submitted applications")
    delete_file(doc.file_path)
    await db.delete(doc)
    await db.commit()
```

- [ ] **Step 4: Register router in main.py**

```python
from app.routers.documents import router as doc_router
app.include_router(doc_router)
```

- [ ] **Step 5: Write test**

```python
# backend/tests/test_documents.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
import io

@pytest.mark.asyncio
async def test_upload_too_large():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        # register + login
        await c.post("/api/auth/register", json={
            "email": "doc@example.com", "password": "pass123",
            "first_name": "D", "last_name": "E"
        })
        r = await c.post("/api/auth/login", json={"email": "doc@example.com", "password": "pass123"})
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        # create application
        r = await c.post("/api/applications", json={"type": "jobs"}, headers=headers)
        app_id = r.json()["id"]
        # upload file >10MB
        big_file = io.BytesIO(b"x" * (11 * 1024 * 1024))
        r = await c.post(
            f"/api/applications/{app_id}/documents",
            data={"document_type": "cv"},
            files={"file": ("big.pdf", big_file, "application/pdf")},
            headers=headers,
        )
        assert r.status_code == 400
```

- [ ] **Step 6: Run test** `pytest tests/test_documents.py -v` → PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/file_storage.py backend/app/schemas/document.py backend/app/routers/documents.py backend/tests/test_documents.py
git commit -m "feat: document upload, download (access-controlled), delete"
```

---

## Task 6: Admin API + Email service

**Files:**
- Create: `backend/app/services/email.py`
- Create: `backend/app/routers/admin.py`
- Create: `backend/app/cli.py`
- Create: `backend/tests/test_admin.py`

- [ ] **Step 1: Create backend/app/services/email.py**

```python
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)

async def send_email(to: str, subject: str, body: str):
    try:
        msg = MessageSchema(subject=subject, recipients=[to], body=body, subtype=MessageType.html)
        fm = FastMail(conf)
        await fm.send_message(msg)
    except Exception as e:
        print(f"Email failed to {to}: {e}")  # log, don't crash

async def send_status_change_email(to: str, app_type: str, new_status: str, comment: str | None):
    status_labels = {"approved": "Одобрена", "rejected": "Отклонена", "pending": "На рассмотрении"}
    label = status_labels.get(new_status, new_status)
    comment_block = f"<p><b>Комментарий:</b> {comment}</p>" if comment else ""
    body = f"""
    <p>Уважаемый заявитель,</p>
    <p>Статус вашей заявки (<b>{app_type}</b>) изменён на: <b>{label}</b></p>
    {comment_block}
    <p>С уважением, НАО «Алтынсарина»</p>
    """
    await send_email(to, f"Статус заявки: {label}", body)
```

- [ ] **Step 2: Create backend/app/routers/admin.py**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.deps import get_admin_user
from app.models.user import User
from app.models.application import Application, ApplicationStatus, StatusHistory
from app.schemas.application import ApplicationResponse, PaginatedApplications
from app.services.email import send_status_change_email
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["admin"])

class StatusUpdate(BaseModel):
    status: ApplicationStatus
    comment: str | None = None

@router.get("/applications", response_model=PaginatedApplications)
async def admin_list_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    q = select(Application)
    if type:
        q = q.where(Application.type == type)
    if status:
        q = q.where(Application.status == status)
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    items = (await db.scalars(q.offset((page - 1) * page_size).limit(page_size))).all()
    return PaginatedApplications(items=items, total=total, page=page, page_size=page_size)

@router.get("/applications/{app_id}", response_model=ApplicationResponse)
async def admin_get_application(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    app_ = await db.get(Application, app_id)
    if not app_:
        raise HTTPException(404, "Not found")
    return app_

@router.patch("/applications/{app_id}/status", response_model=ApplicationResponse)
async def admin_update_status(
    app_id: str,
    data: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    app_ = await db.get(Application, app_id)
    if not app_:
        raise HTTPException(404, "Not found")
    old_status = app_.status
    app_.status = data.status
    app_.admin_comment = data.comment
    history = StatusHistory(
        application_id=app_.id,
        old_status=old_status,
        new_status=data.status,
        changed_by_user_id=admin.id,
        comment=data.comment,
    )
    db.add(history)
    await db.commit()
    # Send email to applicant
    applicant = await db.get(User, app_.user_id)
    await send_status_change_email(
        applicant.email, app_.type.value, data.status.value, data.comment
    )
    await db.refresh(app_)
    return app_
```

- [ ] **Step 3: Create backend/app/cli.py**

```python
import asyncio, typer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole

cli = typer.Typer()

@cli.command()
def create_admin(
    email: str = typer.Option(..., prompt=True),
    password: str = typer.Option(..., prompt=True, hide_input=True),
    first_name: str = typer.Option("Admin", prompt=True),
    last_name: str = typer.Option("User", prompt=True),
):
    async def _create():
        async with AsyncSessionLocal() as db:
            user = User(
                email=email,
                password_hash=hash_password(password),
                first_name=first_name,
                last_name=last_name,
                role=UserRole.admin,
                is_verified=True,
            )
            db.add(user)
            await db.commit()
            print(f"Admin created: {email}")
    asyncio.run(_create())

if __name__ == "__main__":
    cli()
```

- [ ] **Step 4: Register admin router in main.py**

```python
from app.routers.admin import router as admin_router
app.include_router(admin_router)
```

- [ ] **Step 5: Write admin test**

```python
# backend/tests/test_admin.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole

async def create_admin_user():
    async with AsyncSessionLocal() as db:
        u = User(email="admin@test.com", password_hash=hash_password("admin123"),
                 first_name="Admin", last_name="Test", role=UserRole.admin, is_verified=True)
        db.add(u)
        await db.commit()

@pytest.mark.asyncio
async def test_admin_can_list_applications():
    await create_admin_user()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/auth/login", json={"email": "admin@test.com", "password": "admin123"})
        token = r.json()["access_token"]
        r = await c.get("/api/admin/applications", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert "items" in r.json()

@pytest.mark.asyncio
async def test_non_admin_blocked():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        await c.post("/api/auth/register", json={
            "email": "nonadmin@test.com", "password": "p", "first_name": "A", "last_name": "B"
        })
        r = await c.post("/api/auth/login", json={"email": "nonadmin@test.com", "password": "p"})
        token = r.json()["access_token"]
        r = await c.get("/api/admin/applications", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 403
```

- [ ] **Step 6: Run tests** `pytest tests/test_admin.py -v` → PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/email.py backend/app/routers/admin.py backend/app/cli.py backend/tests/test_admin.py
git commit -m "feat: admin API, email service, create-admin CLI"
```

---

## Task 7: Frontend — setup, styles, i18n, landing page

**Files:**
- Create: `frontend/src/styles/variables.css`
- Create: `frontend/src/locales/ru.json`
- Create: `frontend/src/locales/kz.json`
- Create: `frontend/src/locales/en.json`
- Create: `frontend/src/i18n.js`
- Create: `frontend/src/api/client.js`
- Create: `frontend/src/components/Navbar.jsx`
- Create: `frontend/src/pages/Landing.jsx`

- [ ] **Step 1: Create frontend/src/styles/variables.css**

```css
:root {
  --color-primary: #1a3a6b;
  --color-primary-dark: #102550;
  --color-accent: #f0c040;
  --color-text: #222;
  --color-text-muted: #666;
  --color-bg: #f2f4f8;
  --color-white: #ffffff;
  --color-border: #d0d8e8;
  --color-success: #2d8653;
  --color-danger: #c0392b;
  --color-warning: #856404;
  --radius: 6px;
  --shadow: 0 2px 8px rgba(0,0,0,0.08);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', Arial, sans-serif; background: var(--color-bg); color: var(--color-text); }
a { color: inherit; text-decoration: none; }
```

- [ ] **Step 2: Create translation files**

```json
// frontend/src/locales/ru.json
{
  "nav": { "home": "Главная", "about": "О портале", "contacts": "Контакты", "login": "Войти", "register": "Регистрация", "dashboard": "Мои заявки", "logout": "Выйти" },
  "landing": {
    "hero_title": "Портал подачи заявок НАО «Алтынсарина»",
    "hero_subtitle": "Подайте заявку на курсы, вакансии, научные проекты или стажировку",
    "apply_btn": "Подать заявку",
    "learn_more": "Узнать подробнее",
    "types_title": "Типы заявок"
  },
  "app_types": {
    "courses": "Курсы повышения квалификации",
    "jobs": "Трудоустройство / Вакансии",
    "research": "Научные проекты и гранты",
    "internship": "Стажировка"
  },
  "status": { "draft": "Черновик", "pending": "На рассмотрении", "approved": "Принято", "rejected": "Отклонено" },
  "form": {
    "first_name": "Имя", "last_name": "Фамилия", "middle_name": "Отчество",
    "email": "Email", "phone": "Телефон", "iin": "ИИН",
    "individual": "Физическое лицо", "company": "Юридическое лицо",
    "company_name": "Название организации", "bin": "БИН",
    "next": "Далее", "back": "Назад", "submit": "Подать заявку", "save": "Сохранить"
  },
  "errors": { "required": "Обязательное поле", "email_invalid": "Неверный email", "iin_length": "ИИН должен содержать 12 цифр" }
}
```

```json
// frontend/src/locales/kz.json — placeholder translations
{
  "nav": { "home": "Басты бет", "login": "Кіру", "register": "Тіркелу", "dashboard": "Менің өтінімдерім", "logout": "Шығу" },
  "landing": { "hero_title": "НАО «Алтынсарина» өтінім порталы", "hero_subtitle": "Курстарға, бос орындарға, ғылыми жобаларға немесе тағылымдамаға өтінім беріңіз", "apply_btn": "Өтінім беру", "types_title": "Өтінім түрлері" },
  "app_types": { "courses": "Біліктілікті арттыру курстары", "jobs": "Жұмысқа орналасу", "research": "Ғылыми жобалар", "internship": "Тағылымдама" },
  "status": { "draft": "Жоба", "pending": "Қарастырылуда", "approved": "Қабылданды", "rejected": "Қабылданбады" },
  "form": { "first_name": "Аты", "last_name": "Тегі", "email": "Email", "next": "Келесі", "back": "Артқа", "submit": "Өтінім беру" },
  "errors": { "required": "Міндетті өріс" }
}
```

```json
// frontend/src/locales/en.json
{
  "nav": { "home": "Home", "login": "Login", "register": "Register", "dashboard": "My Applications", "logout": "Logout" },
  "landing": { "hero_title": "НАО Altynsarin Application Portal", "hero_subtitle": "Submit your application for courses, vacancies, research projects or internships", "apply_btn": "Apply Now", "types_title": "Application Types" },
  "app_types": { "courses": "Professional Development Courses", "jobs": "Employment / Vacancies", "research": "Research Projects & Grants", "internship": "Internship" },
  "status": { "draft": "Draft", "pending": "Under Review", "approved": "Approved", "rejected": "Rejected" },
  "form": { "first_name": "First Name", "last_name": "Last Name", "email": "Email", "next": "Next", "back": "Back", "submit": "Submit Application" },
  "errors": { "required": "Required field" }
}
```

- [ ] **Step 3: Create frontend/src/i18n.js**

```js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ru from './locales/ru.json';
import kz from './locales/kz.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { ru: { translation: ru }, kz: { translation: kz }, en: { translation: en } },
    fallbackLng: 'ru',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

export default i18n;
```

- [ ] **Step 4: Create frontend/src/api/client.js**

```js
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  async error => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
            null, { params: { refresh_token: refresh } }
          );
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return api(error.config);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

- [ ] **Step 5: Create frontend/src/components/Navbar.jsx**

```jsx
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Navbar.module.css';

const LANGS = ['ru', 'kz', 'en'];

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('access_token');

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>НАО <span>Алтынсарина</span></Link>
      <div className={styles.links}>
        <Link to="/">{t('nav.home')}</Link>
        {isLoggedIn && <Link to="/dashboard">{t('nav.dashboard')}</Link>}
      </div>
      <div className={styles.right}>
        {LANGS.map(l => (
          <button key={l} className={`${styles.lang} ${i18n.language === l ? styles.active : ''}`}
            onClick={() => i18n.changeLanguage(l)}>{l.toUpperCase()}</button>
        ))}
        {isLoggedIn
          ? <button onClick={logout} className={styles.btn}>{t('nav.logout')}</button>
          : <Link to="/login" className={styles.btn}>{t('nav.login')}</Link>}
      </div>
    </nav>
  );
}
```

- [ ] **Step 6: Create frontend/src/pages/Landing.jsx**

```jsx
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import styles from './Landing.module.css';

const APP_TYPES = [
  { key: 'courses', icon: '📚' },
  { key: 'jobs', icon: '💼' },
  { key: 'research', icon: '🔬' },
  { key: 'internship', icon: '🎓' },
];

export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div>
      <Navbar />
      <section className={styles.hero}>
        <h1>{t('landing.hero_title')}</h1>
        <p>{t('landing.hero_subtitle')}</p>
        <div className={styles.btns}>
          <button onClick={() => navigate('/apply')} className={styles.primary}>{t('landing.apply_btn')}</button>
        </div>
      </section>
      <section className={styles.types}>
        <h2>{t('landing.types_title')}</h2>
        <div className={styles.grid}>
          {APP_TYPES.map(({ key, icon }) => (
            <div key={key} className={styles.card}>
              <span className={styles.icon}>{icon}</span>
              <h3>{t(`app_types.${key}`)}</h3>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 7: Wire up React Router in main.jsx**

```jsx
// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './i18n';
import './styles/variables.css';
import Landing from './pages/Landing';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
    </Routes>
  </BrowserRouter>
);
```

- [ ] **Step 8: Verify landing renders** `npm run dev` → открыть http://localhost:5173, видна главная страница с переключателем языков

- [ ] **Step 9: Commit**

```bash
git add frontend/src
git commit -m "feat: frontend scaffold — landing page, i18n (ru/kz/en), API client"
```

---

## Task 8: Frontend — Auth pages

**Files:**
- Create: `frontend/src/pages/Login.jsx`
- Create: `frontend/src/pages/Register.jsx`
- Create: `frontend/src/context/AuthContext.jsx`

- [ ] **Step 1: Create frontend/src/context/AuthContext.jsx**

```jsx
import { createContext, useContext, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    setUser({ email });
  };

  const logout = async () => {
    const rt = localStorage.getItem('refresh_token');
    if (rt) await api.post('/api/auth/logout', null, { params: { refresh_token: rt } });
    localStorage.clear();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 2: Create frontend/src/pages/Login.jsx**

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch {
      setError('Неверный email или пароль');
    }
  };

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 400, margin: '60px auto', background: '#fff', padding: 32, borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,.1)' }}>
        <h2 style={{ color: 'var(--color-primary)', marginBottom: 24 }}>Вход</h2>
        {error && <p style={{ color: 'var(--color-danger)', marginBottom: 12 }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input placeholder="Email" type="email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }} />
          <input placeholder="Пароль" type="password" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            style={{ padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }} />
          <button type="submit" style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '11px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer' }}>
            {t('nav.login')}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Нет аккаунта? <Link to="/register" style={{ color: 'var(--color-primary)' }}>Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create frontend/src/pages/Register.jsx**

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import Navbar from '../components/Navbar';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '', middle_name: '', phone: ''
  });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await api.post('/api/auth/register', form);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка регистрации');
    }
  };

  if (done) return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 400, margin: '60px auto', background: '#fff', padding: 32, borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,.1)', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-success)', marginBottom: 12 }}>✓ Регистрация успешна</h2>
        <p style={{ color: '#555' }}>Письмо с подтверждением отправлено на {form.email}</p>
        <Link to="/login" style={{ display: 'block', marginTop: 20, color: 'var(--color-primary)', fontWeight: 600 }}>Войти</Link>
      </div>
    </div>
  );

  const fields = [
    { key: 'last_name', label: t('form.last_name'), required: true },
    { key: 'first_name', label: t('form.first_name'), required: true },
    { key: 'middle_name', label: t('form.middle_name'), required: false },
    { key: 'phone', label: t('form.phone'), required: false },
    { key: 'email', label: 'Email', required: true, type: 'email' },
    { key: 'password', label: 'Пароль', required: true, type: 'password' },
  ];

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 440, margin: '40px auto', background: '#fff', padding: 32, borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,.1)' }}>
        <h2 style={{ color: 'var(--color-primary)', marginBottom: 24 }}>Регистрация</h2>
        {error && <p style={{ color: 'var(--color-danger)', marginBottom: 12 }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fields.map(({ key, label, required, type = 'text' }) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                {label}{required && ' *'}
              </label>
              <input type={type} value={form[key]} onChange={set(key)} required={required}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }} />
            </div>
          ))}
          <button type="submit" style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: 11, borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
            {t('nav.register')}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Уже есть аккаунт? <Link to="/login" style={{ color: 'var(--color-primary)' }}>Войти</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add routes in main.jsx**

```jsx
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider } from './context/AuthContext';
// wrap <Routes> in <AuthProvider>, add:
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
```

- [ ] **Step 5: Manual test** — регистрация нового пользователя → редирект на `/dashboard` (404 пока) → вход → токен в localStorage

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Login.jsx frontend/src/pages/Register.jsx frontend/src/context/AuthContext.jsx
git commit -m "feat: login and register pages with JWT storage"
```

---

## Task 9: Frontend — Dashboard + Multi-step Apply form

**Files:**
- Create: `frontend/src/pages/Dashboard.jsx`
- Create: `frontend/src/pages/Apply.jsx`
- Create: `frontend/src/components/StepForm.jsx`
- Create: `frontend/src/components/FileUpload.jsx`
- Create: `frontend/src/components/StatusBadge.jsx`

- [ ] **Step 1: Create frontend/src/components/StatusBadge.jsx**

```jsx
import { useTranslation } from 'react-i18next';

const COLORS = {
  draft: { bg: '#f8f9fa', color: '#555' },
  pending: { bg: '#fff3cd', color: '#856404' },
  approved: { bg: '#d1fae5', color: '#065f46' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
};

export default function StatusBadge({ status }) {
  const { t } = useTranslation();
  const { bg, color } = COLORS[status] || COLORS.draft;
  return (
    <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
      {t(`status.${status}`)}
    </span>
  );
}
```

- [ ] **Step 2: Create frontend/src/pages/Dashboard.jsx**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);

  useEffect(() => {
    api.get('/api/applications').then(r => setApps(r.data.items)).catch(() => navigate('/login'));
  }, []);

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ color: 'var(--color-primary)' }}>{t('nav.dashboard')}</h2>
          <button onClick={() => navigate('/apply')}
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer' }}>
            + Новая заявка
          </button>
        </div>
        {apps.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Заявок пока нет.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            <thead>
              <tr style={{ background: '#eef2fa' }}>
                {['Тип', 'Статус', 'Дата подачи', 'Создана'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--color-primary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apps.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f0f2f8' }}>
                  <td style={{ padding: '10px 14px' }}>{t(`app_types.${a.type}`)}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={a.status} /></td>
                  <td style={{ padding: '10px 14px', fontSize: 12 }}>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('ru') : '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12 }}>{new Date(a.created_at).toLocaleDateString('ru')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create frontend/src/pages/Apply.jsx** — 4-step form

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import Navbar from '../components/Navbar';
import FileUpload from '../components/FileUpload';

const STEPS = ['Тип заявки', 'Личные данные', 'Дополнительно', 'Документы'];
const APP_TYPES = ['courses', 'jobs', 'research', 'internship'];
const TYPE_LABELS = { courses: 'Курсы повышения квалификации', jobs: 'Вакансии', research: 'Научные проекты', internship: 'Стажировка' };

export default function Apply() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [appId, setAppId] = useState(null);
  const [type, setType] = useState('');
  const [extra, setExtra] = useState({});
  const [error, setError] = useState('');

  const createDraft = async (selectedType) => {
    const { data } = await api.post('/api/applications', { type: selectedType, extra_data: {} });
    setAppId(data.id);
    setType(selectedType);
    setStep(1);
  };

  const updateExtra = async () => {
    await api.patch(`/api/applications/${appId}`, { extra_data: extra });
    setStep(3);
  };

  const submitApp = async () => {
    try {
      await api.post(`/api/applications/${appId}/submit`);
      navigate('/dashboard');
    } catch {
      setError('Ошибка при подаче заявки');
    }
  };

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 700, margin: '32px auto', padding: '0 16px' }}>
        {/* Progress */}
        <div style={{ display: 'flex', marginBottom: 24 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', fontSize: 12, fontWeight: 600,
              borderBottom: `3px solid ${i === step ? 'var(--color-primary)' : i < step ? 'var(--color-success)' : 'var(--color-border)'}`,
              color: i === step ? 'var(--color-primary)' : i < step ? 'var(--color-success)' : '#aaa' }}>
              {i < step ? '✓ ' : `${i + 1}. `}{s}
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 8, padding: 28, boxShadow: 'var(--shadow)' }}>
          {error && <p style={{ color: 'var(--color-danger)', marginBottom: 12 }}>{error}</p>}

          {/* Step 0: Type selection */}
          {step === 0 && (
            <div>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: 16 }}>Выберите тип заявки</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {APP_TYPES.map(t => (
                  <button key={t} onClick={() => createDraft(t)}
                    style={{ padding: '16px', border: '2px solid var(--color-border)', borderRadius: 8, background: '#fafbfd', cursor: 'pointer', textAlign: 'left', fontWeight: 600, color: 'var(--color-primary)' }}>
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Personal data */}
          {step === 1 && (
            <div>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: 16 }}>Личные данные</h3>
              {['first_name', 'last_name', 'iin', 'phone'].map(field => (
                <div key={field} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{t(`form.${field}`)}</label>
                  <input value={extra[field] || ''} onChange={e => setExtra(x => ({ ...x, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }} />
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={() => setStep(2)}
                  style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer' }}>
                  {t('form.next')} →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Extra data */}
          {step === 2 && (
            <div>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: 16 }}>Дополнительные данные</h3>
              {type === 'courses' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Название курса</label>
                  <input value={extra.course_name || ''} onChange={e => setExtra(x => ({ ...x, course_name: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }} />
                </div>
              )}
              {type === 'jobs' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Желаемая должность</label>
                  <input value={extra.desired_position || ''} onChange={e => setExtra(x => ({ ...x, desired_position: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }} />
                </div>
              )}
              {type === 'research' && (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Тема исследования</label>
                    <input value={extra.topic || ''} onChange={e => setExtra(x => ({ ...x, topic: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Описание</label>
                    <textarea value={extra.description || ''} onChange={e => setExtra(x => ({ ...x, description: e.target.value }))} rows={4}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', resize: 'vertical' }} />
                  </div>
                </div>
              )}
              {type === 'internship' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Направление</label>
                  <input value={extra.direction || ''} onChange={e => setExtra(x => ({ ...x, direction: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }} />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <button onClick={() => setStep(1)} style={{ background: '#fff', color: 'var(--color-primary)', border: '2px solid var(--color-primary)', padding: '10px 24px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer' }}>← {t('form.back')}</button>
                <button onClick={updateExtra} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer' }}>{t('form.next')} →</button>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: 16 }}>Загрузка документов</h3>
              {appId && <FileUpload appId={appId} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <button onClick={() => setStep(2)} style={{ background: '#fff', color: 'var(--color-primary)', border: '2px solid var(--color-primary)', padding: '10px 24px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer' }}>← {t('form.back')}</button>
                <button onClick={submitApp} style={{ background: 'var(--color-success)', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer' }}>{t('form.submit')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create frontend/src/components/FileUpload.jsx**

```jsx
import { useState, useRef } from 'react';
import api from '../api/client';

const DOC_TYPES = [
  { value: 'id', label: 'Удостоверение личности / паспорт' },
  { value: 'diploma', label: 'Диплом об образовании' },
  { value: 'cv', label: 'Резюме / CV' },
  { value: 'certificate', label: 'Сертификаты' },
  { value: 'workbook', label: 'Трудовая книжка' },
  { value: 'photo', label: 'Фото 3×4' },
];

export default function FileUpload({ appId }) {
  const [uploaded, setUploaded] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [docType, setDocType] = useState('id');
  const inputRef = useRef();

  const upload = async (file) => {
    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('document_type', docType);
    form.append('file', file);
    try {
      const { data } = await api.post(`/api/applications/${appId}/documents`, form);
      setUploaded(u => [...u, data]);
    } catch (e) {
      setError(e.response?.data?.detail || 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Тип документа</label>
        <select value={docType} onChange={e => setDocType(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
          {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>
      <div onClick={() => inputRef.current.click()}
        style={{ border: '2px dashed var(--color-border)', borderRadius: 8, padding: 24, textAlign: 'center', cursor: 'pointer', background: '#f8faff', marginBottom: 12 }}>
        <p style={{ color: '#666' }}>📎 Нажмите для выбора файла</p>
        <span style={{ fontSize: 11, color: '#aaa' }}>PDF, JPG, PNG · до 10 МБ</span>
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
        onChange={e => e.target.files[0] && upload(e.target.files[0])} />
      {error && <p style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 8 }}>{error}</p>}
      {uploading && <p style={{ fontSize: 12, color: '#888' }}>Загрузка...</p>}
      {uploaded.map(d => (
        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0f4ff', borderRadius: 5, padding: '8px 12px', fontSize: 12, marginBottom: 6 }}>
          <span>📄</span>
          <span style={{ flex: 1 }}>{d.original_filename}</span>
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ Загружен</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Add routes**

```jsx
// main.jsx — add:
import Dashboard from './pages/Dashboard';
import Apply from './pages/Apply';
<Route path="/dashboard" element={<Dashboard />} />
<Route path="/apply" element={<Apply />} />
```

- [ ] **Step 6: Manual test** — войти → дашборд → новая заявка → пройти 4 шага → загрузить файл → подать → вернуться на дашборд, видна заявка со статусом «На рассмотрении»

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Dashboard.jsx frontend/src/pages/Apply.jsx frontend/src/components/FileUpload.jsx frontend/src/components/StatusBadge.jsx
git commit -m "feat: applicant dashboard and multi-step application form"
```

---

## Task 10: Frontend — Admin panel

**Files:**
- Create: `frontend/src/pages/admin/AdminDashboard.jsx`
- Create: `frontend/src/pages/admin/AdminApplicationDetail.jsx`

- [ ] **Step 1: Create frontend/src/pages/admin/AdminDashboard.jsx**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';

const FILTERS = ['all', 'pending', 'approved', 'rejected'];
const TYPE_LABELS = { courses: 'Курсы', jobs: 'Вакансии', research: 'Научные проекты', internship: 'Стажировка' };

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [filter, setFilter] = useState('all');
  const [total, setTotal] = useState(0);

  const load = async (status) => {
    const params = status !== 'all' ? { status } : {};
    const { data } = await api.get('/api/admin/applications', { params });
    setApps(data.items);
    setTotal(data.total);
  };

  useEffect(() => { load(filter); }, [filter]);

  return (
    <div>
      <Navbar />
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: 'calc(100vh - 60px)' }}>
        {/* Sidebar */}
        <aside style={{ background: 'var(--color-primary)', padding: '16px 0' }}>
          {['all', 'courses', 'jobs', 'research', 'internship'].map(item => (
            <div key={item} onClick={() => item === 'all' ? load('all') : null}
              style={{ padding: '10px 16px', color: '#cde', fontSize: 13, cursor: 'pointer' }}>
              {item === 'all' ? `📋 Все заявки (${total})` : `${TYPE_LABELS[item]}`}
            </div>
          ))}
        </aside>
        {/* Content */}
        <main style={{ padding: 24, background: '#f7f9fc' }}>
          <h3 style={{ color: 'var(--color-primary)', marginBottom: 14 }}>Заявки</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '5px 14px', borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 12, cursor: 'pointer', background: filter === f ? 'var(--color-primary)' : '#fff', color: filter === f ? '#fff' : '#555' }}>
                {f === 'all' ? 'Все' : t(`status.${f}`)}
              </button>
            ))}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 6, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            <thead>
              <tr style={{ background: '#eef2fa' }}>
                {['ID', 'Тип заявки', 'Дата подачи', 'Статус', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apps.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f0f2f8' }}>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#888' }}>{a.id.slice(0, 8)}…</td>
                  <td style={{ padding: '10px 12px' }}>{TYPE_LABELS[a.type]}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('ru') : '—'}</td>
                  <td style={{ padding: '10px 12px' }}><StatusBadge status={a.status} /></td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => navigate(`/admin/applications/${a.id}`)}
                      style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
                      Открыть
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create frontend/src/pages/admin/AdminApplicationDetail.jsx**

```jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';

export default function AdminApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [docs, setDocs] = useState([]);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/api/admin/applications/${id}`).then(r => setApp(r.data));
    api.get(`/api/applications/${id}/documents`).then(r => setDocs(r.data));
  }, [id]);

  const updateStatus = async (status) => {
    setSaving(true);
    await api.patch(`/api/admin/applications/${id}/status`, { status, comment });
    const { data } = await api.get(`/api/admin/applications/${id}`);
    setApp(data);
    setSaving(false);
  };

  if (!app) return <div>Загрузка...</div>;

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '32px auto', padding: '0 16px' }}>
        <button onClick={() => navigate('/admin')} style={{ marginBottom: 16, background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}>← Назад</button>
        <div style={{ background: '#fff', borderRadius: 8, padding: 28, boxShadow: 'var(--shadow)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ color: 'var(--color-primary)' }}>Заявка #{id.slice(0, 8)}</h3>
            <StatusBadge status={app.status} />
          </div>
          <table style={{ fontSize: 13, width: '100%' }}>
            <tbody>
              {Object.entries(app.extra_data).map(([k, v]) => (
                <tr key={k}><td style={{ padding: '6px 0', color: '#888', width: '40%' }}>{k}</td><td style={{ padding: '6px 0' }}>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Documents */}
        <div style={{ background: '#fff', borderRadius: 8, padding: 28, boxShadow: 'var(--shadow)', marginBottom: 20 }}>
          <h4 style={{ color: 'var(--color-primary)', marginBottom: 14 }}>Документы</h4>
          {docs.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 12px', background: '#f8faff', borderRadius: 5 }}>
              <span>📄</span>
              <span style={{ flex: 1, fontSize: 13 }}>{d.original_filename}</span>
              <button onClick={async () => {
                // Must use axios (not bare <a href>) to pass Authorization header
                const resp = await api.get(`/api/documents/${d.id}/download`, { responseType: 'blob' });
                const url = URL.createObjectURL(resp.data);
                const a = document.createElement('a');
                a.href = url; a.download = d.original_filename; a.click();
                URL.revokeObjectURL(url);
              }} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Скачать
              </button>
            </div>
          ))}
        </div>

        {/* Status change */}
        {app.status === 'pending' && (
          <div style={{ background: '#fff', borderRadius: 8, padding: 28, boxShadow: 'var(--shadow)' }}>
            <h4 style={{ color: 'var(--color-primary)', marginBottom: 14 }}>Изменить статус</h4>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Комментарий (необязательно)" rows={3}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', marginBottom: 12, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => updateStatus('approved')} disabled={saving}
                style={{ background: 'var(--color-success)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer' }}>
                ✓ Одобрить
              </button>
              <button onClick={() => updateStatus('rejected')} disabled={saving}
                style={{ background: 'var(--color-danger)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer' }}>
                ✗ Отклонить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add admin routes in main.jsx**

```jsx
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminApplicationDetail from './pages/admin/AdminApplicationDetail';
<Route path="/admin" element={<AdminDashboard />} />
<Route path="/admin/applications/:id" element={<AdminApplicationDetail />} />
```

- [ ] **Step 4: Manual test** — войти как admin → `/admin` → виден список заявок → открыть заявку → одобрить/отклонить → email отправлен

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin
git commit -m "feat: admin panel — applications list and detail with status management"
```

---

## Task 11: Final wiring & verification

- [ ] **Step 1: Create .gitignore**

```
backend/.env
backend/uploads/
frontend/node_modules/
frontend/dist/
__pycache__/
*.pyc
.env
```

- [ ] **Step 2: Full docker-compose up**

```bash
docker-compose up --build
```

Expected: DB, backend on :8000, frontend on :5173 all healthy.

- [ ] **Step 3: Create admin via CLI**

```bash
docker-compose exec backend python -m app.cli create-admin
# Enter email, password, name when prompted
```

- [ ] **Step 4: Run full backend test suite**

```bash
docker-compose exec backend pytest tests/ -v
```

Expected: all tests PASS

- [ ] **Step 5: End-to-end checklist**

```
[ ] Register as individual → confirm email → login
[ ] Submit application of each type (courses, jobs, research, internship)
[ ] Upload documents (valid + >10MB → expect 400)
[ ] Login as admin → see all applications
[ ] Change status → applicant receives email
[ ] Try to download another user's document → expect 403
[ ] Switch language ru/kz/en → UI updates
[ ] Check mobile layout at 375px width
```

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete admissions portal v1 — backend + frontend + admin + i18n"
```
