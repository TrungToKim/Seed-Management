# Quản Lý Cây Thuốc (Medicinal Plant Management)

Hệ thống quản lý và tra cứu thông tin cây thuốc, tích hợp trợ lý AI chuyên về thảo dược.

## Công nghệ sử dụng

| Thành phần     | Công nghệ                                           |
| -------------- | --------------------------------------------------- |
| Frontend       | React 19, TypeScript, Vite 8, React Router 7        |
| Backend        | Python 3.14, FastAPI, SQLAlchemy 2.0                |
| Database       | PostgreSQL 16 + pgvector                            |
| Vector Search  | PGVector, Google Gemini Embeddings (gemini-embedding-2) |
| AI Chat        | LangChain, Google Gemini (gemini-3.1-flash-lite)        |
| PDF Processing | LangChain Document Loaders                              |

## Cấu trúc thư mục

```
Web_Seed_Management/
├── frontend/           # React + TypeScript frontend
│   ├── src/
│   │   ├── components/ # Shared components (Layout, Chatbox)
│   │   ├── pages/      # Route pages (Home, Plant, Admin, Chat)
│   │   └── assets/     # Static assets
│   └── ...
├── backend/            # FastAPI backend
│   ├── main.py         # FastAPI app & API routes
│   ├── database.py     # SQLAlchemy models, Pydantic schemas, migrations
│   ├── auth_utils.py   # Password hashing & JWT-like token helpers
│   ├── chat_service.py # RAG chat pipeline
│   ├── ingest.py       # Vector hoá dữ liệu cho chat
│   ├── import_pdf.py   # Import PDF vào database
│   └── setup_db.py     # Tạo database, bảng & admin đầu tiên
├── pdf/                # PDF documents cho vector DB
└── ...
```

> Lưu ý: mô hình AI chạy hoàn toàn trên cloud Google (Gemini flash-lite + gemini-embedding-2), máy chủ không cần cài PyTorch / sentence-transformers nên chạy tốt trên server 512MB RAM.

## Hướng dẫn chạy

### Yêu cầu

- Python 3.12+
- Node.js 20+
- PostgreSQL 16 (có pgvector extension)
- Docker (tuỳ chọn, cho database)

### 1. Khởi động Database

```bash
docker compose -f backend/docker-compose.yml up -d
```

Hoặc dùng PostgreSQL đã cài sẵn trên máy.

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate    # Windows
pip install -r requirements.txt
cp .env.example .env     # Cấu hình DB_URL và API key
uvicorn main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Import dữ liệu

```bash
cd backend
python setup_db.py            # Tạo database, bảng và admin đầu tiên (đọc từ .env)
python import_pdf.py          # Import PDF vào database
python ingest.py              # Vector hoá dữ liệu cho chat
```

Cấu hình lần đầu trong `backend/.env`:

- `GOOGLE_API_KEY` – API key Google Gemini (bắt buộc cho chat)
- `GOOGLE_LLM_MODEL` – mô hình chat nhẹ (mặc định `gemini-3.1-flash-lite`)
- `GOOGLE_EMBED_MODEL` – mô hình embedding (mặc định `gemini-embedding-2`)
- `AUTH_SECRET` – chuỗi bí mật dùng ký token đăng nhập
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_EMAIL` – tài khoản admin đầu tiên

## API Endpoints

| Method | Endpoint                                  | Mô tả                |
| ------ | ----------------------------------------- | -------------------- |
| POST   | /api/auth/register                       | Đăng ký tài khoản       |
| POST   | /api/auth/login                          | Đăng nhập, trả về token |
| GET    | /api/auth/me                             | Lấy thông tin người dùng |
| GET    | /api/users                               | Danh sách người dùng (admin) |
| GET    | /api/community/messages                  | Danh sách tin nhắn cộng đồng |
| POST   | /api/community/messages                  | Đăng tin nhắn cộng đồng (cần login) |
| GET    | /api/plants?page=&page_size=&search=&tag= | Danh sách cây thuốc  |
| POST   | /api/plants                               | Thêm cây thuốc mới (cần admin) |
| GET    | /api/plants/{id}                          | Chi tiết cây thuốc   |
| PUT    | /api/plants/{id}                          | Cập nhật cây thuốc (cần admin) |
| DELETE | /api/plants/{id}                          | Xoá cây thuốc (cần admin) |
| GET    | /api/tags?category=                       | Danh sách tags       |
| POST   | /api/chat                                 | Hỏi đáp với AI (RAG) |
| GET    | /api/packages                             | Danh sách gói dịch vụ (public: chỉ gói hoạt động) |
| POST   | /api/packages                             | Thêm gói dịch vụ (admin) |
| PUT    | /api/packages/{id}                        | Cập nhật gói dịch vụ (admin) |
| DELETE | /api/packages/{id}                        | Xoá gói dịch vụ (admin) |
| POST   | /api/me/package                           | Người dùng chọn/đăng ký gói |
| PUT    | /api/users/{id}/package                   | Gán gói cho người dùng (admin) |

## Gói dịch vụ & giới hạn tốc độ

- Mỗi gói quy định `chat_per_minute` (lượt chat mỗi phút), `chat_per_day` (lượt chat mỗi ngày) và `community_per_day` (bài đăng mỗi ngày). Giá trị `0` nghĩa là không giới hạn.
- Người dùng mới được gán gói **Miễn phí** mặc định. Có thể đổi gói tại trang `/packages` hoặc do admin gán.
- Giới hạn được áp dụng cho `/api/chat` và đăng bài cộng đồng; khi vượt hạn, API trả về HTTP `429`.
- Chat AI dùng cơ chế truy xuất lai (hybrid): tìm kiếm vector + tìm kiếm từ khoá trong cơ sở dữ liệu, đảm bảo cây đã có trong DB vẫn được trả lời kể cả khi truy xuất vector bỏ sót.

## Lưu ý

- Chat AI yêu cầu API key hợp lệ (cấu hình trong `backend/.env`)
- Lần đầu chạy, cần chạy `import_pdf.py` và `ingest.py` để nạp dữ liệu
