import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores.pgvector import PGVector
from langchain.chains import RetrievalQA
from langchain_community.document_loaders import PyPDFDirectoryLoader

load_dotenv()
loader = PyPDFDirectoryLoader("./pdf/")
docs = loader.load()

splitter = RecursiveCharacterTextSplitter(chunk_size=1000,chunk_overlap=200)
chunks = splitter.split_documents(docs)

embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

db_url = os.getenv("DB_URL")
if db_url and  db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://","postgresql+psycopg2://")

COLLECTION_NAME = "vpbank_docs"

vectorstore = PGVector.from_documents(
    embedding=embeddings,
    documents=chunks,
    collection_name=COLLECTION_NAME,
    connection_string=db_url,
)

retriever = vectorstore.as_retriever(search_kwargs={"k":5})
qa = RetrievalQA.from_chain_type(
    llm=ChatOpenAI(model="gpt-4o-mini",temperature=0),
    retriever=retriever,
    return_source_documents=True,
)

result = qa.invoke({"query":"Quy trinh phe duyet"})
print(result["result"])
print("\n--- Nguồn tham khảo ---")
for doc in result["source_documents"]:
    print(f"📄 {doc.metadata.get('source')} — trang {doc.metadata.get('page')}")
