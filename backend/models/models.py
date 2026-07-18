from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import vector
from database import Base

class Plant(Base):
    __tablename__ = "plants"  # Đặt tên bảng rõ ràng

    id = Column(Integer, primary_key=True, index=True)
    common_name = Column(String(100), index=True)
    scientific_name = Column(String(100))
    family = Column(String(100))
    region = Column(String(100))
    image_url = Column(String(256), nullable=True)
    description = Column(Text)

    # Mối quan hệ với các tag
    tags = relationship("Tag", secondary="plant_tags", back_populates="plants")
    # Mối quan hệ với các chi tiết (bài thuốc, cách dùng...)
    details = relationship("PlantDetail", back_populates="plant")

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50)) # VD: 'Benh', 'Bo_phan'
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
    section_type = Column(String(50)) # 'cong_dung', 'cach_dung', 'bai_thuoc'
    content = Column(Text)
    source_reference = Column(String(255))

    plant = relationship("Plant", back_populates="details")

class VectorChunk(Base):
    __tablename__ = "vector_chunks"
    id = Column(Integer, primary_key=True,index=True)
    plant_detail_id = Column(Integer, ForeignKey("plant_detail_id"))
    chucnk_text = Column(Text)
    embedding_vector = Column(vector(1536))