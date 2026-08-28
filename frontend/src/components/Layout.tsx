import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Leaf, TreeDeciduous, MessageCircle, Search, Menu, X, MessagesSquare, LogIn, LogOut, Crown } from "lucide-react";
import { useAuth } from "../useAuth";
import { getAvatarUrl } from "../api";

const FF = "'Nunito', system-ui, sans-serif";
const FS = "'Playfair Display', Georgia, serif";

const links = [
  { to: "/", label: "Trang chủ", icon: Leaf },
  { to: "/plants", label: "Tra cứu cây", icon: TreeDeciduous },
  { to: "/chat", label: "Chat AI", icon: MessageCircle },
  { to: "/community", label: "Cộng đồng", icon: MessagesSquare },
  { to: "/packages", label: "Gói dịch vụ", icon: Crown },
  { to: "/admin", label: "Quản trị", icon: Leaf },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/plants?search=${encodeURIComponent(search)}`);
    setMenuOpen(false);
  };

  const isChatRoute = location.pathname === "/chat";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f5f0e8", fontFamily: FF }}>
      <header
        className="sticky top-0 z-40"
        style={{
          background: "rgba(245, 240, 232, 0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(45,90,39,0.12)",
          boxShadow: "0 2px 16px rgba(45,90,39,0.06)",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 max-w-[1280px] mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 no-underline group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-12"
              style={{ background: "linear-gradient(135deg, #2d5a27 0%, #7ab648 100%)" }}
            >
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <span style={{ fontFamily: FS, fontWeight: 700, fontSize: 20, color: "#1c2e14", letterSpacing: "-0.3px" }}>
                Thực Vật
              </span>
              <span style={{ fontFamily: FS, fontStyle: "italic", fontSize: 20, color: "#7ab648", marginLeft: 4 }}>
                Việt
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => {
              // Hide admin link if user is not admin/help
              if (to === "/admin") {
                const hasAdminAccess = !!user && (user.role === "administrator" || user.role === "help" || user.is_admin);
                if (!hasAdminAccess) return null;
              }
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all no-underline"
                  style={{
                    background: active ? "#2d5a27" : "transparent",
                    color: active ? "#fff" : "#3d5c35",
                    fontWeight: active ? 700 : 500,
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#eaf0e4"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Search + CTA */}
          <div className="hidden md:flex items-center gap-3">
            <form className="relative" onSubmit={submitSearch}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#7ab648" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm cây..."
                className="pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none w-48 transition-all focus:w-64"
                style={{
                  background: "#eaf0e4",
                  color: "#1c2e14",
                  border: "1.5px solid transparent",
                  caretColor: "#2d5a27",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
              />
            </form>
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/account"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors no-underline"
                  style={{ background: "#eaf0e4" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#d7e8cd")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#eaf0e4")}
                >
                  {user.avatar_url ? (
                    <img
                      src={getAvatarUrl(user.avatar_url)}
                      alt={user.username}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: "#7ab648" }}
                    >
                      {user.username.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm max-w-[90px] truncate" style={{ color: "#2d5a27", fontWeight: 700 }}>
                    {user.username}
                  </span>
                </Link>
                <button
                  onClick={() => { logout(); navigate("/"); }}
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: "#6b7c5e", background: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#eaf0e4")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm no-underline transition-all"
                style={{ background: "#eaf0e4", color: "#2d5a27", fontWeight: 700 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#d7e8cd")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#eaf0e4")}
              >
                <LogIn className="w-4 h-4" />
                Đăng nhập
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg"
            style={{ color: "#2d5a27" }}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden px-4 pb-4 flex flex-col gap-1" style={{ borderTop: "1px solid rgba(45,90,39,0.1)" }}>
            <form className="relative my-2" onSubmit={submitSearch}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#7ab648" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm cây..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ background: "#eaf0e4", color: "#1c2e14", caretColor: "#2d5a27" }}
              />
            </form>
            {links.map(({ to, label, icon: Icon }) => {
              if (to === "/admin") {
                const hasAdminAccess = !!user && (user.role === "administrator" || user.role === "help" || user.is_admin);
                if (!hasAdminAccess) return null;
              }
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm no-underline"
                  style={{
                    background: active ? "#2d5a27" : "transparent",
                    color: active ? "#fff" : "#3d5c35",
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
            {user ? (
              <div className="flex items-center justify-between gap-2 mt-2 px-4 py-3 rounded-xl" style={{ background: "#eaf0e4" }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  {user.avatar_url ? (
                    <img
                      src={getAvatarUrl(user.avatar_url)}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: "#7ab648" }}>
                      {user.username.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "#2d5a27" }}>{user.username}</p>
                    <p className="text-xs" style={{ color: "#6b7c5e" }}>
                      {user.role === "administrator" ? "Quản trị viên" : user.role === "help" ? "Hỗ trợ" : "Thành viên"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { logout(); setMenuOpen(false); navigate("/"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors flex-shrink-0"
                  style={{ background: "#fff", color: "#c0392b", fontWeight: 600 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fdeeee")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm no-underline mt-2"
                style={{ background: "#2d5a27", color: "#fff", fontWeight: 700 }}
              >
                <LogIn className="w-4 h-4" />
                Đăng nhập / Tạo tài khoản
              </Link>
            )}
          </div>
        )}
      </header>

      <main className={isChatRoute ? "h-[calc(100vh-73px)] overflow-hidden" : "flex-1"}>
        <Outlet />
      </main>

      {/* Footer */}
      {!isChatRoute && (
        <footer style={{ background: "#1c2e14", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="px-6 py-10 max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#7ab648" }}>
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span style={{ fontFamily: FS, fontSize: 17, color: "#fff", fontWeight: 700 }}>
                Thực Vật <span style={{ color: "#7ab648", fontStyle: "italic" }}>Việt</span>
              </span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
              © {new Date().getFullYear()} Thực Vật Việt · Gìn giữ và phát triển kho tàng cây thuốc Việt Nam 🌿
            </p>
            <div className="flex gap-6">
              {["Giới thiệu", "Liên hệ", "Điều khoản"].map((link) => (
                <a key={link} href="#" className="text-sm no-underline" style={{ color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#7ab648")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
