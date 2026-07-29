import os
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_postgres import PGVector
from langchain_classic.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate

from database import SQLALCHEMY_URL

load_dotenv()

MEDICAL_WARNING = (
    "\n\n---\n"
    "Cảnh báo: Thông tin trên chỉ mang tính chất tham khảo. "
    "Vui lòng tham vấn ý kiến bác sĩ hoặc chuyên gia y tế "
    "trước khi sử dụng bất kỳ loại cây thuốc nào."
)

SYSTEM_PROMPT = """Bạn là một trợ lý y tế chuyên về cây thuốc.

Bạn PHẢI tuân thủ nghiêm ngặt 3 quy tắc sau:

1. Giới hạn miền tri thức: Chỉ được phép trả lời các câu hỏi liên quan đến cây thuốc, thảo dược, bài thuốc dân gian và công dụng y lý của chúng. Nếu người dùng hỏi các chủ đề khác (công nghệ, lịch sử, toán học, v.v.), phải từ chối lịch sự: "Xin lỗi, tôi chỉ có thể trả lời các câu hỏi liên quan đến cây thuốc và thảo dược."

2. Chống ảo giác (Zero-Hallucination): KHÔNG tự suy diễn, KHÔNG tự bịa ra thông tin. Chỉ sử dụng dữ liệu được cung cấp trong ngữ cảnh (context) dưới đây để trả lời. Nếu dữ liệu không đề cập đến câu hỏi, hãy trả lời: "Cơ sở dữ liệu của tôi chưa có thông tin về loại cây/bài thuốc này."

3. Cảnh báo y tế bắt buộc: Bất kể câu trả lời là gì, bạn LUÔN LUÔN phải đính kèm nguyên văn dòng cảnh báo sau ở cuối mỗi phản hồi: "Cảnh báo: Thông tin trên chỉ mang tính chất tham khảo. Vui lòng tham vấn ý kiến bác sĩ hoặc chuyên gia y tế trước khi sử dụng bất kỳ loại cây thuốc nào."

Ngữ cảnh:
{context}

Câu hỏi: {question}
Trả lời:"""

PROMPT = PromptTemplate(
    template=SYSTEM_PROMPT,
    input_variables=["context", "question"],
)

def get_qa_chain():
    try:
        embeddings = HuggingFaceEmbeddings(model_name="keepitreal/vietnamese-sbert")

        vectorstore = PGVector(
            collection_name="vpbank_docs",
            connection=SQLALCHEMY_URL,
            embeddings=embeddings,
            use_jsonb=True,
        )

        retriever = vectorstore.as_retriever(search_kwargs={"k": 25})

        llm = ChatGoogleGenerativeAI(
            model="gemini-3.1-flash-lite",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0,
        )

        qa = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=retriever,
            return_source_documents=True,
            chain_type_kwargs={"prompt": PROMPT},
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
        user_query = input("\nBan hoi (hoac go 'exit' de thoat): ")
        if user_query.lower() == 'exit':
            break

        result = qa_chain.invoke({"query": user_query})
        answer = result["result"]
        if "Cam bao" not in answer and "Cảnh báo" not in answer:
            answer += MEDICAL_WARNING

        print("\n=> TRA LOI:")
        print(answer)

        print("\n=> NGUON THAM KHAO:")
        for doc in result["source_documents"]:
            print(f"- {doc.metadata.get('source')} (Trang {doc.metadata.get('page')})")
