# Backend - Quản Lý Cây Thuốc

FastAPI backend với PostgreSQL + pgvector cho vector search, tích hợp RAG chatbot.

## Cấu trúc

```
backend/
├── main.py                 # Entry point, FastAPI app
├── config/
│   ├── __init__.py
│   └── database.py         # DB connection, session, init_db()
├── models/
│   ├── __init__.py
│   ├── models.py           # SQLAlchemy models: Plant, Tag, PlantDetail, VectorChunk
│   └── schemas.py          # Pydantic schemas: request/response validation
├── routers/
│   ├── __init__.py
│   ├── plants.py           # CRUD /api/plants
│   └── tags.py             # GET /api/tags
├── services/
│   ├── __init__.py
│   ├── chat.py             # RAG QA chain with medical prompt
│   ├── ingest.py           # Vector DB ingestion từ PDF + DB
│   └── vector_db.py        # Legacy vector DB script
├── scripts/
│   ├── __init__.py
│   ├── import_pdf.py       # Import PDF vào bảng plants
│   └── fix_import.py       # Fix dữ liệu sau import
├── .env                    # Cấu hình môi trường
├── requirements.txt
└── docker-compose.yml      # PostgreSQL + pgvector
```

## Models

| Table | Mô tả |
|-------|-------|
| plants | Thông tin cây thuốc (tên, họ, mô tả) |
| tags | Tags phân loại (bệnh, bộ phận) |
| plant_tags | Liên kết N-N plants ↔ tags |
| plant_details | Chi tiết (công dụng, liều lượng, lưu ý) |
| vector_chunks | Vector embeddings cho RAG |

## Thiết lập

1. Tạo database PostgreSQL
2. Copy `.env.example` thành `.env` và cập nhật:
   - `DB_URL=postgresql://user:pass@host:port/dbname`
   - `OPENAI_API_KEY=sk-...`
   - `OPENAI_BASE_URL=https://...`
3. Cài dependencies: `pip install -r requirements.txt`
4. Chạy: `uvicorn main:app --reload`

## Import dữ liệu

```bash
# Import PDF vào database
python scripts/import_pdf.py

# Vector hoá dữ liệu cho chat (chạy sau khi có dữ liệu)
python services/ingest.py
```

## API

### Plants
- `GET /api/plants?page=1&page_size=20&search=&tag=`
- `POST /api/plants` - Tạo mới
- `GET /api/plants/{id}` - Chi tiết
- `PUT /api/plants/{id}` - Cập nhật
- `DELETE /api/plants/{id}` - Xoá

### Tags
- `GET /api/tags?category=`

### Chat
- `POST /api/chat` - Body: `{"query": "câu hỏi"}`
  - Response: `{"status": "success", "answer": "...", "sources": [...]}`
  - Sử dụng RAG với vector store, prompt y tế nghiêm ngặt
