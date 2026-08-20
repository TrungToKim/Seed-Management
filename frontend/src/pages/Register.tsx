import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, Lock, Mail, User as UserIcon, UserPlus, ArrowLeft } from "lucide-react";
import { useAuth } from "../useAuth";

const FS = "'Playfair Display', Georgia, serif";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setLoading(true);
    try {
      await register(username.trim(), email.trim(), password);
      navigate("/community");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message === "HTTP 400"
          ? "Tên đăng nhập hoặc email đã tồn tại."
          : message === "HTTP 422"
            ? "Thông tin không hợp lệ. Vui lòng kiểm tra lại."
            : "Không thể kết nối đến server. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center px-4 py-16" style={{ minHeight: "calc(100vh - 73px)", background: "#f5f0e8" }}>
      <div className="w-full max-w-md">
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: "#fff", border: "1.5px solid #e4ddd0", boxShadow: "0 16px 48px rgba(45,90,39,0.1)" }}
        >
          {/* Header band */}
          <div className="relative px-8 py-8 text-center overflow-hidden" style={{ background: "linear-gradient(135deg, #1c2e14 0%, #2d5a27 55%, #7ab648 100%)" }}>
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
              <Leaf className="w-7 h-7 text-white" />
            </div>
            <h1 style={{ fontFamily: FS, fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              Tạo Tài Khoản
            </h1>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14 }}>
              Tham gia cộng đồng chia sẻ kiến thức cây thuốc
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8">
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm mb-5" style={{ background: "#fdeeee", color: "#c0392b", fontWeight: 600 }}>
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: "#3d5c35", fontWeight: 600 }}>
                  Tên đăng nhập *
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#7ab648" }} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Chọn tên đăng nhập..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: "#fff", border: "1.5px solid #e4ddd0", color: "#1c2e14", caretColor: "#2d5a27" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#e4ddd0")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1.5" style={{ color: "#3d5c35", fontWeight: 600 }}>
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#7ab648" }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Nhập địa chỉ email..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: "#fff", border: "1.5px solid #e4ddd0", color: "#1c2e14", caretColor: "#2d5a27" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#e4ddd0")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1.5" style={{ color: "#3d5c35", fontWeight: 600 }}>
                  Mật khẩu *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#7ab648" }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Ít nhất 6 ký tự..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: "#fff", border: "1.5px solid #e4ddd0", color: "#1c2e14", caretColor: "#2d5a27" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#e4ddd0")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1.5" style={{ color: "#3d5c35", fontWeight: 600 }}>
                  Xác nhận mật khẩu *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#7ab648" }} />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Nhập lại mật khẩu..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ background: "#fff", border: "1.5px solid #e4ddd0", color: "#1c2e14", caretColor: "#2d5a27" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#e4ddd0")}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !username || !email || !password || !confirm}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm transition-all"
                style={{
                  background: !loading && username && email && password && confirm ? "#2d5a27" : "#eaf0e4",
                  color: !loading && username && email && password && confirm ? "#fff" : "#a3b39a",
                  fontWeight: 700,
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#1e3f1a"; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#2d5a27"; }}
              >
                {loading ? (
                  <span style={{ animation: "spin 1s linear infinite" }}>
                    <Leaf className="w-4 h-4" />
                  </span>
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
              </button>
            </div>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 mt-6 px-5 py-3 rounded-xl text-sm no-underline transition-all"
              style={{ background: "#eaf0e4", color: "#2d5a27", fontWeight: 600 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#d7e8cd")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#eaf0e4")}
            >
              <ArrowLeft className="w-4 h-4" />
              Đã có tài khoản? Đăng nhập
            </Link>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}