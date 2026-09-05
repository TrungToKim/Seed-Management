import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, Column, Integer, String, Text, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_backend_dir, ".env"))
load_dotenv()

SQLALCHEMY_URL = os.getenv("DB_URL") or os.getenv("DATABASE_URL")
if SQLALCHEMY_URL:
    if SQLALCHEMY_URL.startswith("postgres://"):
        SQLALCHEMY_URL = SQLALCHEMY_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    elif SQLALCHEMY_URL.startswith("postgresql://"):
        SQLALCHEMY_URL = SQLALCHEMY_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = None
SessionLocal = None
Base = declarative_base()

if SQLALCHEMY_URL:
    try:
        engine = create_engine(
            SQLALCHEMY_URL,
            connect_args={"connect_timeout": 15},
            pool_pre_ping=True,
            pool_recycle=300,
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    except Exception as e:
        print(f"Warning: Could not create initial database engine: {e}")

_db_initialized = False

def get_engine():
    global engine, SessionLocal
    if engine is None and SQLALCHEMY_URL:
        engine = create_engine(
            SQLALCHEMY_URL,
            connect_args={"connect_timeout": 15},
            pool_pre_ping=True,
            pool_recycle=300,
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine

def get_db():
    global _db_initialized
    if not _db_initialized:
        _db_initialized = True
        init_db()
    eng = get_engine()
    if eng is None or SessionLocal is None:
        raise RuntimeError("Database not configured. Set DB_URL environment variable.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

USER_MIGRATION_SQL = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(2048)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()',
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'customer'",
    "UPDATE users SET role = 'administrator' WHERE is_admin = TRUE AND role = 'customer'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE",
]

PACKAGE_MIGRATION_SQL = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS package_id INTEGER',
    """DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_package_id') THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_package_id FOREIGN KEY (package_id) REFERENCES packages(id);
      END IF;
    END $$;""",
    'ALTER TABLE packages ADD COLUMN IF NOT EXISTS discount_3m INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE packages ADD COLUMN IF NOT EXISTS discount_6m INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE packages ADD COLUMN IF NOT EXISTS discount_12m INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE packages ADD COLUMN IF NOT EXISTS discount_1m INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE packages ADD COLUMN IF NOT EXISTS duration_months INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_name_key',
    "UPDATE packages SET discount_3m = 5, discount_6m = 10, discount_12m = 15 WHERE name = 'Cơ bản' AND discount_3m = 0",
    "UPDATE packages SET discount_3m = 10, discount_6m = 20, discount_12m = 30 WHERE name = 'Premium' AND discount_3m = 0",
]


import re
import unicodedata

def slugify(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'MN')
    text = text.replace('đ', 'd').replace('Đ', 'D')
    text = re.sub(r'[^\w\s-]', '', text.lower())
    return re.sub(r'[-\s]+', '-', text).strip('-')

PLANT_MIGRATION_SQL = [
    'ALTER TABLE plants ADD COLUMN IF NOT EXISTS slug VARCHAR(255)',
    'ALTER TABLE plants ADD COLUMN IF NOT EXISTS other_names TEXT',
    'ALTER TABLE plants ADD COLUMN IF NOT EXISTS used_parts TEXT',
    'ALTER TABLE plants ADD COLUMN IF NOT EXISTS chemical_components TEXT',
    'ALTER TABLE plants ADD COLUMN IF NOT EXISTS how_to_use TEXT',
    'ALTER TABLE plants ADD COLUMN IF NOT EXISTS precautions TEXT',
    'ALTER TABLE plants ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE',
    'ALTER TABLE plants ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0',
    'ALTER TABLE plants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()',
    'ALTER TABLE plants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()',
    'CREATE UNIQUE INDEX IF NOT EXISTS ix_plants_slug ON plants(slug)',
]

def migrate_db():
    eng = get_engine()
    if eng is None:
        return
    try:
        with eng.begin() as conn:
            for statement in USER_MIGRATION_SQL:
                conn.execute(text(statement))
        print("User database migrations applied.")
    except Exception as e:
        print(f"Warning: Could not apply user migrations: {e}")
    try:
        with eng.begin() as conn:
            for statement in PACKAGE_MIGRATION_SQL:
                conn.execute(text(statement))
        print("Package migrations applied.")
    except Exception as e:
        print(f"Warning: Could not apply package migrations: {e}")
    try:
        with eng.begin() as conn:
            for statement in PLANT_MIGRATION_SQL:
                conn.execute(text(statement))
        print("Plant migrations applied.")
    except Exception as e:
        print(f"Warning: Could not apply plant migrations: {e}")

def populate_plant_slugs_and_seeds():
    eng = get_engine()
    if eng is None or SessionLocal is None:
        return
    db = SessionLocal()
    try:
        plants = db.query(Plant).all()
        for p in plants:
            if not p.slug and p.common_name:
                base_slug = slugify(p.common_name)
                candidate = base_slug
                idx = 1
                while db.query(Plant).filter(Plant.slug == candidate, Plant.id != p.id).first():
                    candidate = f"{base_slug}-{idx}"
                    idx += 1
                p.slug = candidate
        db.commit()

        if db.query(Article).count() == 0:
            sample_articles = [
                Article(
                    title="Hướng dẫn sử dụng cây thuốc Nam an toàn và hiệu quả",
                    slug="huong-dan-su-dung-cay-thuoc-nam-an-toan",
                    summary="Những nguyên tắc cốt lõi khi sử dụng thảo dược dân gian trong đời sống thường ngày.",
                    content="Sử dụng cây thuốc Nam là phương pháp trị bệnh và chăm sóc sức khỏe lâu đời của người Việt. Tuy nhiên, việc sử dụng cần tuân thủ đúng liều lượng, đúng bộ phận và đúng đối tượng để tránh các tác dụng không mong muốn. Luôn tham khảo ý kiến chuyên gia y tế trước khi áp dụng bất kỳ bài thuốc nào.",
                    image_url="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80",
                    category="Hướng dẫn",
                    author="Dược sĩ Nguyễn Văn A"
                ),
                Article(
                    title="10 Cây thuốc Nam quen thuộc xung quanh vườn nhà",
                    slug="10-cay-thuoc-nam-quen-thuoc-trong-vuon-nha",
                    summary="Khám phá công dụng bất ngờ từ những loài cây dễ trồng như Đinh lăng, Ngải cứu, Hà thủ ô.",
                    content="Nhiều loài cây mọc dại hoặc được trồng làm cảnh trong vườn nhà lại chứa đựng những giá trị dược liệu vô cùng quý giá. Bài viết tổng hợp 10 loại cây phổ biến và cách nhận biết, chế biến hiệu quả nhất.",
                    image_url="https://images.unsplash.com/photo-1515586000433-45406d8e6662?auto=format&fit=crop&w=800&q=80",
                    category="Khám phá",
                    author="Ban biên tập Thực Vật Việt"
                )
            ]
            db.add_all(sample_articles)
            db.commit()
    except Exception as e:
        print(f"Warning in populate_plant_slugs_and_seeds: {e}")
    finally:
        db.close()


DEFAULT_PACKAGES = [
    {
        "name": "Miễn phí",
        "description": "Gói cơ bản dành cho người dùng mới. Đủ để trải nghiệm tra cứu cây thuốc.",
        "monthly_price": 0,
        "chat_per_minute": 5,
        "chat_per_day": 30,
        "community_per_day": 3,
        "discount_1m": 0,
        "discount_3m": 0,
        "discount_6m": 0,
        "discount_12m": 0,
        "duration_months": 1,
    },
    {
        "name": "Membership",
        "description": "Gói thành viên chính thức. Không giới hạn hỏi đáp AI và bài đăng cộng đồng.",
        "monthly_price": 100000,
        "chat_per_minute": 30,
        "chat_per_day": 0,
        "community_per_day": 0,
        "discount_1m": 0,
        "discount_3m": 10,
        "discount_6m": 20,
        "discount_12m": 30,
        "duration_months": 1,
    },
]


def ensure_default_packages():
    eng = get_engine()
    if eng is None or SessionLocal is None:
        return
    db = SessionLocal()
    try:
        for pkg in DEFAULT_PACKAGES:
            exists = db.query(Package).filter(Package.name == pkg["name"], Package.duration_months == pkg["duration_months"]).first()
            if not exists:
                db.add(Package(**pkg))
        db.commit()

        # Migrate user subscriptions from old plans to Membership and delete old plans
        membership_pkg = db.query(Package).filter(Package.name == "Membership", Package.duration_months == 1).first()
        if membership_pkg:
            old_pkgs = db.query(Package).filter(Package.name.in_(["Cơ bản", "Premium"])).all()
            old_ids = [p.id for p in old_pkgs]
            if old_ids:
                db.query(User).filter(User.package_id.in_(old_ids)).update({User.package_id: membership_pkg.id}, synchronize_session=False)
                db.query(Package).filter(Package.id.in_(old_ids)).delete(synchronize_session=False)
                db.commit()
    except Exception as e:
        print(f"Warning: Could not seed default packages: {e}")
    finally:
        db.close()


def get_free_package(db: Session) -> "Package":
    free = db.query(Package).filter(Package.name == "Miễn phí").first()
    if free is None:
        free = db.query(Package).order_by(Package.monthly_price.asc()).first()
    if free is None:
        free = Package(
            name="Miễn phí",
            description="Gói mặc định.",
            monthly_price=0,
            chat_per_minute=5,
            chat_per_day=30,
            community_per_day=3,
        )
    return free


def init_db():
    eng = get_engine()
    if eng is None:
        print("Warning: DB_URL not set, skipping database initialization")
        return
    try:
        with eng.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()
    except Exception as e:
        print(f"Warning: Could not create vector extension: {e}")
    try:
        Base.metadata.create_all(bind=eng)
    except Exception as e:
        print(f"Warning: Could not create all tables: {e}")
        tables_to_create = [t for name, t in Base.metadata.tables.items() if name != "vector_chunks"]
        for table in tables_to_create:
            try:
                table.create(bind=eng, checkfirst=True)
            except Exception as ex:
                print(f"LỖI TẠO BẢNG {table.name}: {ex}")
    migrate_db()
    ensure_default_packages()
    ensure_default_settings()
    populate_plant_slugs_and_seeds()

class Plant(Base):
    __tablename__ = "plants"
    id = Column(Integer, primary_key=True, index=True)
    common_name = Column(String(255), index=True)
    scientific_name = Column(String(255))
    family = Column(String(100), index=True)
    region = Column(String(100))
    image_url = Column(String(2048), nullable=True)
    description = Column(Text)
    slug = Column(String(255), unique=True, index=True, nullable=True)
    other_names = Column(Text, nullable=True)
    used_parts = Column(Text, nullable=True)
    chemical_components = Column(Text, nullable=True)
    how_to_use = Column(Text, nullable=True)
    precautions = Column(Text, nullable=True)
    featured = Column(Boolean, default=False)
    views_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    tags = relationship("Tag", secondary="plant_tags", back_populates="plants")
    details = relationship("PlantDetail", back_populates="plant", cascade="all, delete-orphan")
    images = relationship("PlantImage", back_populates="plant", cascade="all, delete-orphan")
    references = relationship("PlantReference", back_populates="plant", cascade="all, delete-orphan")

class PlantImage(Base):
    __tablename__ = "plant_images"
    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(2048), nullable=False)
    caption = Column(String(255), nullable=True)
    is_primary = Column(Boolean, default=False)
    plant = relationship("Plant", back_populates="images")

