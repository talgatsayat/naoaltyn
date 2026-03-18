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
