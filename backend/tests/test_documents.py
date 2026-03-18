import pytest
import os
import tempfile
from unittest.mock import MagicMock, patch


def test_validate_file_bad_extension():
    from fastapi import HTTPException
    from app.services.file_storage import validate_file
    mock_file = MagicMock()
    mock_file.filename = "malware.exe"
    with pytest.raises(HTTPException) as exc_info:
        validate_file(mock_file, 100)
    assert exc_info.value.status_code == 400


def test_validate_file_too_large():
    from fastapi import HTTPException
    from app.services.file_storage import validate_file
    mock_file = MagicMock()
    mock_file.filename = "test.pdf"
    with pytest.raises(HTTPException) as exc_info:
        validate_file(mock_file, 11 * 1024 * 1024)
    assert exc_info.value.status_code == 400


def test_validate_file_ok():
    from app.services.file_storage import validate_file
    mock_file = MagicMock()
    mock_file.filename = "resume.pdf"
    validate_file(mock_file, 500 * 1024)  # 500KB — should not raise


def test_delete_nonexistent_file():
    from app.services.file_storage import delete_file
    # Should not raise even if file doesn't exist
    delete_file("/tmp/nonexistent_file_xyz_12345.pdf")
