import os
from fastapi import FastAPI, HTTPException, Depends, Query, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional, List
from contextlib import asynccontextmanager

from database import (
    get_db, Plant, Tag, User, CommunityMessage, Package,
    PlantResponse, PlantListResponse, PlantCreate,
    TagResponse, ChatRequest, ChatResponse,
    UserCreate, UserLogin, UserResponse, AuthResponse,
    PackageResponse, PackageCreate, PackageUpdate, UserPackageUpdate, SubscribeRequest,
    CommunityMessageCreate, CommunityMessageResponse, CommunityMessageListResponse,
    get_free_package,
)
from auth_utils import hash_password, verify_password, create_token, get_current_user
from chat_service import get_qa_chain
from rate_limit import check_rate_limit, check_daily_limit

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
def post_chat(
    req: ChatRequest,
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    global qa_chain
    if qa_chain is None:
        qa_chain = get_qa_chain()
    if qa_chain is None:
        raise HTTPException(status_code=503, detail="Chat service is not available (vector DB not initialized)")

    user = get_current_user(authorization, db)
    package = user.package if user and user.package else get_free_package(db)
    if user:
        rate_key = f"user:{user.id}"
    else:
        ip = request.client.host if request.client else "unknown"
        rate_key = f"ip:{ip}"

    if not check_daily_limit(f"chat_day:{rate_key}", package.chat_per_day):
        raise HTTPException(
            status_code=429,
            detail=f"Bạn đã đạt giới hạn {package.chat_per_day} lượt chat hôm nay. Hãy nâng cấp gói để tăng giới hạn.",
        )
    if not check_rate_limit(f"chat_min:{rate_key}", package.chat_per_minute, 60):
        raise HTTPException(
            status_code=429,
            detail=f"Bạn đang hỏi quá nhanh (tối đa {package.chat_per_minute} lượt/phút). Vui lòng chờ một lát.",
        )

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
    free_pkg = get_free_package(db)
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(data.password),
        package_id=free_pkg.id if free_pkg.id else None,
    )
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
    after_id: Optional[int] = Query(None, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(CommunityMessage)
    if after_id is not None:
        query = query.filter(CommunityMessage.id > after_id)
    total = query.count()
    if after_id is not None:
        items = (
            query.order_by(CommunityMessage.id.asc())
            .limit(page_size)
            .all()
        )
    else:
        items = (
            query.order_by(CommunityMessage.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        items = list(reversed(items))  # newest last
    return CommunityMessageListResponse(items=items, total=total)

@app.post("/api/community/messages", response_model=CommunityMessageResponse, status_code=201)
def create_community_message(
    data: CommunityMessageCreate,
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Please login to post a message")
    package = user.package if user.package else get_free_package(db)
    if not check_daily_limit(f"community_day:user:{user.id}", package.community_per_day):
        raise HTTPException(
            status_code=429,
            detail=f"Bạn đã đạt giới hạn {package.community_per_day} bài đăng hôm nay. Hãy nâng cấp gói để tăng giới hạn.",
        )
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
def create_plant(data: PlantCreate, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    admin = get_current_user(authorization, db)
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
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
def update_plant(plant_id: int, data: PlantCreate, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    admin = get_current_user(authorization, db)
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(plant, key, value)
    db.commit()
    db.refresh(plant)
    return plant

@app.delete("/api/plants/{plant_id}", status_code=204)
def delete_plant(plant_id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    admin = get_current_user(authorization, db)
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
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

# ── Packages (subscription tiers) ───────────────────────────────────

@app.get("/api/packages", response_model=List[PackageResponse])
def list_packages(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    admin = get_current_user(authorization, db)
    query = db.query(Package)
    if not (admin and admin.is_admin):
        query = query.filter(Package.is_active == True)
    return query.order_by(Package.monthly_price.asc()).all()

@app.post("/api/packages", response_model=PackageResponse, status_code=201)
def create_package(data: PackageCreate, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    admin = get_current_user(authorization, db)
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Package name is required")
    existing = db.query(Package).filter(Package.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Package name already exists")
    package = Package(**data.model_dump())
    db.add(package)
    db.commit()
    db.refresh(package)
    return package

@app.put("/api/packages/{package_id}", response_model=PackageResponse)
def update_package(package_id: int, data: PackageUpdate, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    admin = get_current_user(authorization, db)
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    package = db.query(Package).filter(Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(package, key, value)
    db.commit()
    db.refresh(package)
    return package

@app.delete("/api/packages/{package_id}", status_code=204)
def delete_package(package_id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    admin = get_current_user(authorization, db)
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    package = db.query(Package).filter(Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    if package.name == "Miễn phí":
        raise HTTPException(status_code=400, detail="Cannot delete the free package")
    in_use = db.query(User).filter(User.package_id == package_id).count()
    if in_use:
        package.is_active = False
        db.commit()
        raise HTTPException(status_code=400, detail=f"Package is used by {in_use} user(s). It was deactivated instead.")
    db.delete(package)
    db.commit()
    return None

@app.post("/api/me/package", response_model=UserResponse)
def subscribe_package(data: SubscribeRequest, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Please login to choose a package")
    package = db.query(Package).filter(Package.id == data.package_id).first()
    if not package or not package.is_active:
        raise HTTPException(status_code=404, detail="Package not found")
    user.package_id = package.id
    db.commit()
    db.refresh(user)
    return user

@app.put("/api/users/{user_id}/package", response_model=UserResponse)
def set_user_package(user_id: int, data: UserPackageUpdate, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    admin = get_current_user(authorization, db)
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    package = db.query(Package).filter(Package.id == data.package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    user.package_id = package.id
    db.commit()
    db.refresh(user)
    return user
