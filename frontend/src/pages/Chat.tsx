import ChatBot from "../components/Chatbox";
import SEO from "../components/SEO";

export default function Chat() {
  return (
    <div className="h-full w-full">
      <SEO title="Hỏi Đáp AI Thảo Dược - Thực Vật Bot" description="Trợ lý AI hỏi đáp trực tiếp về công dụng, tính vị và bài thuốc cây thuốc Nam." />
      <ChatBot />
    </div>
  );
}
