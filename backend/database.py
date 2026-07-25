import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base
from pgvector.sqlalchemy import Vector
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

load_dotenv()

SQLALCHEMY_URL = os.getenv("DB_URL")
if SQLALCHEMY_URL and SQLALCHEMY_URL.startswith("postgresql://"):
    SQLALCHEMY_URL = SQLALCHEMY_URL.replace("postgresql://", "postgresql+psycopg2://")

engine = create_engine(SQLALCHEMY_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()
    except Exception as e:
        print(f"Warning: Could not create vector extension: {e}")
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Could not create all tables: {e}")
        tables_to_create = [t for name, t in Base.metadata.tables.items() if name != "vector_chunks"]
        for table in tables_to_create:
            try:
                table.create(bind=engine, checkfirst=True)
            except Exception:
                pass

class Plant(Base):
    __tablename__ = "plants"
    id = Column(Integer, primary_key=True, index=True)
    common_name = Column(String(100), index=True)
    scientific_name = Column(String(100))
    family = Column(String(100))
    region = Column(String(100))
    image_url = Column(String(256), nullable=True)
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
    vector_chunks = relationship("VectorChunk", back_populates="plant_detail")

class VectorChunk(Base):
    __tablename__ = "vector_chunks"
    id = Column(Integer, primary_key=True, index=True)
    plant_detail_id = Column(Integer, ForeignKey("plant_details.id"))
    chunk_text = Column(Text)
    embedding_vector = Column(Vector(768))
    plant_detail = relationship("PlantDetail", back_populates="vector_chunks")

class ChatRequest(BaseModel):
    query: str

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
