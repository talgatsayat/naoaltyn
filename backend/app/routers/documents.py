import os
import uuid
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
    app_ = await db.get(Application, uuid.UUID(app_id))
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
    app_ = await db.get(Application, uuid.UUID(app_id))
    if not app_:
        raise HTTPException(404, "Not found")
    if app_.user_id != user.id and user.role != UserRole.admin:
        raise HTTPException(403, "Forbidden")
    docs = (await db.scalars(select(Document).where(Document.application_id == app_.id))).all()
    return list(docs)


@router.get("/api/documents/{doc_id}/download")
async def download_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = await db.get(Document, uuid.UUID(doc_id))
    if not doc:
        raise HTTPException(404, "Not found")
    if doc.user_id != user.id and user.role != UserRole.admin:
        raise HTTPException(403, "Forbidden")
    if not os.path.exists(doc.file_path):
        raise HTTPException(404, "File not found on disk")
    return FileResponse(doc.file_path, filename=doc.original_filename)


@router.delete("/api/documents/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = await db.get(Document, uuid.UUID(doc_id))
    if not doc or doc.user_id != user.id:
        raise HTTPException(404, "Not found")
    app_ = await db.get(Application, doc.application_id)
    if app_.status != ApplicationStatus.draft:
        raise HTTPException(400, "Cannot delete documents from submitted applications")
    delete_file(doc.file_path)
    await db.delete(doc)
    await db.commit()
