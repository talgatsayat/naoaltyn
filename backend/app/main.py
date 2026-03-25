from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
import app.models.user  # noqa: F401
import app.models.application  # noqa: F401
import app.models.document  # noqa: F401
import app.models.token  # noqa: F401


@asynccontextmanager
async def lifespan(application: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="НАО Алтынсарина — Портал заявок", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from app.routers.auth import router as auth_router
app.include_router(auth_router)

from app.routers.applications import router as app_router
app.include_router(app_router)

from app.routers.documents import router as doc_router
app.include_router(doc_router)

from app.routers.admin import router as admin_router
app.include_router(admin_router)


@app.get("/health")
def health():
    return {"status": "ok"}
