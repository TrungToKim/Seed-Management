import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, apiFetchRaw } from "../api";
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
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetchRaw("/api/community/messages?page_size=200");
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setMessages((await res.json()).items);
        setError(null);
      } catch {
        if (!cancelled) setError("Không thể tải tin nhắn. Vui lòng kiểm tra kết nối server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Track the newest message id so polling only fetches new ones
  useEffect(() => {
    lastIdRef.current = messages.reduce((max, m) => Math.max(max, m.id), 0);
  }, [messages]);

  // Real-time updates via lightweight polling
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (stopped || document.hidden || lastIdRef.current === 0) return;
      try {
        const res = await apiFetchRaw(
          `/api/community/messages?after_id=${lastIdRef.current}&page_size=200`
        );
        if (stopped || !res.ok) return;
        const data = (await res.json()) as { items: CommunityMessage[] };
        if (!data.items?.length) return;
        setMessages((prev) => {
          const known = new Set(prev.map((m) => m.id));
          const fresh = data.items.filter((m) => !known.has(m.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      } catch {
        // transient network errors are ignored; next poll retries
      }
    };
    const interval = setInterval(poll, 4000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  const send = async () => {
    const value = input.trim();
    if (!value || sending) return;
    setSending(true);
    setError(null);
    try {
      const msg = await apiFetch<CommunityMessage>("/api/community/messages", {
        method: "POST",
        body: JSON.stringify({ content: value }),
      });
      setMessages((prev) => [...prev, msg]);
      setInput("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message === "HTTP 401"
          ? "Bạn cần đăng nhập để gửi tin nhắn."
          : "Gửi tin nhắn thất bại. Vui lòng thử lại."
      );
    } finally {
      setSending(false);
    }
  };

  const members = new Set(messages.map((m) => m.username)).size;

  return (
    <div className="px-6 py-10 max-w-[1280px] mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-sm uppercase tracking-widest mb-2" style={{ color: "#7ab648", fontWeight: 700 }}>
            Cộng đồng
          </p>
          <h1 style={{ fontFamily: FS, fontSize: "clamp(24px, 3.5vw, 36px)", color: "#1c2e14", fontWeight: 700 }}>
            Khu Vực Trao Đổi
          </h1>
          <p style={{ color: "#6b7c5e", fontSize: 14 }}>
            Chia sẻ kinh nghiệm, bài thuốc và thảo luận cùng những người yêu cây thuốc.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: "#eaf0e4", color: "#2d5a27", fontWeight: 700, fontSize: 13 }}>
            <MessagesSquare className="w-4 h-4" /> {messages.length} tin nhắn
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: "#eaf0e4", color: "#2d5a27", fontWeight: 700, fontSize: 13 }}>
            <Users className="w-4 h-4" /> {members} người
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Chat panel */}
        <div className="flex-1 rounded-3xl overflow-hidden flex flex-col" style={{ background: "#fff", border: "1.5px solid #e4ddd0", minHeight: "60vh", maxHeight: "calc(100vh - 260px)" }}>
          {/* Chat header */}
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ background: "#faf5f0", borderBottom: "1px solid #e4ddd0" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2d5a27 0%, #7ab648 100%)" }}>
                <MessagesSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <p style={{ color: "#1c2e14", fontWeight: 800, fontSize: 15 }}>Kênh chia sẻ</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: "#27ae60" }} />
                  <span style={{ color: "#888", fontSize: 12 }}>{user ? `Đang đăng nhập với tài khoản ${user.username}` : "Đăng nhập để tham gia trao đổi"}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setLoading(true); fetchMessages(); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: "#6b7c5e", background: "#fff", border: "1px solid #e4ddd0" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#7ab648")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7c5e")}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Làm mới
            </button>
          </div>

          {error && (
            <div className="px-6 py-3 flex items-center gap-2 text-sm" style={{ background: "#fdeeee", color: "#c0392b", fontWeight: 600 }}>
              <Info className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
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
              <div className="space-y-5">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                      style={{ background: colorFor(msg.username) }}
                    >
                      {msg.username.slice(0, 1).toUpperCase()}
                    </div>
                    {/* Content */}
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
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
              <div className="flex gap-3 mt-5 opacity-70">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#eaf0e4" }}>
                  <Leaf className="w-4 h-4" style={{ color: "#7ab648" }} />
                </div>
                <div className="flex items-center gap-1 py-2">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-2 h-2 rounded-full" style={{ background: "#7ab648", animation: "communityBounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 px-6 py-4" style={{ background: "#fff", borderTop: "1px solid #e4ddd0" }}>
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
        <aside className="w-full lg:w-72 flex-shrink-0 space-y-4">
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