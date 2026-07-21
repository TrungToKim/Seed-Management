import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain_postgres import PGVector
from langchain.chains import RetrievalQA

load_dotenv()
loader = PyPDFDirectoryLoader("./pdf/")
docs = loader.load()

splitter = RecursiveCharacterTextSplitter(chunk_size=1000,chunk_overlap=200)
chunks = splitter.split_documents(docs)

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

db_url = os.getenv("DB_URL")
if db_url and  db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://","postgresql+psycopg2://")

COLLECTION_NAME = "vpbank_docs"

vectorstore = PGVector.from_documents(
    embedding=embeddings,
    documents=chunks,
    collection_name=COLLECTION_NAME,
    connection_string=db_url,
    use_jsonb=True,
)

retriever = vectorstore.as_retriever(search_kwargs={"k":5})
qa = RetrievalQA.from_chain_type(
    llm=ChatOpenAI(model="deepseek-v4-flash-free",temperature=0),
    retriever=retriever,
    return_source_documents=True,
)

result = qa.invoke({"query":"Quy trinh phe duyet"})
print(result["result"])
print("\n--- Nguồn tham khảo ---")
for result in result["source_documents"]:
    print(f"📄 {doc.metadata.get('source')} — trang {doc.metadata.get('page')}")