class PlantReference(Base):
    __tablename__ = "plant_references"
    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    url = Column(String(2048), nullable=True)
    author_source = Column(String(255), nullable=True)
    plant = relationship("Plant", back_populates="references")

class UserFavorite(Base):
    __tablename__ = "user_favorites"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    plant = relationship("Plant")

class Article(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    summary = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    image_url = Column(String(2048), nullable=True)
    category = Column(String(100), default="Dược liệu")
    author = Column(String(100), default="Ban biên tập Thực Vật Việt")
    views_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

class SearchLog(Base):
    __tablename__ = "search_logs"
    id = Column(Integer, primary_key=True, index=True)
    query = Column(String(255), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50))
    tag_name = Column(String(100), unique=True)
    plants = relationship("Plant", secondary="plant_tags", back_populates="tags")

class PlantTag(Base):
    __tablename__ = "plant_tags"
    plant_id = Column(Integer, ForeignKey("plants.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)

class PlantDetail(Base):
    __tablename__ = "plant_details"
    id = Column(Integer, primary_key=True, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"))
    section_type = Column(String(50))
    content = Column(Text)
    source_reference = Column(String(255))
    plant = relationship("Plant", back_populates="details")

class Package(Base):
    __tablename__ = "packages"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    monthly_price = Column(Integer, default=0, nullable=False)
    chat_per_minute = Column(Integer, default=5, nullable=False)
    chat_per_day = Column(Integer, default=30, nullable=False)
    community_per_day = Column(Integer, default=3, nullable=False)
    discount_3m = Column(Integer, default=0, nullable=False)
    discount_6m = Column(Integer, default=0, nullable=False)
    discount_12m = Column(Integer, default=0, nullable=False)
    discount_1m = Column(Integer, default=0, nullable=False)
    duration_months = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc), nullable=False)
    users = relationship("User", back_populates="package")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    avatar_url = Column(String(2048), nullable=True)
    bio = Column(Text, nullable=True)
    is_admin = Column(Boolean, default=False)
    role = Column(String(50), default="customer", nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    package_id = Column(Integer, ForeignKey("packages.id"), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc), nullable=False)
    package = relationship("Package", back_populates="users")
    messages = relationship("CommunityMessage", back_populates="user")

    @property
    def package_name(self) -> str:
        return self.package.name if self.package else "Miễn phí"

class CommunityMessage(Base):
    __tablename__ = "community_messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    username = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc), nullable=False, index=True)
    user = relationship("User", back_populates="messages")

class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String(100), primary_key=True)
    value = Column(String(255), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc), nullable=False)

