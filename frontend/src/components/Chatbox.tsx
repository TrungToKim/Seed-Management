import { useState, useRef, useEffect } from "react";
import {
  Send, Bot, User, RefreshCw, Copy, ThumbsUp, ThumbsDown, Plus, Leaf, BookOpen, Search, Droplets,
} from "lucide-react";
import { apiFetch } from "../api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: string[];
  timestamp: Date;
  liked?: boolean | null;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  { icon: Leaf, label: "Cây thuốc chữa bệnh", prompt: "Những cây thuốc dân gian Việt Nam chữa bệnh đường hô hấp?" },
  { icon: BookOpen, label: "Tra cứu dược liệu", prompt: "Công dụng và bài thuốc của cây nhàu?" },
  { icon: Search, label: "Cách sử dụng", prompt: "Cách sắc thuốc và liều dùng cây xạ đen?" },
  { icon: Droplets, label: "Cây đặc hữu", prompt: "Những loại cây thuốc đặc hữu của Việt Nam là gì?" },
];

const INIT_CONVERSATIONS: Conversation[] = [
  { id: "1", title: "Cây thuốc chữa đau dạ dày", lastMessage: "Một số cây thuốc phổ biến...", timestamp: new Date(Date.now() - 3600000) },
  { id: "2", title: "Bài thuốc trị cảm cúm", lastMessage: "Cảm cúm thường dùng...", timestamp: new Date(Date.now() - 86400000) },
  { id: "3", title: "Cây sâm ngọc linh", lastMessage: "Sâm ngọc linh là đặc sản...", timestamp: new Date(Date.now() - 172800000) },
];

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Xin chào! Tôi là **Thực Vật Bot**, trợ lý AI tra cứu cây thuốc Việt Nam. Tôi có thể giúp bạn tra cứu công dụng, bài thuốc dân gian và cách sử dụng các loại cây thuốc.\n\nBạn muốn hỏi gì về cây thuốc hôm nay?",
      sources: [],
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations] = useState<Conversation[]>(INIT_CONVERSATIONS);
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const value = (text ?? input).trim();
    if (!value || loading) return;
    setInput("");

    const userMsg: Message = {
      id: `m${++idCounter.current}`,
      role: "user",
      content: value,
      sources: [],
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await apiFetch<{ status: string; answer: string; sources: string[] }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ query: value }),
      });
      const botMsg: Message = {
        id: `m${++idCounter.current}`,
        role: "assistant",
        content: data.status === "success" ? data.answer : "Đã có lỗi xảy ra từ server.",
        sources: data.status === "success" ? data.sources : [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error("Lỗi gọi API:", error);
      const botMsg: Message = {
        id: `m${++idCounter.current}`,
        role: "assistant",
        content: "Không thể kết nối đến Backend. Hãy kiểm tra lại server FastAPI.",
        sources: [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function copyMessage(content: string, id: string) {
    navigator.clipboard.writeText(content.replace(/\*\*/g, ""));
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  function toggleLike(id: string, liked: boolean) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, liked: m.liked === liked ? null : liked } : m))
    );
  }

  function newChat() {
    setMessages([{ id: "init", role: "assistant", content: "Xin chào! Tôi là **Thực Vật Bot**, trợ lý AI tra cứu cây thuốc Việt Nam. Tôi có thể giúp bạn tra cứu công dụng, bài thuốc dân gian và cách sử dụng các loại cây thuốc.\n\nBạn muốn hỏi gì về cây thuốc hôm nay?", sources: [], timestamp: new Date() }]);
    setActiveConvo(null);
    setInput("");
  }

  function renderMarkdown(text: string) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const bold = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      return (
        <p
          key={i}
          className={line === "" ? "mb-2" : "mb-1"}
          dangerouslySetInnerHTML={{ __html: bold || "&nbsp;" }}
          style={{ lineHeight: 1.65 }}
        />
      );
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] overflow-hidden" style={{ background: "#faf5f0" }}>
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col overflow-hidden" style={{ background: "#1c2e14", borderRight: "1px solid #2e4a24" }}>
        <div className="p-4">
          <button
            onClick={newChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm transition-colors"
            style={{ background: "#7ab648", color: "#fff", fontWeight: 700 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#5e9a32")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#7ab648")}
          >
            <Plus className="w-4 h-4" />
            Cuộc trò chuyện mới
          </button>
        </div>

        <div className="px-4 pb-2">
          <p className="text-xs uppercase tracking-widest" style={{ color: "#8fae83", fontWeight: 700 }}>Gần đây</p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveConvo(c.id)}
              className="w-full text-left px-3 py-2.5 rounded-lg transition-colors group"
              style={{ background: activeConvo === c.id ? "#2d5a27" : "transparent" }}
              onMouseEnter={(e) => { if (activeConvo !== c.id) e.currentTarget.style.background = "#264a20"; }}
              onMouseLeave={(e) => { if (activeConvo !== c.id) e.currentTarget.style.background = "transparent"; }}
            >
              <p className="text-sm truncate" style={{ color: "#e6f2dd", fontWeight: activeConvo === c.id ? 600 : 400 }}>{c.title}</p>
              <p className="text-xs truncate mt-0.5" style={{ color: "#8fae83" }}>{c.lastMessage}</p>
            </button>
          ))}
        </div>

        <div className="p-4 border-t" style={{ borderColor: "#2e4a24" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#7ab648" }}>
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm truncate" style={{ color: "#e6f2dd", fontWeight: 600 }}>guest_user</p>
              <p className="text-xs" style={{ color: "#8fae83" }}>Gói miễn phí</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div
          className="flex items-center justify-between px-6 py-3 flex-shrink-0"
          style={{ background: "#fff", borderBottom: "1px solid #e8e2da" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #2d5a27 0%, #7ab648 100%)" }}
            >
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p style={{ color: "#1c2e14", fontWeight: 800, fontSize: 15 }}>Thực Vật Bot</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: "#27ae60" }} />
                <span style={{ color: "#888", fontSize: 12 }}>Online · Trợ lý cây thuốc Việt Nam</span>
              </div>
            </div>
          </div>
          <button
            onClick={newChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors"
            style={{ color: "#888", border: "1px solid #e8e2da", background: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#7ab648")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Xóa hội thoại
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <div className="flex-shrink-0 mt-1">
                {msg.role === "assistant" ? (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #2d5a27 0%, #7ab648 100%)" }}
                  >
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "#e8e2da" }}
                  >
                    <User className="w-4 h-4" style={{ color: "#666" }} />
                  </div>
                )}
              </div>

              {/* Bubble */}
              <div className={`flex flex-col max-w-[72%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className="px-4 py-3 rounded-2xl text-sm"
                  style={
                    msg.role === "user"
                      ? { background: "#2d5a27", color: "#fff", borderBottomRightRadius: 4 }
                      : { background: "#fff", color: "#1c2e14", border: "1px solid #e8e2da", borderBottomLeftRadius: 4 }
                  }
                >
                  {msg.role === "assistant" ? renderMarkdown(msg.content) : <p>{msg.content}</p>}
                </div>

                {/* Sources */}
                {msg.role === "assistant" && msg.sources.length > 0 && (
                  <div className="mt-2 px-4 py-3 rounded-xl w-full" style={{ background: "#f5f0e8", border: "1px solid #e4ddd0" }}>
                    <p className="text-xs mb-1.5" style={{ color: "#7ab648", fontWeight: 700 }}>📚 Nguồn tham khảo:</p>
                    <ul className="text-xs space-y-1" style={{ color: "#5a6e52" }}>
                      {msg.sources.map((source, index) => (
                        <li key={index} className="flex items-start gap-1.5">
                          <Leaf className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#7ab648" }} />
                          {source}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1 mt-1.5 px-1">
                    <span className="text-xs mr-1" style={{ color: "#bbb" }}>
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={() => copyMessage(msg.content, msg.id)}
                      className="p-1 rounded transition-colors"
                      style={{ color: copied === msg.id ? "#27ae60" : "#bbb" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#555")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = copied === msg.id ? "#27ae60" : "#bbb")}
                      title="Copy"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleLike(msg.id, true)}
                      className="p-1 rounded transition-colors"
                      style={{ color: msg.liked === true ? "#2d5a27" : "#bbb" }}
                      title="Phản hồi tốt"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleLike(msg.id, false)}
                      className="p-1 rounded transition-colors"
                      style={{ color: msg.liked === false ? "#555" : "#bbb" }}
                      title="Phản hồi chưa tốt"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {msg.role === "user" && (
                  <span className="text-xs mt-1 px-1" style={{ color: "#bbb" }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #2d5a27 0%, #7ab648 100%)" }}
              >
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div
                className="px-4 py-3 rounded-2xl flex items-center gap-1"
                style={{ background: "#fff", border: "1px solid #e8e2da", borderBottomLeftRadius: 4 }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#7ab648", animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Suggested prompts — only on first message */}
          {messages.length === 1 && !loading && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              {SUGGESTED_PROMPTS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.label}
                    onClick={() => send(p.prompt)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all"
                    style={{ background: "#fff", border: "1px solid #e8e2da", color: "#333" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#7ab648";
                      e.currentTarget.style.color = "#2d5a27";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e8e2da";
                      e.currentTarget.style.color = "#333";
                    }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "#7ab648" }} />
                    <span style={{ fontWeight: 600 }}>{p.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 px-6 py-4" style={{ background: "#fff", borderTop: "1px solid #e8e2da" }}>
          <div
            className="flex items-end gap-3 rounded-xl px-4 py-3"
            style={{ background: "#faf5f0", border: "1.5px solid #e8e2da", transition: "border-color 0.15s" }}
            onFocusCapture={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#e8e2da")}
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi Thực Vật Bot về cây thuốc, bài thuốc, cách sử dụng..."
              className="flex-1 resize-none bg-transparent text-sm focus:outline-none"
              style={{ color: "#1c2e14", maxHeight: 140, lineHeight: 1.6, fontFamily: "'Nunito', system-ui, sans-serif" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all"
              style={{
                background: input.trim() && !loading ? "#2d5a27" : "#e8e2da",
                color: input.trim() && !loading ? "#fff" : "#bbb",
              }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: "#bbb" }}>
            Thực Vật Bot có thể mắc lỗi. Hãy kiểm chứng thông tin quan trọng với chuyên gia.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
