from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Plant, Tag
from schemas import PlantResponse, PlantListResponse
from typing import Optional

router = APIRouter(prefix="/api/plants", tags=["Plants"])

@router.get("", response_model=PlantListResponse)
def list_plants(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    tag: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Plant)
    if search:
        query = query.filter(Plant.common_name.ilike(f"%{search}%"))
    if tag:
        query = query.join(Plant.tags).filter(Tag.tag_name == tag)
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return PlantListResponse(items=items, total=total, page=page, page_size=page_size)

@router.get("/{plant_id}", response_model=PlantResponse)
def get_plant(plant_id: int, db: Session = Depends(get_db)):
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant