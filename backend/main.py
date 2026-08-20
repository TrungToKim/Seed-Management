import os
import time
import hashlib
import hmac
import secrets
from fastapi import FastAPI, HTTPException, Depends, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional, List
from contextlib import asynccontextmanager

from database import (
    get_db, Plant, Tag, User, CommunityMessage,
    PlantResponse, PlantListResponse, PlantCreate,
    TagResponse, ChatRequest, ChatResponse,
    UserCreate, UserLogin, UserResponse, AuthResponse,
    CommunityMessageCreate, CommunityMessageResponse, CommunityMessageListResponse,
)
from chat_service import get_qa_chain

AUTH_SECRET = os.getenv("AUTH_SECRET", "dev-secret-change-me-in-production")
PASSWORD_ITERATIONS = 200_000
TOKEN_TTL = 7 * 24 * 60 * 60  # 7 days

# ── Auth helpers ────────────────────────────────────────────────────

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
    if not token:
        return None
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

qa_chain = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    lifespan=lifespan,
    title="Quan ly cay thuoc",
    description="Trang web co ban de quan ly cay thuoc",
    version="1.0.0",
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Quan ly cay thuoc API", "docs": "/docs"}

@app.post("/api/chat", response_model=ChatResponse)
def post_chat(req: ChatRequest):
    global qa_chain
    if qa_chain is None:
        qa_chain = get_qa_chain()
    if qa_chain is None:
        raise HTTPException(status_code=503, detail="Chat service is not available (vector DB not initialized)")
    try:
        result = qa_chain.invoke({"question": req.query, "history": req.history})
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

# ── Auth ────────────────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=AuthResponse, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    username = data.username.strip()
    email = data.email.strip().lower()
    if not username or not email or not data.password:
        raise HTTPException(status_code=400, detail="Username, email and password are required")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    existing = db.query(User).filter((User.username == username) | (User.email == email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    user = User(username=username, email=email, password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(token=create_token(user.id), user=user)

@app.post("/api/auth/login", response_model=AuthResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username.strip()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return AuthResponse(token=create_token(user.id), user=user)

@app.get("/api/auth/me", response_model=UserResponse)
def me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# ── Community ───────────────────────────────────────────────────────

@app.get("/api/community/messages", response_model=CommunityMessageListResponse)
def list_community_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    total = db.query(CommunityMessage).count()
    items = (
        db.query(CommunityMessage)
        .order_by(CommunityMessage.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = list(reversed(items))  # newest last
    return CommunityMessageListResponse(items=items, total=total)

@app.post("/api/community/messages", response_model=CommunityMessageResponse, status_code=201)
def create_community_message(
    data: CommunityMessageCreate,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Please login to post a message")
    content = data.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(content) > 2000:
        raise HTTPException(status_code=400, detail="Message is too long (max 2000 characters)")
    message = CommunityMessage(user_id=user.id, username=user.username, content=content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

# ── User management (admin) ─────────────────────────────────────────

@app.get("/api/users", response_model=List[UserResponse])
def list_users(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    admin = get_current_user(authorization, db)
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return db.query(User).order_by(User.created_at.desc()).all()

@app.delete("/api/users/{user_id}", status_code=204)
def delete_user(user_id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    admin = get_current_user(authorization, db)
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot delete an admin account")
    db.delete(user)
    db.commit()
    return None

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
