import pytest
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token, make_token, hash_token

def test_password_hashing():
    hashed = hash_password("mypassword")
    assert verify_password("mypassword", hashed)
    assert not verify_password("wrongpassword", hashed)

def test_access_token():
    token = create_access_token("user-id-123")
    assert isinstance(token, str)
    user_id = decode_access_token(token)
    assert user_id == "user-id-123"

def test_invalid_token():
    result = decode_access_token("not-a-valid-token")
    assert result is None

def test_token_hashing():
    raw = make_token()
    h1 = hash_token(raw)
    h2 = hash_token(raw)
    assert h1 == h2
    assert h1 != raw
