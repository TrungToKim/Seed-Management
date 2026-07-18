from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

SQLALCHEMY_URL = "postgresql://postgres:Trung28PKA@localhost:5432/caythuoc_db"

engine = create_engine(SQLALCHEMY_URL)
sessionmaker = sessionmaker(autocommit=False, autoflush=False,bind = engine)

Base = declarative_base()

def get_db():
    db = sessionmaker()
    try:
        yield db
    finally:
        db.close()