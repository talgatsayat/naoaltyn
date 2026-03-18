def test_imports():
    from app.models.user import User, UserRole, ApplicantType
    from app.models.application import Application, ApplicationType, ApplicationStatus
    from app.models.document import Document
    from app.models.token import RefreshToken, PasswordResetToken
    assert UserRole.admin == "admin"
    assert ApplicationStatus.draft == "draft"