# Adjustable system settings (admin-editable at runtime)
DEFAULT_SETTINGS = {
    "guest_chat_per_day": 5,
}

def ensure_default_settings():
    eng = get_engine()
    if eng is None or SessionLocal is None:
        return
    db = SessionLocal()
    try:
        for key, value in DEFAULT_SETTINGS.items():
            exists = db.query(SystemSetting).filter(SystemSetting.key == key).first()
            if not exists:
                db.add(SystemSetting(key=key, value=str(value)))
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Warning: Could not seed default settings: {e}")
    finally:
        db.close()

def get_int_setting(db: Session, key: str, default: Optional[int] = None) -> int:
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        return int(DEFAULT_SETTINGS.get(key, default if default is not None else 0))
    try:
        return int(setting.value)
    except (TypeError, ValueError):
        return int(DEFAULT_SETTINGS.get(key, default if default is not None else 0))

def set_int_setting(db: Session, key: str, value: int) -> None:
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if setting:
        setting.value = str(value)
    else:
        db.add(SystemSetting(key=key, value=str(value)))
    db.commit()


def ensure_primary_admin():
    """Ensure exactly one primary admin account exists.

    The primary admin cannot be deleted nor have its role changed (enforced in main.py).
    Credentials come from ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_EMAIL env vars,
    falling back to username "admin" with a default password for local development.
    """
    eng = get_engine()
    if eng is None or SessionLocal is None:
        return
    db = SessionLocal()
    try:
        primary = db.query(User).filter(User.is_primary == True).first()
        if primary:
            changed = False
            if not primary.is_admin:
                primary.is_admin = True
                changed = True
            if primary.role != "administrator":
                primary.role = "administrator"
                changed = True
            if changed:
                db.commit()
            return

        from app.auth_utils import hash_password

        username = (os.getenv("ADMIN_USERNAME") or "admin").strip() or "admin"
        email = ((os.getenv("ADMIN_EMAIL") or "").strip() or f"{username}@localhost").lower()
        password = os.getenv("ADMIN_PASSWORD") or ""

        candidate = db.query(User).filter(User.username == username).first()
        if candidate:
            candidate.is_primary = True
            candidate.is_admin = True
            candidate.role = "administrator"
            if password:
                candidate.password_hash = hash_password(password)
            db.commit()
            print(f"Primary admin ensured on existing account: {username}")
            return

        generated = False
        if not password:
            password = "admin123"
            generated = True
        db.add(User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            is_admin=True,
            role="administrator",
            is_primary=True,
        ))
        db.commit()
        msg = f"Primary admin account created: {username}"
        if generated:
            msg += " (default password 'admin123' — change it via ADMIN_PASSWORD env)"
        print(msg)
    except Exception as e:
        db.rollback()
        print(f"Warning: Could not ensure primary admin: {e}")
    finally:
        db.close()

