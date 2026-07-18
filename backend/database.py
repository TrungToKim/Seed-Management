import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

load_dotenv()

SQLALCHEMY_URL = os.getenv("DB_URL")

engine = create_engine(SQLALCHEMY_URL)
sessionmaker = sessionmaker(autocommit=False, autoflush=False,bind = engine)

Base = declarative_base()

def get_db():
    db = sessionmaker()
    try:
        yield db
    finally:
        db.close()