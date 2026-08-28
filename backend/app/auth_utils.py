import os
import time
import hashlib
import hmac
import secrets
from sqlalchemy.orm import Session
from typing import Optional

from app.database import User

AUTH_SECRET = os.getenv("AUTH_SECRET", "dev-secret-change-me-in-production")
PASSWORD_ITERATIONS = 200_000
TOKEN_TTL = 7 * 24 * 60 * 60  # 7 days


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PASSWORD_ITERATIONS)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest_hex = stored.split("$", 1)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PASSWORD_ITERATIONS)
        return hmac.compare_digest(digest.hex(), digest_hex)
    except Exception:
        return False


def create_token(user_id: int) -> str:
    exp = int(time.time()) + TOKEN_TTL
    payload = f"{user_id}.{exp}"
    signature = hmac.new(AUTH_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def extract_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    authorization = authorization.strip()
    if authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return authorization or None


def get_current_user(authorization: Optional[str], db: Session) -> Optional[User]:
    token = extract_token(authorization)
    return get_user_from_token(token, db) if token else None


def get_user_from_token(token: str, db: Session) -> Optional[User]:
    try:
        user_id_s, exp_s, signature = token.split(".")
        payload = f"{user_id_s}.{exp_s}"
        expected = hmac.new(AUTH_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            return None
        if int(exp_s) < time.time():
            return None
        return db.query(User).filter(User.id == int(user_id_s)).first()
    except Exception:
        return None