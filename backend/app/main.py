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
    PlantImage, PlantReference, UserFavorite, Article, SearchLog, slugify,
    PlantResponse, PlantListResponse, PlantCreate, PlantImageResponse, PlantReferenceResponse,
    TagResponse, ChatRequest, ChatResponse,
    UserCreate, UserLogin, UserResponse, AuthResponse,
    PackageResponse, PackageCreate, PackageUpdate, UserPackageUpdate, SubscribeRequest,
    CommunityMessageCreate, CommunityMessageResponse, CommunityMessageListResponse,
    ArticleResponse, ArticleCreate, ArticleListResponse, FavoriteSyncRequest,
    get_free_package,
    SystemSetting, get_int_setting, set_int_setting, DEFAULT_SETTINGS,
    ensure_primary_admin, populate_plant_slugs_and_seeds
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

# Base directory for reliable relative file paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)

# Mount static files for uploads (avatars)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
origins = [o.strip() for o in raw_origins if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
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

@app.websocket("/api/chat/ws")
async def chat_websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    global qa_chain
    if qa_chain is None:
        qa_chain = get_qa_chain()
        
    await websocket.accept()
    
    if qa_chain is None:
        await websocket.send_json({"type": "error", "error": "Dịch vụ chat không khả dụng (vector DB chưa được khởi tạo)."})
        await websocket.close()
        return

    user = None
    if token:
        user = get_user_from_token(token, db)

    ip = websocket.client.host if websocket.client else "unknown"
    
    # Gửi quota ban đầu
    quota_info = get_chat_quota(user, db, ip)
    await websocket.send_json({"type": "quota", "quota": quota_info})

    try:
        while True:
            data = await websocket.receive_json()
            query = data.get("query", "").strip()
            history_data = data.get("history", [])
            
            if not query:
                continue
                
            if user:
                user = db.merge(user)
                db.refresh(user)
                rate_key = f"user:{user.id}"
            else:
                rate_key = f"ip:{ip}"
                
            if user:
                package = user.package if user.package else get_free_package(db)
                day_limit = package.chat_per_day
                minute_limit = package.chat_per_minute
                day_detail = f"Bạn đã đạt giới hạn {package.chat_per_day} lượt chat hôm nay. Hãy nâng cấp gói để tăng giới hạn."
            else:
                day_limit = get_int_setting(db, "guest_chat_per_day")
                free_pkg = get_free_package(db)
                minute_limit = free_pkg.chat_per_minute
                day_detail = f"Khách chưa đăng nhập chỉ được dùng tối đa {day_limit} tin nhắn mỗi ngày. Đăng nhập để nhận giới hạn cao hơn."
                
            if not check_daily_limit(f"chat_day:{rate_key}", day_limit):
                await websocket.send_json({"type": "error", "error": day_detail})
                continue
                
            if not check_rate_limit(f"chat_min:{rate_key}", minute_limit, 60):
                await websocket.send_json({
                    "type": "error",
                    "error": f"Bạn đang hỏi quá nhanh (tối đa {minute_limit} lượt/phút). Vui lòng chờ một lát."
                })
                continue
                
            try:
                result = qa_chain.invoke({"question": query, "history": history_data})
                sources = list(set(
                    doc.metadata.get("source", "Unknown")
                    for doc in result["source_documents"]
                ))
                
                await websocket.send_json({
                    "type": "answer",
                    "answer": result["result"],
                    "sources": sources,
                })
                
                updated_quota = get_chat_quota(user, db, ip)
                await websocket.send_json({"type": "quota", "quota": updated_quota})
                
            except Exception as e:
                await websocket.send_json({"type": "error", "error": f"Lỗi dịch vụ chat: {str(e)}"})
                
    except WebSocketDisconnect:
        pass
    except Exception:
        pass

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
    
    if avatar and avatar.filename:
        import time
        ext = os.path.splitext(avatar.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
            ext = ".jpg"
        filename = f"{user.id}_{int(time.time())}{ext}"
        filepath = os.path.join(AVATAR_DIR, filename)
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

# ── Plants CRUD & Exploration ────────────────────────────────────────

@app.get("/api/plants", response_model=PlantListResponse)
def list_plants(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    tag: Optional[str] = None,
    family: Optional[str] = None,
    used_part: Optional[str] = None,
    region: Optional[str] = None,
    sort_by: Optional[str] = None,
    featured: Optional[bool] = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(authorization, db)
    fav_ids = set()
    if user:
        fav_ids = set(f.plant_id for f in db.query(UserFavorite).filter(UserFavorite.user_id == user.id).all())

    query = db.query(Plant)
    if tag:
        query = query.join(Plant.tags).filter(Tag.tag_name == tag)
    if family:
        query = query.filter(Plant.family.ilike(f"%{family}%"))
    if used_part:
        query = query.filter(Plant.used_parts.ilike(f"%{used_part}%"))
    if region:
        query = query.filter(Plant.region.ilike(f"%{region}%"))
    if featured is not None:
        query = query.filter(Plant.featured == featured)

    if search and search.strip():
        s_clean = search.strip()
        try:
            db.add(SearchLog(query=s_clean, user_id=user.id if user else None))
            db.commit()
        except Exception:
            db.rollback()

        all_plants = query.all()
        scored_plants = []
        for p in all_plants:
            score = score_plant(p, s_clean)
            if score > 0:
                scored_plants.append((p, score))
        scored_plants.sort(key=lambda x: x[1], reverse=True)
        total = len(scored_plants)
        start = (page - 1) * page_size
        end = start + page_size
        items = [p for p, s in scored_plants[start:end]]
    else:
        if sort_by == "name_asc":
            query = query.order_by(Plant.common_name.asc())
        elif sort_by == "name_desc":
            query = query.order_by(Plant.common_name.desc())
        elif sort_by == "popular":
            query = query.order_by(Plant.views_count.desc(), Plant.id.desc())
        elif sort_by == "newest":
            query = query.order_by(Plant.id.desc())
        else:
            query = query.order_by(Plant.id.asc())

        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()

    for item in items:
        item.is_favorite = item.id in fav_ids

    return PlantListResponse(items=items, total=total, page=page, page_size=page_size)

@app.get("/api/plants/autocomplete")
def autocomplete_plants(q: str = Query("", min_length=1), db: Session = Depends(get_db)):
    if not q.strip():
        return []
    s_clean = q.strip()
    plants = db.query(Plant).all()
    matches = []
    for p in plants:
        score = score_plant(p, s_clean)
        if score > 0:
            matches.append((p, score))
    matches.sort(key=lambda x: x[1], reverse=True)
    results = []
    for p, _ in matches[:8]:
        results.append({
            "id": p.id,
            "common_name": p.common_name,
            "scientific_name": p.scientific_name,
            "family": p.family,
            "slug": p.slug or str(p.id),
            "image_url": p.image_url
        })
    return results

@app.get("/api/plants/featured", response_model=List[PlantResponse])
def get_featured_plants(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = get_current_user(authorization, db)
    fav_ids = set()
    if user:
        fav_ids = set(f.plant_id for f in db.query(UserFavorite).filter(UserFavorite.user_id == user.id).all())

    plants = db.query(Plant).filter(Plant.featured == True).all()
    if not plants:
        plants = db.query(Plant).order_by(Plant.views_count.desc(), Plant.id.desc()).limit(8).all()

    for p in plants:
        p.is_favorite = p.id in fav_ids
    return plants

@app.get("/api/filters/options")
def get_filter_options(db: Session = Depends(get_db)):
    families = [f[0] for f in db.query(Plant.family).distinct().all() if f[0]]
    tags = [t.tag_name for t in db.query(Tag).all()]
    regions = [r[0] for r in db.query(Plant.region).distinct().all() if r[0]]
    raw_parts = [p[0] for p in db.query(Plant.used_parts).distinct().all() if p[0]]
    parts_set = set()
    for rp in raw_parts:
        for part in rp.replace(",", ";").split(";"):
            p_clean = part.strip()
            if p_clean:
                parts_set.add(p_clean)
    return {
        "families": sorted(families),
        "tags": sorted(tags),
        "used_parts": sorted(list(parts_set)),
        "regions": sorted(regions),
    }

@app.get("/api/plants/{id_or_slug}", response_model=PlantResponse)
def get_plant_detail(id_or_slug: str, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    plant = None
    if id_or_slug.isdigit():
        plant = db.query(Plant).filter(Plant.id == int(id_or_slug)).first()
    if not plant:
        plant = db.query(Plant).filter(Plant.slug == id_or_slug).first()

    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")

    plant.views_count = (plant.views_count or 0) + 1
    db.commit()
    db.refresh(plant)

    user = get_current_user(authorization, db)
    if user:
        fav = db.query(UserFavorite).filter(UserFavorite.user_id == user.id, UserFavorite.plant_id == plant.id).first()
        plant.is_favorite = bool(fav)
    else:
        plant.is_favorite = False

    return plant

@app.get("/api/plants/{id_or_slug}/related", response_model=List[PlantResponse])
def get_related_plants(id_or_slug: str, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    plant = None
    if id_or_slug.isdigit():
        plant = db.query(Plant).filter(Plant.id == int(id_or_slug)).first()
    if not plant:
        plant = db.query(Plant).filter(Plant.slug == id_or_slug).first()

    if not plant:
        return []

    tag_ids = [t.id for t in plant.tags]
    related_query = db.query(Plant).filter(Plant.id != plant.id)

    candidates = []
    if plant.family:
        same_family = related_query.filter(Plant.family == plant.family).all()
        candidates.extend(same_family)

    if tag_ids:
        same_tag = db.query(Plant).join(Plant.tags).filter(Plant.id != plant.id, Tag.id.in_(tag_ids)).all()
        candidates.extend(same_tag)

    if len(candidates) < 4:
        others = related_query.order_by(Plant.views_count.desc()).limit(6).all()
        candidates.extend(others)

    seen = set()
    result = []
    for c in candidates:
        if c.id not in seen and c.id != plant.id:
            seen.add(c.id)
            result.append(c)

    user = get_current_user(authorization, db)
    fav_ids = set()
    if user:
        fav_ids = set(f.plant_id for f in db.query(UserFavorite).filter(UserFavorite.user_id == user.id).all())

    for r in result[:6]:
        r.is_favorite = r.id in fav_ids

    return result[:6]

@app.post("/api/plants", response_model=PlantResponse, status_code=201)
def create_plant(data: PlantCreate, user: User = Depends(check_permission("plant:create")), db: Session = Depends(get_db)):
    p_data = data.model_dump(exclude={"tags"})
    if not p_data.get("slug") and p_data.get("common_name"):
        base_slug = slugify(p_data["common_name"])
        candidate = base_slug
        idx = 1
        while db.query(Plant).filter(Plant.slug == candidate).first():
            candidate = f"{base_slug}-{idx}"
            idx += 1
        p_data["slug"] = candidate

    plant = Plant(**p_data)

    if data.tags:
        tags_objs = []
        for t_name in data.tags:
            tag_obj = db.query(Tag).filter(Tag.tag_name == t_name).first()
            if not tag_obj:
                tag_obj = Tag(tag_name=t_name, category="Công dụng")
                db.add(tag_obj)
                db.flush()
            tags_objs.append(tag_obj)
        plant.tags = tags_objs

    db.add(plant)
    db.commit()
    db.refresh(plant)
    return plant

@app.put("/api/plants/{plant_id}", response_model=PlantResponse)
def update_plant(plant_id: int, data: PlantCreate, user: User = Depends(check_permission("plant:update")), db: Session = Depends(get_db)):
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")

    p_data = data.model_dump(exclude={"tags"}, exclude_unset=True)
    for key, value in p_data.items():
        setattr(plant, key, value)

    if data.tags is not None:
        tags_objs = []
        for t_name in data.tags:
            tag_obj = db.query(Tag).filter(Tag.tag_name == t_name).first()
            if not tag_obj:
                tag_obj = Tag(tag_name=t_name, category="Công dụng")
                db.add(tag_obj)
                db.flush()
            tags_objs.append(tag_obj)
        plant.tags = tags_objs

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

# ── Favorites ────────────────────────────────────────────────────────

@app.get("/api/favorites", response_model=List[PlantResponse])
def get_favorites(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    favs = db.query(UserFavorite).filter(UserFavorite.user_id == user.id).all()
    plant_ids = [f.plant_id for f in favs]
    plants = db.query(Plant).filter(Plant.id.in_(plant_ids)).all()
    for p in plants:
        p.is_favorite = True
    return plants

@app.post("/api/favorites/{plant_id}")
def add_favorite(plant_id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    existing = db.query(UserFavorite).filter(UserFavorite.user_id == user.id, UserFavorite.plant_id == plant_id).first()
    if not existing:
        db.add(UserFavorite(user_id=user.id, plant_id=plant_id))
        db.commit()
    return {"status": "success", "message": "Saved to favorites"}

@app.delete("/api/favorites/{plant_id}")
def remove_favorite(plant_id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    fav = db.query(UserFavorite).filter(UserFavorite.user_id == user.id, UserFavorite.plant_id == plant_id).first()
    if fav:
        db.delete(fav)
        db.commit()
    return {"status": "success", "message": "Removed from favorites"}

@app.post("/api/favorites/sync")
def sync_favorites(req: FavoriteSyncRequest, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    for pid in req.plant_ids:
        plant = db.query(Plant).filter(Plant.id == pid).first()
        if plant:
            existing = db.query(UserFavorite).filter(UserFavorite.user_id == user.id, UserFavorite.plant_id == pid).first()
            if not existing:
                db.add(UserFavorite(user_id=user.id, plant_id=pid))
    db.commit()
    return {"status": "success", "synced": len(req.plant_ids)}

# ── Articles / Knowledge Base ───────────────────────────────────────

@app.get("/api/articles", response_model=ArticleListResponse)
def list_articles(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Article)
    if category:
        query = query.filter(Article.category == category)
    total = query.count()
    items = query.order_by(Article.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return ArticleListResponse(items=items, total=total, page=page, page_size=page_size)

@app.get("/api/articles/{id_or_slug}", response_model=ArticleResponse)
def get_article(id_or_slug: str, db: Session = Depends(get_db)):
    article = None
    if id_or_slug.isdigit():
        article = db.query(Article).filter(Article.id == int(id_or_slug)).first()
    if not article:
        article = db.query(Article).filter(Article.slug == id_or_slug).first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    article.views_count = (article.views_count or 0) + 1
    db.commit()
    db.refresh(article)
    return article

@app.post("/api/articles", response_model=ArticleResponse, status_code=201)
def create_article(data: ArticleCreate, admin: User = Depends(check_permission("plant:create")), db: Session = Depends(get_db)):
    base_slug = slugify(data.title)
    candidate = base_slug
    idx = 1
    while db.query(Article).filter(Article.slug == candidate).first():
        candidate = f"{base_slug}-{idx}"
        idx += 1

    art = Article(
        title=data.title,
        slug=candidate,
        summary=data.summary,
        content=data.content,
        image_url=data.image_url,
        category=data.category or "Dược liệu",
        author=data.author or admin.full_name or admin.username
    )
    db.add(art)
    db.commit()
    db.refresh(art)
    return art

@app.put("/api/articles/{article_id}", response_model=ArticleResponse)
def update_article(article_id: int, data: ArticleCreate, admin: User = Depends(check_permission("plant:update")), db: Session = Depends(get_db)):
    art = db.query(Article).filter(Article.id == article_id).first()
    if not art:
        raise HTTPException(status_code=404, detail="Article not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(art, key, value)
    db.commit()
    db.refresh(art)
    return art

@app.delete("/api/articles/{article_id}", status_code=204)
def delete_article(article_id: int, admin: User = Depends(check_permission("plant:delete")), db: Session = Depends(get_db)):
    art = db.query(Article).filter(Article.id == article_id).first()
    if not art:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(art)
    db.commit()
    return None

# ── AI Plant Recognition ───────────────────────────────────────────

@app.post("/api/ai/recognize")
async def recognize_plant_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Vui lòng tải lên một tệp hình ảnh")
    
    contents = await file.read()
    import base64
    b64_image = base64.b64encode(contents).decode("utf-8")
    mime_type = file.content_type or "image/jpeg"

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Chưa cấu hình GOOGLE_API_KEY cho AI nhận diện")

    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)

        prompt = (
            "Bạn là chuyên gia nhận diện thực vật dược liệu Việt Nam. "
            "Hãy phân tích hình ảnh cây thuốc này và trả về kết quả JSON theo định dạng chính xác:\n"
            "{\n"
            '  "identified": true,\n'
            '  "primary_candidate": {\n'
            '     "vietnamese_name": "Tên tiếng Việt nghi vấn cao nhất",\n'
            '     "scientific_name": "Tên khoa học nghi vấn",\n'
            '     "confidence_percent": 85,\n'
            '     "observed_features": "Đặc điểm hình thái nhận biết qua ảnh (lá, hoa, thân...)"\n'
            '  },\n'
            '  "other_candidates": [\n'
            '     {"vietnamese_name": "Cây khả nghi 2", "scientific_name": "Tên khoa học", "confidence_percent": 60}\n'
            '  ],\n'
            '  "disclaimer": "LƯU Ý QUAN TRỌNG: Kết quả nhận diện bằng AI chỉ mang tính chất gợi ý tham khảo. Tuyệt đối không tự ý thu hái hoặc sử dụng cây dại theo nhận diện AI khi chưa được chuyên gia dược liệu hoặc bác sĩ Y học cổ truyền xác minh trực tiếp!"\n'
            "}\n"
            "Chỉ trả về JSON thuần túy, không kèm Markdown wrapper code block."
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(data=contents, mime_type=mime_type),
                prompt
            ]
        )
        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            raw_text = re.sub(r"^```[a-zA-Z]*\n?", "", raw_text)
            raw_text = re.sub(r"\n?```$", "", raw_text).strip()

        import json
        result_json = json.loads(raw_text)
        
        if "primary_candidate" in result_json and result_json["primary_candidate"].get("vietnamese_name"):
            vname = result_json["primary_candidate"]["vietnamese_name"]
            matched_plant = db.query(Plant).filter(Plant.common_name.ilike(f"%{vname}%")).first()
            if matched_plant:
                result_json["primary_candidate"]["db_plant_id"] = matched_plant.id
                result_json["primary_candidate"]["db_plant_slug"] = matched_plant.slug

        return result_json
    except Exception as e:
        return {
            "identified": False,
            "error": f"Không thể xử lý hình ảnh qua AI: {str(e)}",
            "disclaimer": "Kết quả AI chỉ mang tính chất tham khảo. Vui lòng kiểm tra lại hình ảnh hoặc thử lại sau."
        }

# ── Analytics & SEO ────────────────────────────────────────────────

@app.get("/api/analytics/search")
def get_search_analytics(db: Session = Depends(get_db)):
    from sqlalchemy import func
    top_queries = (
        db.query(SearchLog.query, func.count(SearchLog.id).label("count"))
        .group_by(SearchLog.query)
        .order_by(func.count(SearchLog.id).desc())
        .limit(10)
        .all()
    )
    return [{"query": q, "count": c} for q, c in top_queries]

@app.get("/sitemap.xml")
def get_sitemap(db: Session = Depends(get_db)):
    from fastapi.responses import Response
    plants = db.query(Plant).all()
    articles = db.query(Article).all()
    
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url><loc>https://thucvatviet.vn/</loc><priority>1.0</priority></url>',
        '  <url><loc>https://thucvatviet.vn/plants</loc><priority>0.9</priority></url>',
        '  <url><loc>https://thucvatviet.vn/articles</loc><priority>0.8</priority></url>',
        '  <url><loc>https://thucvatviet.vn/ai-recognition</loc><priority>0.7</priority></url>',
    ]
    for p in plants:
        slug = p.slug or str(p.id)
        xml_lines.append(f'  <url><loc>https://thucvatviet.vn/plants/{slug}</loc><priority>0.8</priority></url>')
    for a in articles:
        xml_lines.append(f'  <url><loc>https://thucvatviet.vn/articles/{a.slug}</loc><priority>0.7</priority></url>')
    xml_lines.append('</urlset>')
    return Response(content="\n".join(xml_lines), media_type="application/xml")

@app.get("/robots.txt")
def get_robots():
    from fastapi.responses import Response
    content = "User-agent: *\nAllow: /\nSitemap: https://thucvatviet.vn/sitemap.xml\n"
    return Response(content=content, media_type="text/plain")

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
