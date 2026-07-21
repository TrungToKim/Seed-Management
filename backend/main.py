from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers.plants import router as plants_router
from routers.tags import router as tags_router
from contextlib import asynccontextmanager
from schemas import ChatRequest, ChatResponse
from chat import get_qa_chain

qa_chain = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global qa_chain
    init_db()
    qa_chain = get_qa_chain()
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

@app.post("/api/chat", response_model=ChatResponse)
def post_chat(req: ChatRequest):
    if qa_chain is None:
        raise HTTPException(status_code=503, detail="Chat service is not available (vector DB not initialized)")
    result = qa_chain.invoke({"query": req.query})
    sources = list(set(
        doc.metadata.get("source", "Unknown")
        for doc in result["source_documents"]
    ))
    return ChatResponse(
        status="success",
        answer=result["result"],
        sources=sources,
    )


app.include_router(plants_router)
app.include_router(tags_router)