# Quản Lý Cây Thuốc (Medicinal Plant Management)

Hệ thống quản lý và tra cứu thông tin cây thuốc, tích hợp trợ lý AI chuyên về thảo dược.

## Công nghệ sử dụng

| Thành phần     | Công nghệ                                           |
| -------------- | --------------------------------------------------- |
| Frontend       | React 19, TypeScript, Vite 8, React Router 7        |
| Backend        | Python 3.14, FastAPI, SQLAlchemy 2.0                |
| Database       | PostgreSQL 16 + pgvector                            |
| Vector Search  | PGVector, HuggingFace Embeddings (all-MiniLM-L6-v2) |
| AI Chat        | LangChain, OpenAI-compatible LLM                    |
| PDF Processing | LangChain Document Loaders                          |

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
│   ├── config/         # Database connection & settings
│   ├── models/         # SQLAlchemy models (moved here)
│   ├── schemas/        # Pydantic schemas (moved here)
│   ├── routers/        # API route handlers
│   ├── services/       # Business logic (chat, ingest)
│   └── scripts/        # One-time utility scripts
├── pdf/                # PDF documents for vector DB
└── ...
```

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
python scripts/import_pdf.py    # Import PDF vào database
python services/ingest.py        # Vector hoá dữ liệu cho chat
```

## API Endpoints

| Method | Endpoint                                  | Mô tả                |
| ------ | ----------------------------------------- | -------------------- |
| GET    | /api/plants?page=&page_size=&search=&tag= | Danh sách cây thuốc  |
| POST   | /api/plants                               | Thêm cây thuốc mới   |
| GET    | /api/plants/{id}                          | Chi tiết cây thuốc   |
| PUT    | /api/plants/{id}                          | Cập nhật cây thuốc   |
| DELETE | /api/plants/{id}                          | Xoá cây thuốc        |
| GET    | /api/tags?category=                       | Danh sách tags       |
| POST   | /api/chat                                 | Hỏi đáp với AI (RAG) |

## Lưu ý

- Chat AI yêu cầu API key hợp lệ (cấu hình trong `backend/.env`)
- Lần đầu chạy, cần chạy `import_pdf.py` và `ingest.py` để nạp dữ liệu
