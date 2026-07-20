# chat.py
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores.pgvector import PGVector
from langchain.chains import RetrievalQA

# Import chuỗi kết nối từ file database.py của bạn
from database import SQLALCHEMY_URL 

def get_qa_chain():
    embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

    # Khởi tạo VectorStore trực tiếp (KHÔNG dùng from_documents để tránh ghi đè)
    vectorstore = PGVector(
        collection_name="vpbank_docs",
        connection_string=SQLALCHEMY_URL,
        embedding_function=embeddings,
    )

    # Cấu hình bộ thu hồi (Retriever)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
    
    # Khởi tạo QA Chain
    qa = RetrievalQA.from_chain_type(
        llm=ChatOpenAI(model="gpt-4o-mini", temperature=0),
        retriever=retriever,
        return_source_documents=True,
    )
    return qa

if __name__ == "__main__":
    qa_chain = get_qa_chain()
    
    # Vòng lặp để chat liên tục trong terminal
    while True:
        user_query = input("\nBạn hỏi (hoặc gõ 'exit' để thoát): ")
        if user_query.lower() == 'exit':
            break
            
        result = qa_chain.invoke({"query": user_query})
        
        print("\n=> TRẢ LỜI:")
        print(result["result"])
        
        print("\n=> NGUỒN THAM KHẢO:")
        for doc in result["source_documents"]:
            print(f"- {doc.metadata.get('source')} (Trang {doc.metadata.get('page')})")