if HAS_PGVECTOR:
    PlantDetail.vector_chunks = relationship("VectorChunk", back_populates="plant_detail")

    class VectorChunk(Base):
        __tablename__ = "vector_chunks"
        id = Column(Integer, primary_key=True, index=True)
        plant_detail_id = Column(Integer, ForeignKey("plant_details.id"))
        chunk_text = Column(Text)
        embedding_vector = Column(Vector(768))
        plant_detail = relationship("PlantDetail", back_populates="vector_chunks")

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    query: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    status: str
    answer: str
    sources: List[str] = []

class TagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category: str
    tag_name: str

class PlantImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    image_url: str
    caption: Optional[str] = None
    is_primary: bool = False

class PlantReferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    url: Optional[str] = None
    author_source: Optional[str] = None

class PlantCreate(BaseModel):
    common_name: str
    scientific_name: Optional[str] = None
    family: Optional[str] = None
    region: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    slug: Optional[str] = None
    other_names: Optional[str] = None
    used_parts: Optional[str] = None
    chemical_components: Optional[str] = None
    how_to_use: Optional[str] = None
    precautions: Optional[str] = None
    featured: Optional[bool] = False
    tags: Optional[List[str]] = []

class PlantDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    section_type: str
    content: str
    source_reference: Optional[str] = None

class PlantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    common_name: str
    scientific_name: Optional[str] = None
    family: Optional[str] = None
    region: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    slug: Optional[str] = None
    other_names: Optional[str] = None
    used_parts: Optional[str] = None
    chemical_components: Optional[str] = None
    how_to_use: Optional[str] = None
    precautions: Optional[str] = None
    featured: bool = False
    views_count: int = 0
    tags: List[TagResponse] = []
    details: List[PlantDetailResponse] = []
    images: List[PlantImageResponse] = []
    references: List[PlantReferenceResponse] = []
    is_favorite: Optional[bool] = False

class PlantListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    items: List[PlantResponse]
    total: int
    page: int
    page_size: int

class ArticleCreate(BaseModel):
    title: str
    summary: Optional[str] = None
    content: str
    image_url: Optional[str] = None
    category: Optional[str] = "Dược liệu"
    author: Optional[str] = "Ban biên tập Thực Vật Việt"

class ArticleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    slug: str
    summary: Optional[str] = None
    content: str
    image_url: Optional[str] = None
    category: str
    author: str
    views_count: int
    created_at: datetime

class ArticleListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    items: List[ArticleResponse]
    total: int
    page: int
    page_size: int

class FavoriteSyncRequest(BaseModel):
    plant_ids: List[int]

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str
    is_admin: bool
    role: str = "customer"
    is_primary: bool = False
    package_id: Optional[int] = None
    package_name: str = "Miễn phí"
    created_at: datetime
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class PackageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str] = None
    monthly_price: int
    chat_per_minute: int
    chat_per_day: int
    community_per_day: int
    discount_1m: int = 0
    discount_3m: int = 0
    discount_6m: int = 0
    discount_12m: int = 0
    duration_months: int = 1
    is_active: bool
    created_at: datetime

class PackageCreate(BaseModel):
    name: str
    description: Optional[str] = None
    monthly_price: int = 0
    chat_per_minute: int = 5
    chat_per_day: int = 30
    community_per_day: int = 3
    discount_1m: int = 0
    discount_3m: int = 0
    discount_6m: int = 0
    discount_12m: int = 0
    duration_months: int = 1
    is_active: bool = True

class PackageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    monthly_price: Optional[int] = None
    chat_per_minute: Optional[int] = None
    chat_per_day: Optional[int] = None
    community_per_day: Optional[int] = None
    discount_1m: Optional[int] = None
    discount_3m: Optional[int] = None
    discount_6m: Optional[int] = None
    discount_12m: Optional[int] = None
    duration_months: Optional[int] = None
    is_active: Optional[bool] = None

class UserPackageUpdate(BaseModel):
    package_id: int

class SubscribeRequest(BaseModel):
    package_id: int

class AuthResponse(BaseModel):
    token: str
    user: UserResponse

class CommunityMessageCreate(BaseModel):
    content: str

class CommunityMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: Optional[int]
    username: str
    content: str
    created_at: datetime

class CommunityMessageListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    items: List[CommunityMessageResponse]
    total: int
