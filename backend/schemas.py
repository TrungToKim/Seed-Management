from pydantic import BaseModel
from typing import List, Optional

class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    status: str
    answer: str
    sources: List[str] = []

class TagResponse(BaseModel):
    id:int
    category: str
    tag_name: str

class PlantDetailResponse(BaseModel):
    id: int
    section_type: str
    content: str
    source_reference: Optional[str] = None

class PlantResponse(BaseModel):
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
    items: List[PlantResponse]
    total: int
    page: int
    page_size: int
