# ingest.py
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_postgres import PGVector

from database import SQLALCHEMY_URL 

def main():
    print("1. Đang tải tài liệu PDF...")
    loader = PyPDFDirectoryLoader("./pdf/")
    docs = loader.load()

    print("2. Đang cắt nhỏ văn bản...")
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_documents(docs)

    print("3. Đang tạo Vector và lưu vào Database...")
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    
    PGVector.from_documents(
        embedding=embeddings,
        documents=chunks,
        collection_name="vpbank_docs",
        connection_string=SQLALCHEMY_URL,
        use_jsonb=True,
    )
    print("Hoàn tất nạp dữ liệu!")

if __name__ == "__main__":
    main()