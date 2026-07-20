import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

load_dotenv()

# 1. Xử lý chuỗi kết nối cho tương thích với LangChain PGVector
SQLALCHEMY_URL = os.getenv("DB_URL")
if SQLALCHEMY_URL and SQLALCHEMY_URL.startswith("postgresql://"):
    SQLALCHEMY_URL = SQLALCHEMY_URL.replace("postgresql://", "postgresql+psycopg2://")

engine = create_engine(SQLALCHEMY_URL)

# 2. Đổi tên biến thành SessionLocal để không trùng với thư viện
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal() # Sử dụng SessionLocal ở đây
    try:
        yield db
    finally:
        db.close()

def init_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()
    except Exception as e:
        print(f"Warning: Could not create vector extension: {e}")
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Could not create all tables: {e}")
        tables_to_create = [t for name, t in Base.metadata.tables.items() if name != "vector_chunks"]
        for table in tables_to_create:
            try:
                table.create(bind=engine, checkfirst=True)
            except Exception:
                pass