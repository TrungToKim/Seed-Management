import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  Bot,
  User,
  RefreshCw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Leaf,
  BookOpen,
  Search,
  Droplets,
  Info,
  Menu,
  X,
} from "lucide-react";
import { type ChatQuota, getToken, API_BASE } from "../api";
import { useAuth } from "../useAuth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: string[];
  timestamp: Date;
  liked?: boolean | null;
}

const SUGGESTED_PROMPTS = [
  { icon: Leaf, label: "Cây thuốc chữa bệnh", prompt: "Những cây thuốc dân gian Việt Nam chữa bệnh đường hô hấp?" },
  { icon: BookOpen, label: "Tra cứu dược liệu", prompt: "Công dụng và bài thuốc chữa dạ dày của cây nhàu?" },
  { icon: Search, label: "Cách sử dụng", prompt: "Cách sắc thuốc và liều dùng của cây Đinh lăng?" },
  { icon: Droplets, label: "Thảo dược thanh nhiệt", prompt: "Các loại cây thuốc thanh nhiệt giải độc phổ biến ở Việt Nam?" },
];

export default function ChatBot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Xin chào! Tôi là **Thực Vật Bot**, trợ lý AI tra cứu cây thuốc Việt Nam. Tôi có thể giúp bạn tra cứu công dụng, tính vị, bài thuốc dân gian và cách sử dụng các loại dược liệu.\n\nBạn cần tra cứu cây thuốc nào hôm nay?",
      sources: [],
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [quota, setQuota] = useState<ChatQuota | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);

  // Setup WebSocket connection
  useEffect(() => {
    let active = true;
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;

    function connect() {
      if (!active) return;
      const wsProto = API_BASE.startsWith("https") ? "wss" : "ws";
      const baseDomain = API_BASE.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const token = getToken();
      const wsUrl = `${wsProto}://${baseDomain}/api/chat/ws${token ? `?token=${encodeURIComponent(token)}` : ""}`;

      socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!active) return;
        setSocketConnected(true);
      };

      socket.onmessage = (event) => {
        if (!active) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "answer") {
            const botMsg: Message = {
              id: `m${++idCounter.current}`,
              role: "assistant",
              content: data.answer,
              sources: data.sources || [],
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMsg]);
            setLoading(false);
          } else if (data.type === "quota") {
            setQuota(data.quota);
          } else if (data.type === "error") {
            const botMsg: Message = {
              id: `m${++idCounter.current}`,
              role: "assistant",
              content: data.error,
              sources: [],
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMsg]);
            setLoading(false);
          }
        } catch (err) {
          console.error("Error processing WebSocket message:", err);
        }
      };

      socket.onclose = () => {
        if (!active) return;
        setSocketConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket?.close();
      };
    }

    connect();

    return () => {
      active = false;
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      socketRef.current = null;
    };
  }, [user]);

  // Load history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("tv_chat_search_history");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        const hasMembership = !!user && user.role !== "customer";
        const historyLimit = hasMembership ? 10 : 5;
        setSearchHistory(parsed.slice(0, historyLimit));
      } catch {
        setSearchHistory([]);
      }
    }
  }, [user]);

  // Internal Container Auto-scroll (Scrolls ONLY internal chat box, preserving outer window scroll position!)
  useEffect(() => {
    if (messagesContainerRef.current) {
      const currentWinY = window.scrollY;
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
      window.scrollTo(0, currentWinY);
    }
  }, [messages, loading]);

  async function send(text?: string, e?: React.SyntheticEvent) {
    if (e) {
      e.preventDefault();
    }
    const windowY = window.scrollY;
    const value = (text ?? input).trim();
    if (!value || loading) return;
    setInput("");
    setSidebarOpen(false);

    // Save search history
    const hasMembership = !!user && user.role !== "customer";
    const historyLimit = hasMembership ? 10 : 5;
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item !== value);
      const updated = [value, ...filtered].slice(0, historyLimit);
      localStorage.setItem("tv_chat_search_history", JSON.stringify(updated));
      return updated;
    });

    const userMsg: Message = {
      id: `m${++idCounter.current}`,
      role: "user",
      content: value,
      sources: [],
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Prevent window jump
    setTimeout(() => {
      window.scrollTo(0, windowY);
    }, 10);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const history = messages
        .filter((m) => m.role !== "assistant" || m.sources.length > 0 || m.id !== "init")
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      socketRef.current.send(JSON.stringify({ query: value, history }));
    } else {
      const botMsg: Message = {
        id: `m${++idCounter.current}`,
        role: "assistant",
        content: "Không có kết nối đến máy chủ. Đang chờ tự động kết nối lại...",
        sources: [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(undefined, e);
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
    setMessages([
      {
        id: "init",
        role: "assistant",
        content: "Xin chào! Tôi là **Thực Vật Bot**, trợ lý AI tra cứu cây thuốc Việt Nam. Tôi có thể giúp bạn tra cứu công dụng, tính vị, bài thuốc dân gian và cách sử dụng các loại dược liệu.\n\nBạn cần tra cứu cây thuốc nào hôm nay?",
        sources: [],
        timestamp: new Date(),
      },
    ]);
    setInput("");
    setSidebarOpen(false);
  }

  function renderMarkdown(text: string) {
    const lines = text.split("\n");
    const esc = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    return lines.map((line, i) => {
      const bold = esc(line).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
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

  const guestExhausted = !user && !!quota && quota.limit > 0 && (quota.remaining ?? 0) <= 0;

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-emerald-950 text-emerald-100 flex-shrink-0 flex flex-col overflow-hidden transition-transform duration-300 transform md:relative md:translate-x-0 border-r border-emerald-900/40 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 flex items-center justify-between gap-2 border-b border-emerald-900/50">
          <button
            onClick={newChat}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-md transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Hội thoại mới</span>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 rounded-xl text-emerald-300 hover:bg-emerald-900/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pt-4 pb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Lịch sử tra cứu</p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {searchHistory.map((query, index) => (
            <button
              key={index}
              onClick={(e) => {
                setInput(query);
                send(query, e);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-emerald-900/40 text-emerald-200/90 hover:text-white text-xs font-medium transition-colors flex items-center gap-2.5 truncate group"
            >
              <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="truncate">{query}</span>
            </button>
          ))}
          {searchHistory.length === 0 && (
            <p className="text-xs text-emerald-400/50 px-3 py-2 italic">Chưa có lịch sử câu hỏi</p>
          )}
        </div>

        {/* User Quota Info Footer */}
        <div className="p-4 border-t border-emerald-900/60 bg-emerald-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {user ? user.username.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.full_name || user?.username || "Khách ghé thăm"}</p>
              <p className="text-[11px] text-emerald-300/80 truncate">
                {user
                  ? user.package_name || "Thành viên"
                  : `Khách: còn ${quota ? (quota.limit <= 0 ? "∞" : quota.remaining) : "…"} câu hỏi/ngày`}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-white/90 backdrop-blur-md shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Bot className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 text-base">Thực Vật Bot</h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  AI RAG 3.1
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${socketConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                <span className="text-xs text-slate-400 font-medium">
                  {socketConnected ? "Sẵn sàng hỗ trợ" : "Đang kết nối lại..."} · Tư vấn Y học cổ truyền
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={newChat}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Làm mới cuộc gọi</span>
          </button>
        </div>

        {/* Scrollable Messages Box Container (Scrolled smoothly internally on send!) */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <div className="shrink-0 mt-1">
                {msg.role === "assistant" ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Message Content Bubble */}
              <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                    msg.role === "user"
                      ? "bg-emerald-700 text-white font-medium rounded-br-xs"
                      : "bg-slate-50 border border-slate-200/80 text-slate-800 rounded-bl-xs"
                  }`}
                >
                  {msg.role === "assistant" ? renderMarkdown(msg.content) : <p>{msg.content}</p>}
                </div>

                {/* References / Sources Badge */}
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 w-full text-xs space-y-1">
                    <p className="font-bold text-emerald-900 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Nguồn tài liệu trích xuất:</span>
                    </p>
                    <ul className="space-y-0.5 text-emerald-800 text-[11px]">
                      {msg.sources.map((src, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <Leaf className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{src}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Message Action Items */}
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-400 px-1">
                    <span>{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <button
                      onClick={() => copyMessage(msg.content, msg.id)}
                      className={`p-1 transition-colors ${copied === msg.id ? "text-emerald-600 font-bold" : "hover:text-emerald-700"}`}
                      title={copied === msg.id ? "Đã sao chép" : "Sao chép câu trả lời"}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleLike(msg.id, true)}
                      className={`p-1 transition-colors ${msg.liked === true ? "text-emerald-700" : "hover:text-slate-600"}`}
                      title="Hữu ích"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleLike(msg.id, false)}
                      className={`p-1 transition-colors ${msg.liked === false ? "text-red-500" : "hover:text-slate-600"}`}
                      title="Chưa chính xác"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {msg.role === "user" && (
                  <span className="text-[11px] text-slate-400 mt-1 px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Typing Loading Indicator */}
          {loading && (
            <div className="flex gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          {/* Initial Prompt Suggestions */}
          {messages.length === 1 && !loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
              {SUGGESTED_PROMPTS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.label}
                    onClick={(e) => send(p.prompt, e)}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:bg-emerald-50/50 text-left text-xs font-semibold text-slate-700 hover:text-emerald-900 transition-all shadow-2xs group"
                  >
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Input Bar Area */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 space-y-3">
          {!user && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 font-medium">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Khách chưa đăng nhập: còn <strong>{quota ? (quota.limit <= 0 ? "∞" : quota.remaining) : "…"}</strong> câu hỏi hôm nay.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to="/login" className="px-3 py-1 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800">
                  Đăng nhập
                </Link>
                <Link to="/register" className="px-3 py-1 bg-white border border-emerald-300 text-emerald-800 font-bold rounded-lg">
                  Đăng ký
                </Link>
              </div>
            </div>
          )}

          <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-2xl p-2 transition-all">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={guestExhausted}
              placeholder={
                guestExhausted
                  ? "Bạn đã dùng hết lượt chat hôm nay. Đăng nhập để tiếp tục."
                  : "Nhập câu hỏi về cây thuốc, bài thuốc, cách dùng..."
              }
              className="flex-1 resize-none bg-transparent p-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none max-h-32"
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={(e) => send(undefined, e)}
              disabled={!input.trim() || loading || guestExhausted}
              className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-30 text-white font-bold transition-all shadow-xs shrink-0"
              aria-label="Gửi câu hỏi"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Thông tin AI chỉ mang tính tham khảo y học cổ truyền.</span>
            <span>Hỗ trợ bởi Google Gemini</span>
          </div>
        </div>
      </div>
    </div>
  );
}
