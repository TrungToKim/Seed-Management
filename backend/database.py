import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, Column, Integer, String, Text, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False

load_dotenv()

SQLALCHEMY_URL = os.getenv("DB_URL") or os.getenv("DATABASE_URL")
if SQLALCHEMY_URL and SQLALCHEMY_URL.startswith("postgresql://"):
    SQLALCHEMY_URL = SQLALCHEMY_URL.replace("postgresql://", "postgresql+psycopg2://")

engine = None
SessionLocal = None
Base = declarative_base()


_db_initialized = False

def get_engine():
    global engine, SessionLocal
    if engine is None and SQLALCHEMY_URL:
        engine = create_engine(SQLALCHEMY_URL, connect_args={"connect_timeout": 5})
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
]

PACKAGE_MIGRATION_SQL = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS package_id INTEGER',
    """DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_package_id') THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_package_id FOREIGN KEY (package_id) REFERENCES packages(id);
      END IF;
    END $$;""",
]


def migrate_db():
    eng = get_engine()
    if eng is None:
        return
    try:
        with eng.begin() as conn:
            for statement in USER_MIGRATION_SQL:
                conn.execute(text(statement))
        print("Database migrations applied.")
    except Exception as e:
        print(f"Warning: Could not apply migrations: {e}")
    try:
        with eng.begin() as conn:
            for statement in PACKAGE_MIGRATION_SQL:
                conn.execute(text(statement))
        print("Package migrations applied.")
    except Exception as e:
        print(f"Warning: Could not apply package migrations: {e}")


DEFAULT_PACKAGES = [
    {
        "name": "Miễn phí",
        "description": "Gói cơ bản dành cho người dùng mới. Đủ để trải nghiệm tra cứu cây thuốc.",
        "monthly_price": 0,
        "chat_per_minute": 5,
        "chat_per_day": 30,
        "community_per_day": 3,
    },
    {
        "name": "Cơ bản",
        "description": "Gói phổ biến cho người dùng thường xuyên, tăng gấp đôi lượt hỏi đáp AI.",
        "monthly_price": 50000,
        "chat_per_minute": 10,
        "chat_per_day": 100,
        "community_per_day": 10,
    },
    {
        "name": "Premium",
        "description": "Gói cao cấp, không giới hạn lượt chat trong ngày và ưu tiên tốc độ phản hồi.",
        "monthly_price": 150000,
        "chat_per_minute": 30,
        "chat_per_day": 0,
        "community_per_day": 50,
    },
]


def ensure_default_packages():
    eng = get_engine()
    if eng is None or SessionLocal is None:
        return
    db = SessionLocal()
    try:
        for pkg in DEFAULT_PACKAGES:
            exists = db.query(Package).filter(Package.name == pkg["name"]).first()
            if not exists:
                db.add(Package(**pkg))
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

class Plant(Base):
    __tablename__ = "plants"
    id = Column(Integer, primary_key=True, index=True)
    common_name = Column(String(255), index=True)
    scientific_name = Column(String(255))
    family = Column(String(100))
    region = Column(String(100))
    image_url = Column(String(2048), nullable=True)
    description = Column(Text)
    tags = relationship("Tag", secondary="plant_tags", back_populates="plants")
    details = relationship("PlantDetail", back_populates="plant")

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
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    monthly_price = Column(Integer, default=0, nullable=False)
    chat_per_minute = Column(Integer, default=5, nullable=False)
    chat_per_day = Column(Integer, default=30, nullable=False)
    community_per_day = Column(Integer, default=3, nullable=False)
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

class PlantCreate(BaseModel):
    common_name: str
    scientific_name: Optional[str] = None
    family: Optional[str] = None
    region: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None

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
    tags: List[TagResponse] = []
    details: List[PlantDetailResponse] = []

class PlantListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    items: List[PlantResponse]
    total: int
    page: int
    page_size: int

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
    package_id: Optional[int] = None
    package_name: str = "Miễn phí"
    created_at: datetime

class PackageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str] = None
    monthly_price: int
    chat_per_minute: int
    chat_per_day: int
    community_per_day: int
    is_active: bool
    created_at: datetime

class PackageCreate(BaseModel):
    name: str
    description: Optional[str] = None
    monthly_price: int = 0
    chat_per_minute: int = 5
    chat_per_day: int = 30
    community_per_day: int = 3
    is_active: bool = True

class PackageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    monthly_price: Optional[int] = None
    chat_per_minute: Optional[int] = None
    chat_per_day: Optional[int] = None
    community_per_day: Optional[int] = None
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
