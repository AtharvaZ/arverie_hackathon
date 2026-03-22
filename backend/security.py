import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any


PLACEHOLDER_VALUES = {
    "",
    "changeme",
    "change-me",
    "placeholder",
    "your-key-here",
    "replace-me",
}


class SecurityError(Exception):
    """Raised when a security check fails."""


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _is_placeholder(value: str) -> bool:
    cleaned = (value or "").strip()
    if cleaned.lower() in PLACEHOLDER_VALUES:
        return True
    return cleaned.lower().startswith("your_") or cleaned.lower().startswith("replace_")


def validate_required_env(required_keys: list[str]) -> None:
    """Fail fast if required runtime secrets are missing or placeholder values."""
    missing: list[str] = []
    for key in required_keys:
        raw = os.getenv(key, "")
        if _is_placeholder(raw):
            missing.append(key)
    if missing:
        joined = ", ".join(sorted(missing))
        raise RuntimeError(
            f"Missing or invalid environment variables: {joined}. "
            "Set real secrets in backend/.env before starting the API."
        )


def mint_signed_token(payload: dict[str, Any], secret: str, ttl_seconds: int) -> str:
    """Create an HMAC-signed, URL-safe token with exp/iat/nonce claims."""
    now = int(time.time())
    claims = {
        **payload,
        "iat": now,
        "exp": now + ttl_seconds,
        "nonce": secrets.token_hex(8),
    }
    body = _b64url_encode(json.dumps(claims, separators=(",", ":")).encode("utf-8"))
    sig = hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).digest()
    return f"{body}.{_b64url_encode(sig)}"


def verify_signed_token(token: str, secret: str, allowed_scopes: set[str]) -> dict[str, Any]:
    """Verify signature, expiry, and scope for a signed token."""
    if not token or "." not in token:
        raise SecurityError("Malformed token")

    body, signature = token.rsplit(".", 1)
    expected_sig = hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).digest()
    actual_sig = _b64url_decode(signature)
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise SecurityError("Invalid token signature")

    try:
        claims = json.loads(_b64url_decode(body).decode("utf-8"))
    except Exception as exc:  # pragma: no cover
        raise SecurityError("Invalid token payload") from exc

    scope = str(claims.get("scope", "")).strip()
    if scope not in allowed_scopes:
        raise SecurityError("Invalid token scope")

    exp = int(claims.get("exp", 0))
    if exp <= int(time.time()):
        raise SecurityError("Token expired")

    return claims


def parse_bearer_token(authorization_header: str | None) -> str | None:
    """Extract the token from Authorization: Bearer <token>."""
    if not authorization_header:
        return None
    parts = authorization_header.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1].strip()
    return token or None