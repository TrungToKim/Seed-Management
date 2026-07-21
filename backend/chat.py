from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain_postgres import PGVector
from langchain_classic.chains import RetrievalQA

from database import SQLALCHEMY_URL

def get_qa_chain():
    try:
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

        vectorstore = PGVector(
            collection_name="vpbank_docs",
            connection_string=SQLALCHEMY_URL,
            embedding_function=embeddings,
            use_jsonb=True,
        )

        retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

        qa = RetrievalQA.from_chain_type(
            llm=ChatOpenAI(model="deepseek-v4-flash-free", temperature=0),
            retriever=retriever,
            return_source_documents=True,
        )
        return qa
    except Exception as e:
        print(f"Warning: Could not initialize QA chain: {e}")
        return None

if __name__ == "__main__":
    qa_chain = get_qa_chain()
    if qa_chain is None:
        print("QA chain could not be initialized. Exiting.")
        exit(1)

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