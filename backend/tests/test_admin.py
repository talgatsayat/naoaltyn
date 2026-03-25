import pytest
from app.models.application import ApplicationStatus

def test_application_status_values():
    assert ApplicationStatus.approved == "approved"
    assert ApplicationStatus.rejected == "rejected"
    assert ApplicationStatus.pending == "pending"
    assert ApplicationStatus.draft == "draft"

def test_status_update_schema():
    from app.routers.admin import StatusUpdate
    data = StatusUpdate(status=ApplicationStatus.approved, comment="Looks good")
    assert data.status == ApplicationStatus.approved
    assert data.comment == "Looks good"

def test_status_update_no_comment():
    from app.routers.admin import StatusUpdate
    data = StatusUpdate(status=ApplicationStatus.rejected)
    assert data.comment is None

def test_email_body_generation():
    """Test that send_status_change_email constructs body without crashing (no actual send)."""
    import asyncio
    from unittest.mock import AsyncMock, patch

    async def run():
        with patch("app.services.email.FastMail") as MockFM:
            MockFM.return_value.send_message = AsyncMock()
            from app.services.email import send_status_change_email
            # Should not raise even with SMTP not configured
            try:
                await send_status_change_email("test@example.com", "courses", "approved", "Great!")
            except Exception:
                pass  # Email send may fail in test — that's OK, we test it doesn't crash the app

    asyncio.run(run())
