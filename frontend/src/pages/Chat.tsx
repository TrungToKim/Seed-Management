import ChatBot from "../components/Chatbox";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import SEO from "../components/SEO";
import { Bot, Sparkles } from "lucide-react";

export default function Chat() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title="Hỏi Đáp AI Thảo Dược - Thực Vật Bot"
        description="Trợ lý AI hỏi đáp trực tiếp về công dụng, tính vị và bài thuốc cây thuốc Nam."
      />

      {/* Page Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-6 sm:p-10 rounded-3xl shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Hệ thống AI RAG Dược liệu 3.1</span>
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Hỏi Đáp Trợ Lý AI Thực Vật Bot
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
            Đặt câu hỏi trực tiếp về bài thuốc dân gian, công dụng điều trị, tính vị và liều dùng các loài thảo dược Việt Nam.
          </p>
        </div>

        <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-800/50 border border-emerald-600/30 text-emerald-300 shrink-0">
          <Bot className="w-8 h-8" />
        </div>
      </div>

      {/* Main Chatbox Frame */}
      <div className="h-[550px] sm:h-[620px] rounded-3xl overflow-hidden border border-slate-200/80 shadow-md bg-white">
        <ChatBot />
      </div>

      {/* Medical Disclaimer Banner */}
      <MedicalDisclaimer />
    </div>
  );
}
