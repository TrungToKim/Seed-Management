from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional, List
from contextlib import asynccontextmanager

from database import (
    init_db, get_db, Plant, Tag,
    PlantResponse, PlantListResponse, PlantCreate,
    TagResponse, ChatRequest, ChatResponse,
)
from chat_service import get_qa_chain

qa_chain = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global qa_chain
    init_db()
    qa_chain = get_qa_chain()
    yield

app = FastAPI(
    lifespan=lifespan,
    title="Quan ly cay thuoc",
    description="Trang web co ban de quan ly cay thuoc",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/chat", response_model=ChatResponse)
def post_chat(req: ChatRequest):
    if qa_chain is None:
        raise HTTPException(status_code=503, detail="Chat service is not available (vector DB not initialized)")
    try:
        result = qa_chain.invoke({"query": req.query})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat service error: {str(e)}")
    sources = list(set(
        doc.metadata.get("source", "Unknown")
        for doc in result["source_documents"]
    ))
    return ChatResponse(
        status="success",
        answer=result["result"],
        sources=sources,
    )

# ── Plants CRUD ──────────────────────────────────────────────────────

@app.get("/api/plants", response_model=PlantListResponse)
def list_plants(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    tag: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Plant)
    if search:
        query = query.filter(Plant.common_name.ilike(f"%{search}%"))
    if tag:
        query = query.join(Plant.tags).filter(Tag.tag_name == tag)
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return PlantListResponse(items=items, total=total, page=page, page_size=page_size)

@app.post("/api/plants", response_model=PlantResponse, status_code=201)
def create_plant(data: PlantCreate, db: Session = Depends(get_db)):
    plant = Plant(**data.model_dump())
    db.add(plant)
    db.commit()
    db.refresh(plant)
    return plant

@app.get("/api/plants/{plant_id}", response_model=PlantResponse)
def get_plant(plant_id: int, db: Session = Depends(get_db)):
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant

@app.put("/api/plants/{plant_id}", response_model=PlantResponse)
def update_plant(plant_id: int, data: PlantCreate, db: Session = Depends(get_db)):
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    for key, value in data.model_dump().items():
        setattr(plant, key, value)
    db.commit()
    db.refresh(plant)
    return plant

@app.delete("/api/plants/{plant_id}", status_code=204)
def delete_plant(plant_id: int, db: Session = Depends(get_db)):
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    db.delete(plant)
    db.commit()
    return None

# ── Tags ─────────────────────────────────────────────────────────────

@app.get("/api/tags", response_model=List[TagResponse])
def list_tags(category: str = None, db: Session = Depends(get_db)):
    query = db.query(Tag)
    if category:
        query = query.filter(Tag.category == category)
    return query.all()
