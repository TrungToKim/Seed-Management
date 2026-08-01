import os
from dotenv import load_dotenv

from database import SQLALCHEMY_URL

load_dotenv()

TOP_K = 4  # 3 ~ 4

MEDICAL_WARNING = (
    "\n\n---\n"
    "Cảnh báo: Thông tin trên chỉ mang tính chất tham khảo. "
    "Vui lòng tham vấn ý kiến bác sĩ hoặc chuyên gia y tế "
    "trước khi sử dụng bất kỳ loại cây thuốc nào."
)

# Prompt chia thanh 4 phan theo ti le:
#   System Prompt       ~10%
#   Retrieved Context   ~60-70%
#   Chat History        ~10%
#   User Question       ~10%
SYSTEM_PROMPT = """Bạn là một trợ lý y tế chuyên về cây thuốc.

Bạn PHẢI tuân thủ nghiêm ngặt 3 quy tắc sau:

1. Giới hạn miền tri thức: Chỉ được phép trả lời các câu hỏi liên quan đến cây thuốc, thảo dược, bài thuốc dân gian và công dụng y lý của chúng. Nếu người dùng hỏi các chủ đề khác (công nghệ, lịch sử, toán học, v.v.), phải từ chối lịch sự: "Xin lỗi, tôi chỉ có thể trả lời các câu hỏi liên quan đến cây thuốc và thảo dược."

2. Chống ảo giác (Zero-Hallucination): KHÔNG tự suy diễn, KHÔNG tự bịa ra thông tin. Chỉ sử dụng dữ liệu được cung cấp trong phần NGỮ CẢNH (Retrieved Context) dưới đây để trả lời. Nếu dữ liệu không đề cập đến câu hỏi, hãy trả lời: "Cơ sở dữ liệu của tôi chưa có thông tin về loại cây/bài thuốc này."

3. Cảnh báo y tế bắt buộc: Bất kể câu trả lời là gì, bạn LUÔN LUÔN phải đính kèm nguyên văn dòng cảnh báo sau ở cuối mỗi phản hồi: "Cảnh báo: Thông tin trên chỉ mang tính chất tham khảo. Vui lòng tham vấn ý kiến bác sĩ hoặc chuyên gia y tế trước khi sử dụng bất kỳ loại cây thuốc nào."

====== NGỮ CẢNH (Retrieved Context) ======
{context}

====== LỊCH SỬ HỘI THOẠI (Chat History) ======
{chat_history}

====== CÂU HỎI (User Question) ======
{question}
Trả lời:"""


def format_chat_history(history):
    if not history:
        return "(Cuộc trò chuyện mới, chưa có lịch sử hội thoại.)"
    lines = []
    for msg in history[-6:]:
        if hasattr(msg, "role"):
            role_name = "Người dùng" if msg.role == "user" else "Trợ lý"
            content = msg.content
        else:
            role_name = "Người dùng" if msg.get("role") == "user" else "Trợ lý"
            content = msg.get("content", "")
        lines.append(f"{role_name}: {content}")
    return "\n".join(lines)


def get_qa_chain():
    try:
        from langchain_huggingface import HuggingFaceEmbeddings
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_postgres import PGVector
        from langchain_core.prompts import PromptTemplate
        from langchain_core.runnables import RunnableLambda, RunnableParallel
        from langchain_core.output_parsers import StrOutputParser

        embeddings = HuggingFaceEmbeddings(model_name="keepitreal/vietnamese-sbert")

        vectorstore = PGVector(
            collection_name="vpbank_docs",
            connection=SQLALCHEMY_URL,
            embeddings=embeddings,
            use_jsonb=True,
        )

        retriever = vectorstore.as_retriever(search_kwargs={"k": TOP_K})

        llm = ChatGoogleGenerativeAI(
            model="gemini-3.1-flash-lite",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0,
        )

        prompt = PromptTemplate(
            template=SYSTEM_PROMPT,
            input_variables=["context", "chat_history", "question"],
        )

        def retrieve(inputs):
            question = inputs["question"]
            history = inputs.get("history", [])
            docs = retriever.invoke(question)
            context = "\n\n".join(doc.page_content for doc in docs)
            rendered = prompt.invoke(
                {
                    "context": context,
                    "chat_history": format_chat_history(history),
                    "question": question,
                }
            )
            answer = llm.invoke(rendered)
            if isinstance(answer, list):
                answer_text = "\n".join(
                    part.get("text", "") for part in answer if isinstance(part, dict)
                )
            else:
                answer_text = answer.content if hasattr(answer, "content") else str(answer)
            return {
                "result": answer_text,
                "source_documents": docs,
            }

        qa_chain = RunnableLambda(retrieve)
        return qa_chain
    except Exception as e:
        print(f"Warning: Could not initialize QA chain: {e}")
        return None


if __name__ == "__main__":
    qa_chain = get_qa_chain()
    if qa_chain is None:
        print("QA chain could not be initialized. Exiting.")
        exit(1)

    history = []
    while True:
        user_query = input("\nBan hoi (hoac go 'exit' de thoat): ")
        if user_query.lower() == 'exit':
            break

        result = qa_chain.invoke({"question": user_query, "history": history})
        answer = result["result"]
        if "Cam bao" not in answer and "Cảnh báo" not in answer:
            answer += MEDICAL_WARNING
        history.append({"role": "user", "content": user_query})
        history.append({"role": "assistant", "content": answer})

        print("\n=> TRA LOI:")
        print(answer)

        print("\n=> NGUON THAM KHAO:")
        for doc in result["source_documents"]:
            print(f"- {doc.metadata.get('source')} (Trang {doc.metadata.get('page')})")
