import os
import re
from dotenv import load_dotenv
from sqlalchemy import or_

from app.database import SQLALCHEMY_URL, get_db, Plant, Tag

load_dotenv()

TOP_K = 8  # retrieve more candidates; SQL keyword search acts as a fallback

# Light deployment: the LLM and embeddings are served by Google's cloud,
# so the server itself does not need to run PyTorch / sentence-transformers
# and can fit within 512MB of RAM.
LLM_MODEL = os.getenv("GOOGLE_LLM_MODEL", "gemini-3.1-flash-lite")
EMBED_MODEL = os.getenv("GOOGLE_EMBED_MODEL", "gemini-embedding-2")
COLLECTION_NAME = os.getenv("EMBEDDING_COLLECTION", "caythuoc_docs")

def get_embeddings():
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    return GoogleGenerativeAIEmbeddings(
        model=EMBED_MODEL,
        google_api_key=os.getenv("GOOGLE_API_KEY"),
    )

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


def _extract_text(answer) -> str:
    if isinstance(answer, str):
        return answer
    content = getattr(answer, "content", answer)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict):
                text = part.get("text")
                if text:
                    parts.append(text)
            elif isinstance(part, str):
                parts.append(part)
        return "\n".join(parts)
    return str(content)


STOPWORDS = {
    "cây", "cay", "co", "có", "va", "và", "cua", "của", "la", "là", "benh", "bệnh",
    "dieu", "điều", "tri", "trị", "chua", "chữa", "bai", "bài", "thuoc", "thuốc",
    "cong", "công", "dung", "dụng", "cach", "cách", "dung", "dùng", "sac", "sắc",
    "nhung", "những", "loai", "loại", "nao", "nào", "gi", "gì", "giup", "giúp",
    "cho", "cho", "de", "để", "khi", "một", "mot", "ban", "bạn", "toi", "tôi",
    "hay", "hãy", "khong", "không", "theo", "ve", "về", "nhe", "nhé", "tra", "tra",
    "cuu", "cứu", "hoi", "hỏi", "moi", "mọi", "thong", "thông", "tin", "cây thuốc",
}


def _normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ\s0-9]", " ", text)
    return text


def _tokenize(query: str):
    tokens = []
    for tok in _normalize(query).split():
        if tok in STOPWORDS or len(tok) < 2:
            continue
        tokens.append(tok)
    return tokens


def _plant_to_text(plant) -> str:
    text = f"Ten: {plant.common_name}\n"
    if plant.scientific_name:
        text += f"Ten khoa hoc: {plant.scientific_name}\n"
    if plant.family:
        text += f"Ho: {plant.family}\n"
    if plant.description:
        text += f"Mo ta: {plant.description}\n"
    for detail in plant.details:
        text += f"\n{detail.section_type}: {detail.content}"
    return text


_DIACRITIC_MAP = {
    "à": "a", "á": "a", "ả": "a", "ã": "a", "ạ": "a",
    "ă": "a", "ắ": "a", "ằ": "a", "ẳ": "a", "ẵ": "a", "ặ": "a",
    "â": "a", "ấ": "a", "ầ": "a", "ẩ": "a", "ẫ": "a", "ậ": "a",
    "è": "e", "é": "e", "ẻ": "e", "ẽ": "e", "ẹ": "e",
    "ê": "e", "ế": "e", "ề": "e", "ể": "e", "ễ": "e", "ệ": "e",
    "ì": "i", "í": "i", "ỉ": "i", "ĩ": "i", "ị": "i",
    "ò": "o", "ó": "o", "ỏ": "o", "õ": "o", "ọ": "o",
    "ô": "o", "ố": "o", "ồ": "o", "ổ": "o", "ỗ": "o", "ộ": "o",
    "ơ": "o", "ớ": "o", "ờ": "o", "ở": "o", "ỡ": "o", "ợ": "o",
    "ù": "u", "ú": "u", "ủ": "u", "ũ": "u", "ụ": "u",
    "ư": "u", "ứ": "u", "ừ": "u", "ử": "u", "ữ": "u", "ự": "u",
    "ỳ": "y", "ý": "y", "ỷ": "y", "ỹ": "y", "ỵ": "y",
    "đ": "d",
}


def _strip_diacritics(text: str) -> str:
    return "".join(_DIACRITIC_MAP.get(ch, ch) for ch in (text or "").lower())


def _keyword_search(query: str, db, top: int = 6):
    """Find plants whose name/description/tags match query tokens.

    This guarantees that if the plant data exists in the database, its content is
    included in the LLM context even when vector similarity fails to surface it.
    """
    from langchain_core.documents import Document
    from app.search_utils import score_plant

    all_plants = db.query(Plant).all()
    scored_plants = []
    for p in all_plants:
        score = score_plant(p, query)
        if score > 0:
            scored_plants.append((p, score))

    # Sort by match score descending
    scored_plants.sort(key=lambda x: x[1], reverse=True)

    docs = []
    for plant, score in scored_plants[:top]:
        docs.append(Document(
            page_content=_plant_to_text(plant),
            metadata={"source": f"DB: {plant.common_name}", "plant_id": plant.id},
        ))
    return docs


def get_qa_chain():
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_postgres import PGVector
        from langchain_core.prompts import PromptTemplate
        from langchain_core.runnables import RunnableLambda

        embeddings = get_embeddings()

        vectorstore = PGVector(
            collection_name=COLLECTION_NAME,
            connection=SQLALCHEMY_URL,
            embeddings=embeddings,
            use_jsonb=True,
        )

        retriever = vectorstore.as_retriever(search_kwargs={"k": TOP_K})

        llm = ChatGoogleGenerativeAI(
            model=LLM_MODEL,
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

            try:
                db = next(get_db())
                try:
                    keyword_docs = _keyword_search(question, db)
                finally:
                    db.close()
            except Exception as e:
                print(f"Warning: keyword search failed: {e}")
                keyword_docs = []

            seen_ids = set()
            merged = []
            for doc in keyword_docs + docs:
                pid = doc.metadata.get("plant_id")
                if pid is not None:
                    if pid in seen_ids:
                        continue
                    seen_ids.add(pid)
                merged.append(doc)

            context = "\n\n".join(doc.page_content for doc in merged)
            rendered = prompt.invoke(
                {
                    "context": context,
                    "chat_history": format_chat_history(history),
                    "question": question,
                }
            )
            answer = llm.invoke(rendered)
            answer_text = _extract_text(answer)
            return {
                "result": answer_text,
                "source_documents": merged,
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
