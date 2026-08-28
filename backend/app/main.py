import os
from fastapi import FastAPI, HTTPException, Depends, Query, Header, Request, File, UploadFile, Form, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional, List
from contextlib import asynccontextmanager
from pydantic import BaseModel

from app.database import (
    get_db, get_engine, init_db, Plant, Tag, User, CommunityMessage, Package,
    PlantResponse, PlantListResponse, PlantCreate,
    TagResponse, ChatRequest, ChatResponse,
    UserCreate, UserLogin, UserResponse, AuthResponse,
    PackageResponse, PackageCreate, PackageUpdate, UserPackageUpdate, SubscribeRequest,
    CommunityMessageCreate, CommunityMessageResponse, CommunityMessageListResponse,
    get_free_package,
    SystemSetting, get_int_setting, set_int_setting, DEFAULT_SETTINGS,
    ensure_primary_admin,
)
from app.auth_utils import hash_password, verify_password, create_token, get_current_user, get_user_from_token
from app.chat_service import get_qa_chain
from app.rate_limit import check_rate_limit, check_daily_limit, get_daily_count
from app.search_utils import score_plant

qa_chain = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Apply migrations/settings and guarantee the protected primary admin exists.
    init_db()
    ensure_primary_admin()
    yield

app = FastAPI(
    lifespan=lifespan,
    title="Quan ly cay thuoc",
    description="Trang web co ban de quan ly cay thuoc",
    version="1.0.0",
)

