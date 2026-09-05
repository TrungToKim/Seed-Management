import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Leaf,
  User as UserIcon,
  LogOut,
  Shield,
  Menu,
  X,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../useAuth";
import { getAvatarUrl, getGuestFavorites, apiFetch } from "../api";

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [favCount, setFavCount] = useState<number>(0);

  useEffect(() => {
    // Update favorite count
    if (user) {
      apiFetch<any[]>("/api/favorites")
        .then((res) => setFavCount(res.length))
        .catch(() => setFavCount(0));
    } else {
      setFavCount(getGuestFavorites().length);
    }
  }, [user, location.pathname]);

  const navLinks = [
    { label: "Trang chủ", path: "/" },
    { label: "Tra cứu cây", path: "/plants" },
    { label: "Bài viết", path: "/articles" },
    { label: "AI Nhận diện", path: "/ai-recognition", badge: "AI" },
    { label: "Cây đã lưu", path: "/favorites", count: favCount },
    { label: "Hỏi đáp AI", path: "/chat" },
    { label: "Cộng đồng", path: "/community" },
  ];

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-emerald-900/10 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl md:text-2xl text-emerald-950 tracking-tight block leading-none">
                THỰC VẬT VIỆT
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold tracking-wider uppercase block mt-0.5">
                Cơ sở dữ liệu dược liệu
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    active
                      ? "text-emerald-800 bg-emerald-50 font-semibold"
                      : "text-slate-600 hover:text-emerald-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                      {link.badge}
                    </span>
                  )}
                  {link.count !== undefined && link.count > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {link.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Auth / Action Section */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pl-3 rounded-full border border-slate-200 hover:border-emerald-500 transition-colors bg-white shadow-2xs"
                >
                  <span className="text-xs font-semibold text-slate-700 max-w-[100px] truncate">
                    {user.full_name || user.username}
                  </span>
                  {user.avatar_url ? (
                    <img
                      src={getAvatarUrl(user.avatar_url)}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover border border-emerald-500"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
                </button>

                {/* User Dropdown */}
                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-800">{user.full_name || user.username}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {user.role === "administrator" ? "Quản trị viên" : user.package_name || "Thành viên"}
                      </span>
                    </div>

                    <Link
                      to="/account"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      <UserIcon className="w-4 h-4 text-emerald-600" />
                      <span>Hồ sơ tài khoản</span>
                    </Link>

                    <Link
                      to="/packages"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Gói dịch vụ</span>
                    </Link>

                    {(user.is_admin || user.role === "administrator") && (
                      <Link
                        to="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-purple-700 hover:bg-purple-50 font-semibold"
                      >
                        <Shield className="w-4 h-4 text-purple-600" />
                        <span>Quản trị hệ thống</span>
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                        navigate("/");
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 text-left border-t border-slate-100 mt-1"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs shadow-emerald-700/30 transition-all hover:scale-105"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 rounded-xl hover:bg-slate-100"
              aria-label="Menu Mobile"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 px-4 pt-3 pb-6 space-y-2 animate-in fade-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${
                isActive(link.path)
                  ? "bg-emerald-50 text-emerald-800 font-bold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>{link.label}</span>
              {link.count !== undefined && link.count > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {link.count}
                </span>
              )}
            </Link>
          ))}

          <div className="pt-4 border-t border-slate-100">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{user.full_name || user.username}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                </div>
                {(user.is_admin || user.role === "administrator") && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm font-semibold text-purple-700 bg-purple-50 rounded-xl"
                  >
                    Quản trị Admin
                  </Link>
                )}
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                    navigate("/");
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center text-xs font-semibold text-white bg-emerald-700 rounded-xl"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
