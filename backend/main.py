from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers.plants import router as plants_router
from routers.tags import router as tags_router
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    lifespan=lifespan,
    title="Quan ly cay thuoc",
    description="Trang web co ban de quan ly cay thuoc",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)   

app.include_router(plants_router)
app.include_router(tags_router)