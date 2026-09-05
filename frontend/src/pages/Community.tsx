import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { API_BASE, apiFetch, apiFetchRaw, getToken } from "../api";
import { useAuth } from "../useAuth";
import {
  MessagesSquare, Send, Leaf, LogIn, UserPlus, Users, Shield, Info, RefreshCw,
} from "lucide-react";

const FS = "'Playfair Display', Georgia, serif";

interface CommunityMessage {
  id: number;
  user_id: number | null;
  username: string;
  content: string;
  created_at: string;
}

interface CommunityStats {
  members: number;
  total_messages: number;
}

const AVATAR_COLORS = ["#2d5a27", "#7ab648", "#2980b9", "#c0392b", "#8e44ad", "#e67e22", "#16a085", "#8b6914"];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const hh = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return isToday ? `Hôm nay · ${hh}` : `${d.toLocaleDateString("vi-VN")} · ${hh}`;
}

export default function Community() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

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
  }, [messages, loading, sending]);

  const fetchStats = async () => {
    try {
      setStats(await apiFetch<CommunityStats>("/api/community/stats"));
    } catch {
      // stats badge is informational only
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await apiFetchRaw("/api/community/messages?page_size=200");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(data.items);
      setError(null);
    } catch {
      setError("Không thể tải tin nhắn. Vui lòng kiểm tra kết nối server.");
    } finally {
      setLoading(false);
    }
  };

  // Connect to WebSocket and load initial messages + stats
  useEffect(() => {
    fetchStats();
    fetchMessages();

    const wsProto = API_BASE.startsWith("https") ? "wss" : "ws";
    const baseDomain = API_BASE.replace(/^https?:\/\//, "");
    const token = getToken();
    const wsUrl = `${wsProto}://${baseDomain}/api/community/ws${token ? `?token=${encodeURIComponent(token)}` : ""}`;

    let socket: WebSocket | null = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
      setError(null);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
          // Increment total messages in stats dynamically
          setStats((prev) => prev ? { ...prev, total_messages: prev.total_messages + 1 } : null);
        } else if (data.type === "error") {
          setError(data.error);
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    socket.onclose = (event) => {
      console.log("WebSocket closed", event);
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    setWs(socket);

    return () => {
      if (socket) socket.close();
    };
  }, []);
  
  const send = () => {
    const value = input.trim();
    if (!value || sending) return;

    if (ws && ws.readyState === WebSocket.OPEN) {
      setSending(true);
      setError(null);
      ws.send(JSON.stringify({ content: value }));
      setInput("");
      setSending(false);
    } else {
      setError("Mất kết nối với máy chủ. Vui lòng tải lại trang.");
    }
  };

  // Participant count reflects the number of registered (loggable) accounts,
  // provided by the backend instead of being derived from fetched messages.
  const members = stats ? stats.members : null;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1280px] mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2 flex-shrink-0">
        <div>
          <p className="text-sm uppercase tracking-widest mb-1" style={{ color: "#7ab648", fontWeight: 700 }}>
            Cộng đồng
          </p>
          <h1 style={{ fontFamily: FS, fontSize: "clamp(20px, 3vw, 32px)", color: "#1c2e14", fontWeight: 700 }}>
            Khu Vực Trao Đổi
          </h1>
          <p style={{ color: "#6b7c5e", fontSize: 13 }}>
            Chia sẻ kinh nghiệm, bài thuốc và thảo luận cùng những người yêu cây thuốc.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: "#eaf0e4", color: "#2d5a27", fontWeight: 700, fontSize: 13 }}>
            <MessagesSquare className="w-4 h-4" /> {messages.length} tin nhắn
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: "#eaf0e4", color: "#2d5a27", fontWeight: 700, fontSize: 13 }}>
            <Users className="w-4 h-4" /> {members ?? "…"} người tham gia
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:h-[650px]">
        {/* Chat panel */}
        <div className="flex-1 h-[540px] sm:h-[600px] lg:h-full rounded-3xl overflow-hidden flex flex-col min-h-0" style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}>
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 flex-shrink-0" style={{ background: "#faf5f0", borderBottom: "1px solid #e4ddd0" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #2d5a27 0%, #7ab648 100%)" }}>
                <MessagesSquare className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p style={{ color: "#1c2e14", fontWeight: 800, fontSize: 15 }}>Kênh chia sẻ</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#27ae60" }} />
                  <span className="truncate block" style={{ color: "#888", fontSize: 12 }}>{user ? `Tài khoản ${user.username}` : "Đăng nhập để tham gia trao đổi"}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setLoading(true); fetchMessages(); }}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 sm:px-3 rounded-lg transition-colors flex-shrink-0"
              style={{ color: "#6b7c5e", background: "#fff", border: "1px solid #e4ddd0" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#7ab648")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7c5e")}
            >
              <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>

          {error && (
            <div className="px-4 py-2.5 sm:px-6 sm:py-3 flex items-center gap-2 text-sm" style={{ background: "#fdeeee", color: "#c0392b", fontWeight: 600 }}>
              <Info className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-5">
            {loading ? (
              <div className="text-center py-16">
                <p style={{ fontSize: 36 }}>💬</p>
                <p style={{ color: "#6b7c5e", fontSize: 15, marginTop: 8 }}>Đang tải tin nhắn...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16">
                <p style={{ fontSize: 36 }}>🌿</p>
                <p style={{ color: "#6b7c5e", fontSize: 15, marginTop: 8 }}>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trao đổi đầu tiên!</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs sm:text-sm"
                      style={{ background: colorFor(msg.username) }}
                    >
                      {msg.username.slice(0, 1).toUpperCase()}
                    </div>
                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span style={{ color: colorFor(msg.username), fontWeight: 800, fontSize: 14 }}>{msg.username}</span>
                        <span style={{ color: "#b7ad9d", fontSize: 11 }}>{formatTime(msg.created_at)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words" style={{ color: "#3d403a", lineHeight: 1.6, marginTop: 2 }}>
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {sending && (
              <div className="flex gap-3 mt-4 opacity-70">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#eaf0e4" }}>
                  <Leaf className="w-4 h-4" style={{ color: "#7ab648" }} />
                </div>
                <div className="flex items-center gap-1 py-2">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-2 h-2 rounded-full" style={{ background: "#7ab648", animation: "communityBounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 px-4 py-3 sm:px-6 sm:py-4" style={{ background: "#fff", borderTop: "1px solid #e4ddd0" }}>
            {user ? (
              <div
                className="flex items-end gap-3 rounded-xl px-4 py-3"
                style={{ background: "#faf5f0", border: "1.5px solid #e4ddd0", transition: "border-color 0.15s" }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
                onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#e4ddd0")}
              >
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Chia sẻ kinh nghiệm, thắc mắc về cây thuốc..."
                  className="flex-1 resize-none bg-transparent text-sm focus:outline-none"
                  style={{ color: "#1c2e14", maxHeight: 120, lineHeight: 1.6, fontFamily: "'Nunito', system-ui, sans-serif" }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                  }}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || sending}
                  className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: input.trim() && !sending ? "#2d5a27" : "#e8e2da",
                    color: input.trim() && !sending ? "#fff" : "#bbb",
                  }}
                  onMouseEnter={(e) => { if (input.trim() && !sending) e.currentTarget.style.background = "#1e3f1a"; }}
                  onMouseLeave={(e) => { if (input.trim() && !sending) e.currentTarget.style.background = "#2d5a27"; }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 rounded-xl"
                style={{ background: "#eaf0e4", border: "1.5px dashed #a8c896" }}
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 flex-shrink-0" style={{ color: "#7ab648" }} />
                  <div>
                    <p className="text-sm" style={{ color: "#2d5a27", fontWeight: 700 }}>Đăng nhập để gửi tin nhắn</p>
                    <p className="text-xs" style={{ color: "#6b7c5e" }}>Mọi người đều có thể xem cuộc trao đổi.</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link
                    to="/login"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs no-underline transition-all"
                    style={{ background: "#2d5a27", color: "#fff", fontWeight: 700 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#1e3f1a")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#2d5a27")}
                  >
                    <LogIn className="w-3.5 h-3.5" /> Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs no-underline transition-all"
                    style={{ background: "#fff", color: "#2d5a27", fontWeight: 700, border: "1px solid #a8c896" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#d7e8cd")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Tạo tài khoản
                  </Link>
                </div>
              </div>
            )}
            <p className="text-center text-xs mt-2" style={{ color: "#bbb" }}>
              Hãy tôn trọng nhau. Không spam, không chia sẻ nội dung không lành mạnh.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-72 flex-shrink-0 space-y-4 lg:overflow-y-auto lg:h-full lg:pr-1">
          <div className="rounded-3xl p-6" style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}>
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="w-4 h-4" style={{ color: "#7ab648" }} />
              <p style={{ color: "#1c2e14", fontWeight: 800, fontSize: 15 }}>Về cộng đồng</p>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#6b7c5e" }}>
              Đây là nơi các thành viên chia sẻ kinh nghiệm trồng và sử dụng cây thuốc, trao đổi bài thuốc dân gian, hỏi đáp lẫn nhau. Mọi cuộc trao đổi được lưu trữ để các thành viên mới có thể tham khảo.
            </p>
          </div>

          <div className="rounded-3xl p-6" style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4" style={{ color: "#7ab648" }} />
              <p style={{ color: "#1c2e14", fontWeight: 800, fontSize: 15 }}>Quy tắc</p>
            </div>
            <ol className="space-y-2.5">
              {[
                "Tôn trọng ý kiến của các thành viên khác.",
                "Không spam, không quảng cáo bừa bãi.",
                "Thông tin cây thuốc chỉ mang tính tham khảo.",
                "Kiểm chứng thông tin quan trọng với chuyên gia.",
              ].map((rule, i) => (
                <li key={i} className="flex gap-2.5 text-sm" style={{ color: "#5a6e52" }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: "#eaf0e4", color: "#2d5a27" }}>
                    {i + 1}
                  </span>
                  {rule}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes communityBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}