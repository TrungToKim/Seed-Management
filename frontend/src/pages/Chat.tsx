import ChatBot from "../components/Chatbox";
import SEO from "../components/SEO";

export default function Chat() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <SEO
        title="Hỏi Đáp AI Thảo Dược - Thực Vật Bot"
        description="Trợ lý AI hỏi đáp trực tiếp về công dụng, tính vị và bài thuốc cây thuốc Nam."
      />
      <div className="h-[calc(100vh-280px)] min-h-[520px] max-h-[750px] rounded-3xl overflow-hidden border border-slate-200 shadow-md">
        <ChatBot />
      </div>
    </div>
  );
}
