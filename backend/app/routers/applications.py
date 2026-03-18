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
    return PaginatedApplications(items=list(items), total=total, page=page, page_size=page_size)

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
    import uuid
    app_ = await db.get(Application, uuid.UUID(app_id))
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
    import uuid
    app_ = await db.get(Application, uuid.UUID(app_id))
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
    import uuid
    app_ = await db.get(Application, uuid.UUID(app_id))
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
    import uuid
    app_ = await db.get(Application, uuid.UUID(app_id))
    if not app_ or app_.user_id != user.id:
        raise HTTPException(404, "Not found")
    if app_.status != ApplicationStatus.draft:
        raise HTTPException(400, "Only drafts can be deleted")
    await db.delete(app_)
    await db.commit()
