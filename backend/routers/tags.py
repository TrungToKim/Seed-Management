from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Tag
from schemas import TagResponse
from typing import List

router = APIRouter(prefix="/api/tags",tags=["Tags"])

@router.get("",response_model=List[TagResponse])
def list_tags(category: str = None, db: Session= Depends(get_db)):
    query = db.query(Tag)
    if category:
        query = query.filter(Tag.category == category)
    return query.all()
