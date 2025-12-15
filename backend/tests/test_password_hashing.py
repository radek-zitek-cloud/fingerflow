from app.utils.auth import get_password_hash, verify_password


def test_password_hash_roundtrip():
    hashed = get_password_hash("Password123")
    assert verify_password("Password123", hashed) is True
    assert verify_password("WrongPassword", hashed) is False