# Mount static files for uploads (avatars)
os.makedirs("uploads/avatars", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Role-Based Access Control (RBAC) Configuration ──────────────────
ROLE_PERMISSIONS = {
    "administrator": {
        "user:read", "user:delete", "user:update_role", "user:update_package",
        "plant:create", "plant:update", "plant:delete",
        "package:create", "package:update", "package:delete",
        "settings:read", "settings:update"
    },
    "help": {
        "plant:create", "plant:update", "plant:delete"
    },
    "customer": set()
}

def check_permission(permission: str):
    def dependency(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
        user = get_current_user(authorization, db)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        user_perms = ROLE_PERMISSIONS.get(user.role, set())
        if permission not in user_perms:
            raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện hành động này")
        return user
    return dependency

@app.get("/")
def root():
    return {"message": "Quan ly cay thuoc API", "docs": "/docs"}

def get_chat_quota(user: Optional[User], db: Session, client_ip: Optional[str] = None) -> dict:
    """Return daily chat quota info for a (possibly anonymous) visitor."""
    if user:
        package = user.package if user and user.package else get_free_package(db)
        limit = package.chat_per_day
        used = get_daily_count(f"chat_day:user:{user.id}")
        return {
            "authenticated": True,
            "limit": limit,
            "used": used,
            "remaining": None if limit <= 0 else max(0, limit - used),
        }
    # Guests (not logged in) get an admin-adjustable daily limit, tracked per-IP.
    limit = get_int_setting(db, "guest_chat_per_day")
    used = get_daily_count(f"chat_day:ip:{client_ip or 'unknown'}")
    return {
        "authenticated": False,
        "limit": limit,
        "used": used,
        "remaining": None if limit <= 0 else max(0, limit - used),
    }


@app.get("/api/chat/quota")
def chat_quota(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(authorization, db)
    ip = request.client.host if request.client else "unknown"
    return get_chat_quota(user, db, ip)


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
    if user:
        rate_key = f"user:{user.id}"
    else:
        ip = request.client.host if request.client else "unknown"
        rate_key = f"ip:{ip}"

    if user:
        package = user.package if user.package else get_free_package(db)
        day_limit = package.chat_per_day
        minute_limit = package.chat_per_minute
        day_detail = f"Bạn đã đạt giới hạn {package.chat_per_day} lượt chat hôm nay. Hãy nâng cấp gói để tăng giới hạn."
    else:
        # Guests (not logged in) get an admin-adjustable daily message limit.
        day_limit = get_int_setting(db, "guest_chat_per_day")
        free_pkg = get_free_package(db)
        minute_limit = free_pkg.chat_per_minute
        day_detail = f"Khách chưa đăng nhập chỉ được dùng tối đa {day_limit} tin nhắn mỗi ngày. Đăng nhập để nhận giới hạn cao hơn."

    if not check_daily_limit(f"chat_day:{rate_key}", day_limit):
        raise HTTPException(status_code=429, detail=day_detail)
    if not check_rate_limit(f"chat_min:{rate_key}", minute_limit, 60):
        raise HTTPException(
            status_code=429,
            detail=f"Bạn đang hỏi quá nhanh (tối đa {minute_limit} lượt/phút). Vui lòng chờ một lát.",
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
    from datetime import datetime, timezone
    user = db.query(User).filter(User.username == data.username.strip()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return AuthResponse(token=create_token(user.id), user=user)

@app.get("/api/auth/me", response_model=UserResponse)
def me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@app.put("/api/auth/me", response_model=UserResponse)
async def update_profile(
    username: str = Form(...),
    email: str = Form(...),
    full_name: Optional[str] = Form(None),
    avatar: Optional[UploadFile] = File(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    user = get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    username = username.strip()
    email = email.strip().lower()
    if not username or not email:
        raise HTTPException(status_code=400, detail="Username and email are required")
        
    # Check if username or email is already taken by another user
    existing = db.query(User).filter((User.username == username) | (User.email == email)).all()
    for u in existing:
        if u.id != user.id:
            raise HTTPException(status_code=400, detail="Username or email already in use")
            
    user.username = username
    user.email = email
    user.full_name = full_name
    
    if avatar:
        os.makedirs("uploads/avatars", exist_ok=True)
        filename = f"{user.id}_{avatar.filename}"
        filepath = os.path.join("uploads/avatars", filename)
        with open(filepath, "wb") as buffer:
            content = await avatar.read()
            buffer.write(content)
        user.avatar_url = f"/uploads/avatars/{filename}"
        
    db.commit()
    db.refresh(user)
    return user

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

@app.put("/api/auth/password")
def change_password(
    data: PasswordChangeRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    user = get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không chính xác")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 6 ký tự")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}

# ── Community WebSocket Manager ──────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

@app.websocket("/api/community/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = None, db: Session = Depends(get_db)):
    user = None
    if token:
        user = get_user_from_token(token, db)
        
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            content = data.get("content", "").strip()
            if not content:
                continue
                
            if not user:
                await websocket.send_json({"type": "error", "error": "Bạn cần đăng nhập để gửi tin nhắn."})
                continue
                
            package = user.package if user.package else get_free_package(db)
            if not check_daily_limit(f"community_day:user:{user.id}", package.community_per_day):
                await websocket.send_json({
                    "type": "error",
                    "error": f"Bạn đã đạt giới hạn {package.community_per_day} bài đăng hôm nay. Hãy nâng cấp gói để tăng giới hạn."
                })
                continue
                
            if len(content) > 2000:
                await websocket.send_json({"type": "error", "error": "Tin nhắn quá dài (tối đa 2000 ký tự)"})
                continue
                
            msg = CommunityMessage(user_id=user.id, username=user.username, content=content)
            db.add(msg)
            db.commit()
            db.refresh(msg)
            
            await manager.broadcast({
                "type": "message",
                "message": {
                    "id": msg.id,
                    "user_id": msg.user_id,
                    "username": msg.username,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat()
                }
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

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
async def create_community_message(
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
    
    # Also broadcast POST messages via websocket for dual compatibility
    await manager.broadcast({
        "type": "message",
        "message": {
            "id": message.id,
            "user_id": message.user_id,
            "username": message.username,
            "content": message.content,
            "created_at": message.created_at.isoformat()
        }
    })
    return message


@app.get("/api/community/stats")
def community_stats(db: Session = Depends(get_db)):
    """Public stats: participant count reflects the number of registered (loggable) accounts."""
    members = db.query(User).filter(User.is_active == True).count()
    total_messages = db.query(CommunityMessage).count()
    return {"members": members, "total_messages": total_messages}

# ── User management (admin) ─────────────────────────────────────────

@app.get("/api/users", response_model=List[UserResponse])
def list_users(admin: User = Depends(check_permission("user:read")), db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.desc()).all()

@app.delete("/api/users/{user_id}", status_code=204)
def delete_user(user_id: int, admin: User = Depends(check_permission("user:delete")), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_primary:
        raise HTTPException(status_code=403, detail="Không thể xoá tài khoản quản trị viên chính (primary admin)")
    if user.role == "administrator":
        raise HTTPException(status_code=400, detail="Cannot delete an administrator account")
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
    if tag:
        query = query.join(Plant.tags).filter(Tag.tag_name == tag)
    
    if search:
        # Fetch candidate plants and score them in Python for diacritics/partial fuzzy matching
        all_plants = query.all()
        scored_plants = []
        for p in all_plants:
            score = score_plant(p, search)
            if score > 0:
                scored_plants.append((p, score))
        
        # Sort by match score descending
        scored_plants.sort(key=lambda x: x[1], reverse=True)
        
        total = len(scored_plants)
        start = (page - 1) * page_size
        end = start + page_size
        items = [p for p, score in scored_plants[start:end]]
    else:
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        
    return PlantListResponse(items=items, total=total, page=page, page_size=page_size)

@app.post("/api/plants", response_model=PlantResponse, status_code=201)
def create_plant(data: PlantCreate, user: User = Depends(check_permission("plant:create")), db: Session = Depends(get_db)):
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
def update_plant(plant_id: int, data: PlantCreate, user: User = Depends(check_permission("plant:update")), db: Session = Depends(get_db)):
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(plant, key, value)
    db.commit()
    db.refresh(plant)
    return plant

@app.delete("/api/plants/{plant_id}", status_code=204)
def delete_plant(plant_id: int, user: User = Depends(check_permission("plant:delete")), db: Session = Depends(get_db)):
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
    if not (admin and admin.role == "administrator"):
        query = query.filter(Package.is_active == True)
    return query.order_by(Package.monthly_price.asc()).all()

@app.post("/api/packages", response_model=PackageResponse, status_code=201)
def create_package(data: PackageCreate, admin: User = Depends(check_permission("package:create")), db: Session = Depends(get_db)):
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Package name is required")
    existing = db.query(Package).filter(Package.name == name, Package.duration_months == data.duration_months).first()
    if existing:
        raise HTTPException(status_code=400, detail="Package with this name and duration already exists")
    package = Package(**data.model_dump())
    db.add(package)
    db.commit()
    db.refresh(package)
    return package

@app.put("/api/packages/{package_id}", response_model=PackageResponse)
def update_package(package_id: int, data: PackageUpdate, admin: User = Depends(check_permission("package:update")), db: Session = Depends(get_db)):
    package = db.query(Package).filter(Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(package, key, value)
    db.commit()
    db.refresh(package)
    return package

@app.delete("/api/packages/{package_id}", status_code=204)
def delete_package(package_id: int, admin: User = Depends(check_permission("package:delete")), db: Session = Depends(get_db)):
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
def set_user_package(user_id: int, data: UserPackageUpdate, admin: User = Depends(check_permission("user:update_package")), db: Session = Depends(get_db)):
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

class UserRoleUpdate(BaseModel):
    role: str

@app.put("/api/users/{user_id}/role", response_model=UserResponse)
def set_user_role(user_id: int, data: UserRoleUpdate, admin: User = Depends(check_permission("user:update_role")), db: Session = Depends(get_db)):
    if data.role not in ["administrator", "customer", "help"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_primary:
        raise HTTPException(status_code=403, detail="Không thể thay đổi vai trò của tài khoản quản trị viên chính (primary admin)")
    if user.id == admin.id and data.role != "administrator":
        raise HTTPException(status_code=400, detail="Cannot demote yourself from administrator")
    user.role = data.role
    user.is_admin = (data.role == "administrator")
    db.commit()
    db.refresh(user)
    return user

# ── System settings (admin) ──────────────────────────────────────────

@app.get("/api/admin/settings")
def get_admin_settings(admin: User = Depends(check_permission("settings:read")), db: Session = Depends(get_db)):
    return {
        key: get_int_setting(db, key)
        for key in DEFAULT_SETTINGS
    }

class GuestChatLimitUpdate(BaseModel):
    guest_chat_per_day: int

@app.put("/api/admin/settings/guest-chat-limit", response_model=dict)
def update_guest_chat_limit(
    data: GuestChatLimitUpdate,
    admin: User = Depends(check_permission("settings:update")),
    db: Session = Depends(get_db),
):
    """Adjust the daily chat message limit applied to users who are not logged in."""
    if data.guest_chat_per_day < 0:
        raise HTTPException(status_code=400, detail="Giới hạn phải là số không âm (0 = không giới hạn)")
    set_int_setting(db, "guest_chat_per_day", data.guest_chat_per_day)
    return {"guest_chat_per_day": data.guest_chat_per_day}
