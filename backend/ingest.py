import os
import tiktoken
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_postgres import PGVector
from langchain_core.documents import Document
from database import SQLALCHEMY_URL, get_db, init_db, Plant, PlantDetail
from chat_service import get_embeddings, COLLECTION_NAME

CHUNK_SIZE = 500      # 250 ~ 500 token
CHUNK_OVERLAP = 50    # 30 ~ 50 token

_tokenizer = None

def _token_len(text: str) -> int:
    global _tokenizer
    if _tokenizer is None:
        _tokenizer = tiktoken.get_encoding("cl100k_base")
    return len(_tokenizer.encode(text))

def ingest():
    print("1. Dang tai tai lieu PDF...")
    pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'pdf'))
    print(f"   PDF path: {pdf_path}")
    loader = PyPDFDirectoryLoader(pdf_path)
    docs = loader.load()

    print("2. Dang tai du lieu tu database...")
    init_db()
    db = next(get_db())
    plants = db.query(Plant).all()
    for plant in plants:
        text = f"Ten: {plant.common_name}\n"
        if plant.scientific_name:
            text += f"Ten khoa hoc: {plant.scientific_name}\n"
        if plant.family:
            text += f"Ho: {plant.family}\n"
        if plant.description:
            text += f"Mo ta: {plant.description}\n"
        details = db.query(PlantDetail).filter(PlantDetail.plant_id == plant.id).all()
        for detail in details:
            text += f"\n{detail.section_type}: {detail.content}"
        docs.append(Document(
            page_content=text,
            metadata={'source': f'DB: {plant.common_name}', 'plant_id': plant.id}
        ))
    db.close()

    print(f"   Tong so tai lieu: {len(docs)}")

    print("3. Dang cat nho van ban (token-based)...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=_token_len,
    )
    chunks = splitter.split_documents(docs)
    print(f"   Tong so chunks: {len(chunks)}")

    print("4. Dang tao Vector va luu vao Database...")
    embeddings = get_embeddings()

    PGVector.from_documents(
        documents=chunks,
        embedding=embeddings,
        collection_name=COLLECTION_NAME,
        connection=SQLALCHEMY_URL,
        use_jsonb=True,
    )
    print(f"Hoan tat nap du lieu vao collection '{COLLECTION_NAME}'!")

if __name__ == "__main__":
    ingest()