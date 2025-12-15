"""
Two-Factor Authentication Utilities

TOTP-based 2FA using pyotp library.
"""
import pyotp
import qrcode
import io
import base64
import json
import secrets
from typing import List, Tuple


def generate_2fa_secret() -> str:
    """Generate a new TOTP secret."""
    return pyotp.random_base32()


def generate_qr_code(email: str, secret: str, issuer: str = "FingerFlow") -> str:
    """
    Generate QR code for TOTP setup.

    Returns base64-encoded PNG image.
    """
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=email, issuer_name=issuer)

    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode()

    return f"data:image/png;base64,{img_str}"


def verify_2fa_code(secret: str, code: str) -> bool:
    """
    Verify a TOTP code.

    Args:
        secret: User's TOTP secret
        code: 6-digit code from authenticator app

    Returns:
        True if code is valid, False otherwise
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)  # Allow 30s window


def generate_backup_codes(count: int = 10) -> List[str]:
    """
    Generate backup codes for 2FA recovery.

    Returns list of 8-character alphanumeric codes.
    """
    return [secrets.token_hex(4).upper() for _ in range(count)]


def hash_backup_codes(codes: List[str]) -> str:
    """
    Hash backup codes for storage.

    Returns JSON string of hashed codes.
    """
    from app.utils.auth import get_password_hash
    hashed = [get_password_hash(code) for code in codes]
    return json.dumps(hashed)


def verify_backup_code(stored_codes_json: str, code: str) -> Tuple[bool, str]:
    """
    Verify a backup code and remove it if valid.

    Args:
        stored_codes_json: JSON string of hashed codes
        code: Backup code to verify

    Returns:
        (is_valid, updated_codes_json)
    """
    from app.utils.auth import verify_password

    hashed_codes = json.loads(stored_codes_json)

    for i, hashed_code in enumerate(hashed_codes):
        if verify_password(code, hashed_code):
            # Remove used code
            hashed_codes.pop(i)
            return True, json.dumps(hashed_codes)

    return False, stored_codes_json


def get_remaining_backup_codes_count(stored_codes_json: str) -> int:
    """Get count of remaining backup codes."""
    if not stored_codes_json:
        return 0
    hashed_codes = json.loads(stored_codes_json)
    return len(hashed_codes)
