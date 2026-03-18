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
