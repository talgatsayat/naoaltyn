import os
import uuid
from fastapi import UploadFile, HTTPException
from app.core.config import settings

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
