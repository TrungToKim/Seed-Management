# ingest.py
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores.pgvector import PGVector

# Import chuỗi kết nối từ file database.py của bạn
from database import SQLALCHEMY_URL 

def main():
    print("1. Đang tải tài liệu PDF...")
    loader = PyPDFDirectoryLoader("./pdf/")
    docs = loader.load()

    print("2. Đang cắt nhỏ văn bản...")
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_documents(docs)

    print("3. Đang tạo Vector và lưu vào Database...")
    embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
    
    # Lệnh này sẽ tự động tạo bảng (nếu chưa có) và nạp data vào PostgreSQL
    PGVector.from_documents(
        embedding=embeddings,
        documents=chunks,
        collection_name="vpbank_docs",
        connection_string=SQLALCHEMY_URL,
    )
    print("Hoàn tất nạp dữ liệu!")

if __name__ == "__main__":
    main()