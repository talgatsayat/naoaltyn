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


from app.routers.auth import router as auth_router
app.include_router(auth_router)

from app.routers.applications import router as app_router
app.include_router(app_router)


@app.get("/health")
def health():
    return {"status": "ok"}
