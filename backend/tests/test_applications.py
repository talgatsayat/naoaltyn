import pytest
from app.schemas.application import ApplicationCreate, ApplicationResponse, ApplicationUpdate
from app.models.application import ApplicationType, ApplicationStatus
import uuid
from datetime import datetime

def test_application_create_schema():
    data = ApplicationCreate(type=ApplicationType.courses, extra_data={"key": "value"})
    assert data.type == ApplicationType.courses
    assert data.extra_data == {"key": "value"}

def test_application_create_default_extra_data():
    data = ApplicationCreate(type=ApplicationType.jobs)
    assert data.extra_data == {}

def test_application_update_schema():
    data = ApplicationUpdate(extra_data={"new": "data"})
    assert data.extra_data == {"new": "data"}

def test_application_response_schema():
    now = datetime.utcnow()
    resp = ApplicationResponse(
        id=uuid.uuid4(),
        type=ApplicationType.research,
        status=ApplicationStatus.draft,
        extra_data={},
        admin_comment=None,
        submitted_at=None,
        created_at=now,
        updated_at=now,
    )
    assert resp.status == ApplicationStatus.draft
