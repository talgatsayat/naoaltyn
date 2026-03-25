from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
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
    return PaginatedApplications(items=list(items), total=total, page=page, page_size=page_size)

@router.get("/applications/{app_id}", response_model=ApplicationResponse)
async def admin_get_application(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    app_ = await db.get(Application, uuid.UUID(app_id))
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
    app_ = await db.get(Application, uuid.UUID(app_id))
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
