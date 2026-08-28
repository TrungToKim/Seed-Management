import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv

load_dotenv()


def ensure_database():
    """Create the database (if it doesn't exist) and ensure all tables exist."""
    from urllib.parse import urlparse
    import psycopg2
    from app.database import init_db

    probe = None
    for key in ("DB_URL", "DATABASE_URL"):
        probe = os.getenv(key)
        if probe:
            break
    if not probe:
        print("DB_URL/DATABASE_URL not set. Skipping database creation.")
        return

    p = urlparse(probe)
    dbname = (p.path or "/").lstrip("/")
    if not dbname or not p.hostname:
        print(f"Could not parse DB_URL: {probe}")
        return

    maint_url = probe.replace(f"/{dbname}", "/postgres", 1)
    try:
        conn = psycopg2.connect(maint_url)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (dbname,))
        exists = cur.fetchone() is not None
        cur.close()
        conn.close()
        if not exists:
            conn = psycopg2.connect(maint_url)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(f'CREATE DATABASE "{dbname}"')
            cur.close()
            conn.close()
            print(f"Created database '{dbname}'.")
        else:
            print(f"Database '{dbname}' already exists.")
    except Exception as e:
        print(f"Could not create database '{dbname}': {e}")

    init_db()
    print("Tables ensured.")


def bootstrap_admin():
    """Create or update an admin account from ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_EMAIL."""
    from app.database import SessionLocal, User
    from app.auth_utils import hash_password

    username = (os.getenv("ADMIN_USERNAME") or "").strip()
    password = os.getenv("ADMIN_PASSWORD") or ""
    email = (os.getenv("ADMIN_EMAIL") or "").strip()

    if not username or not password:
        print("ADMIN_USERNAME / ADMIN_PASSWORD not set. Skipping admin bootstrap.")
        return

    db = SessionLocal()
    try:
        from sqlalchemy import or_
        filters = [User.username == username]
        if email:
            filters.append(User.email == email)
        user = db.query(User).filter(or_(*filters)).first()
        if user:
            user.username = username
            user.email = email or user.email
            user.password_hash = hash_password(password)
            user.is_admin = True
            user.role = "administrator"
            user.is_primary = True
            db.commit()
            print(f"Primary admin account updated: {username}")
        else:
            db.add(User(
                username=username,
                email=email or f"{username}@localhost",
                password_hash=hash_password(password),
                is_admin=True,
                role="administrator",
                is_primary=True,
            ))
            db.commit()
            print(f"Primary admin account created: {username}")
    finally:
        db.close()


if __name__ == "__main__":
    ensure_database()
    bootstrap_admin()
    print("Setup complete.")