import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch, apiFetchRaw, type AuthUser, getAvatarUrl } from "../api";
import { useAuth } from "../useAuth";
import { Loader, Save, Eye, EyeOff, Camera, AlertCircle, CheckCircle } from "lucide-react";

const FS = "'Playfair Display', Georgia, serif";
const FF = "'Nunito', system-ui, sans-serif";

export default function Account() {
  const { user, token, logout } = useAuth();
  const [profile, setProfile] = useState<Partial<AuthUser> & { full_name?: string; avatar_url?: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (user) {
      setProfile({
        username: user.username,
        email: user.email,
        full_name: (user as any).full_name || "",
        avatar_url: (user as any).avatar_url || "",
      });
    }
    setLoading(false);
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        showToast("Vui lòng chọn file hình ảnh", "error");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showToast("Ảnh không được vượt quá 2MB", "error");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("username", profile.username || "");
      formData.append("email", profile.email || "");
      if (profile.full_name) formData.append("full_name", profile.full_name);
      if (avatarFile) formData.append("avatar", avatarFile);

      const res = await apiFetchRaw("/api/auth/me", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Cập nhật thất bại");
      }

      const updatedUser = await res.json();
      const stored = localStorage.getItem("tv_auth_user");
      if (stored) {
        localStorage.setItem("tv_auth_user", JSON.stringify({ ...JSON.parse(stored), ...updatedUser }));
      }
      showToast("Đã lưu thông tin cá nhân", "success");
    } catch (err: any) {
      showToast(err.message || "Có lỗi xảy ra", "error");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!passwordData.new || passwordData.new.length < 6) {
      showToast("Mật khẩu mới phải có ít nhất 6 ký tự", "error");
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      showToast("Mật khẩu xác nhận không khớp", "error");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await apiFetchRaw("/api/auth/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: passwordData.current,
          new_password: passwordData.new,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Đổi mật khẩu thất bại");
      }
      showToast("Đã đổi mật khẩu thành công", "success");
      setPasswordData({ current: "", new: "", confirm: "" });
    } catch (err: any) {
      showToast(err.message || "Có lỗi xảy ra", "error");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="px-6 py-12 max-w-[1280px] mx-auto flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin" style={{ color: "#7ab648" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-6 py-12 max-w-[1280px] mx-auto text-center">
        <p style={{ color: "#6b7c5e", fontSize: 16 }}>Vui lòng đăng nhập để truy cập trang này.</p>
        <Link to="/login" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl no-underline" style={{ background: "#2d5a27", color: "#fff", fontWeight: 600 }}>
          Đăng nhập
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "Thông tin cá nhân", icon: <span style={{ fontSize: 16 }}>👤</span> },
    { id: "password", label: "Đổi mật khẩu", icon: <span style={{ fontSize: 16 }}>🔒</span> },
    { id: "avatar", label: "Ảnh đại diện", icon: <Camera className="w-4 h-4" /> },
  ];

  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="px-6 py-12 max-w-[1280px] mx-auto">
      <div className="mb-10">
        <p className="text-sm uppercase tracking-widest mb-2" style={{ color: "#7ab648", fontWeight: 700 }}>
          Tài khoản
        </p>
        <h1 style={{ fontFamily: FS, fontSize: "clamp(28px, 4vw, 44px)", color: "#1c2e14", fontWeight: 700 }}>
          Cài đặt tài khoản
        </h1>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-3xl p-6" style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}>
            <div className="flex items-center gap-4 mb-6">
              {profile.avatar_url ? (
                <img
                  src={getAvatarUrl(profile.avatar_url)}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0" style={{ background: "#7ab648" }}>
                  {(profile.full_name || user.username).slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-lg truncate" style={{ color: "#1c2e14" }}>{user.username}</p>
                <p className="text-sm" style={{ color: "#6b7c5e" }}>{user.email}</p>
                <p className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block" style={{ background: user.is_admin ? "#fef3c7" : "#eaf0e4", color: user.is_admin ? "#92400e" : "#2d5a27" }}>
                  {user.role === "administrator" ? "Quản trị viên" : user.role === "help" ? "Hỗ trợ" : "Thành viên"}
                </p>
              </div>
            </div>
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                    activeTab === tab.id
                      ? "text-white"
                      : ""
                  }`}
                  style={{
                    background: activeTab === tab.id ? "#2d5a27" : "transparent",
                    color: activeTab === tab.id ? "#fff" : "#3d5c35",
                    fontWeight: activeTab === tab.id ? 700 : 500,
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
            <button
              onClick={handleLogout}
              className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-colors"
              style={{ background: "#fff", color: "#c0392b", fontWeight: 600, border: "1.5px solid #fecaca" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              <span style={{ fontSize: 16 }}>🚪</span>
              Đăng xuất
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="rounded-3xl p-6 md:p-8" style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}>
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ fontFamily: FS, fontSize: 22, fontWeight: 700, color: "#1c2e14" }}>Thông tin cá nhân</h2>
              </div>

            <div className="space-y-5 max-w-xl">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: "#3d5c35", fontWeight: 600 }}>Tên người dùng</label>
                <input
                  type="text"
                  name="username"
                  value={profile.username || ""}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-3 rounded-xl text-base focus:outline-none"
                  style={{ background: "#fafafa", border: "1.5px solid #e4ddd0", color: "#1c2e14", caretColor: "#2d5a27" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e4ddd0")}
                />
              </div>

              <div>
                <label className="block text-sm mb-1.5" style={{ color: "#3d5c35", fontWeight: 600 }}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={profile.email || ""}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-3 rounded-xl text-base focus:outline-none"
                  style={{ background: "#fafafa", border: "1.5px solid #e4ddd0", color: "#1c2e14", caretColor: "#2d5a27" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e4ddd0")}
                />
              </div>

              <div>
                <label className="block text-sm mb-1.5" style={{ color: "#3d5c35", fontWeight: 600 }}>Họ và tên</label>
                <input
                  type="text"
                  name="full_name"
                  value={profile.full_name || ""}
                  onChange={handleProfileChange}
                  placeholder="Nhập họ và tên"
                  className="w-full px-4 py-3 rounded-xl text-base focus:outline-none"
                  style={{ background: "#fafafa", border: "1.5px solid #e4ddd0", color: "#1c2e14", caretColor: "#2d5a27" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e4ddd0")}
                />
              </div>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full md:w-auto mt-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: "#2d5a27", color: "#fff" }}
                onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = "#1e3f1a"; }}
                onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = "#2d5a27"; }}
              >
                {saving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin inline mr-2" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 inline mr-2" />
                    Lưu thay đổi
                  </>
                )}
            </div>
          )}

          {/* Password Tab */}
          {activeTab === "password" && (
            <div className="rounded-3xl p-6 md:p-8" style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}>
              <h2 style={{ fontFamily: FS, fontSize: 22, fontWeight: 700, color: "#1c2e14", marginBottom: 24 }}>Đổi mật khẩu</h2>

            <div className="space-y-5 max-w-xl">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: "#3d5c35", fontWeight: 600 }}>Mật khẩu hiện tại</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={passwordData.current}
                    onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-base focus:outline-none pr-12"
                    style={{ background: "#fafafa", border: "1.5px solid #e4ddd0", color: "#1c2e14", caretColor: "#2d5a27" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#e4ddd0")}
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1.5" style={{ color: "#3d5c35", fontWeight: 600 }}>Mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={passwordData.new}
                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-base focus:outline-none pr-12"
                    style={{ background: "#fafafa", border: "1.5px solid #e4ddd0", color: "#1c2e14", caretColor: "#2d5a27" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#e4ddd0")}
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1.5" style={{ color: "#3d5c35", fontWeight: 600 }}>Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-base focus:outline-none pr-12"
                    style={{ background: "#fafafa", border: "1.5px solid #e4ddd0", color: "#1c2e14", caretColor: "#2d5a27" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#e4ddd0")}
                    placeholder="Nhập lại mật khẩu mới"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                onClick={changePassword}
                disabled={passwordSaving}
                className="w-full md:w-auto mt-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: "#2d5a27", color: "#fff" }}
                onMouseEnter={(e) => { if (!passwordSaving) e.currentTarget.style.background = "#1e3f1a"; }}
                onMouseLeave={(e) => { if (!passwordSaving) e.currentTarget.style.background = "#2d5a27"; }}
              >
                {passwordSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin inline mr-2" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 inline mr-2" />
                    Đổi mật khẩu
                  </>
                )}
              </button>
            </div>
          )}

          {/* Avatar Tab */}
          {activeTab === "avatar" && (
            <div className="rounded-3xl p-6 md:p-8" style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}>
              <h2 style={{ fontFamily: FS, fontSize: 22, fontWeight: 700, color: "#1c2e14", marginBottom: 24 }}>Ảnh đại diện</h2>

              <div className="max-w-xl space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center text-5xl font-bold text-white flex-shrink-0" style={{ background: "#7ab648" }}>
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : profile.avatar_url ? (
                        <img src={getAvatarUrl(profile.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        (profile.full_name || user.username).slice(0, 1).toUpperCase()
                      )}
                    </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110" style={{ background: "#2d5a27", boxShadow: "0 4px 12px rgba(45,90,39,0.3)" }}>
                    <Camera className="w-4 h-4 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </label>
                </div>
                <div>
                  <p style={{ color: "#3d5c35", fontWeight: 600, fontSize: 15 }}>Ảnh đại diện hiện tại</p>
                  <p className="text-sm mt-1" style={{ color: "#6b7c5e" }}>Chọn ảnh mới để cập nhật (tối đa 2MB, định dạng JPG/PNG)</p>
                </div>
              </div>

              <button
                onClick={saveProfile}
                disabled={saving || !avatarFile}
                className="px-6 py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: avatarFile ? "#2d5a27" : "#e4ddd0", color: avatarFile ? "#fff" : "#999" }}
                onMouseEnter={(e) => { if (!saving && avatarFile) e.currentTarget.style.background = "#1e3f1a"; }}
                onMouseLeave={(e) => { if (!saving && avatarFile) e.currentTarget.style.background = "#2d5a27"; }}
              >
                {saving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin inline mr-2" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 inline mr-2" />
                    Cập nhật ảnh đại diện
                  </>
                )}
              </button>

              {profile.avatar_url && (
                <p className="text-sm" style={{ color: "#6b7c5e" }}>
                  Ảnh hiện tại: <a href={profile.avatar_url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#2d5a27" }}>Xem ảnh gốc</a>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div
          className="fixed z-[60] flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
          style={{
            top: 88,
            right: 20,
            color: "#fff",
            background: toast.type === "success" ? "#2d5a27" : "#c0392b",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            animation: "slideIn 0.3s ease",
          }}
        >
          {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}