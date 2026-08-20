import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetchRaw } from "../api";
import { useAuth } from "../useAuth";
import { Plus, Pencil, Trash2, X, TreeDeciduous, RefreshCw, Leaf, Users, LogIn } from "lucide-react";

const FS = "'Playfair Display', Georgia, serif";

interface Tag {
  id: number;
  category: string;
  tag_name: string;
}

interface Plant {
  id: number;
  common_name: string;
  scientific_name: string | null;
  family: string | null;
  region: string | null;
  image_url: string | null;
  description: string | null;
  tags: Tag[];
}

interface SiteUser {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

const emptyForm = {
  common_name: "",
  scientific_name: "",
  family: "",
  region: "",
  image_url: "",
  description: "",
};

type FormField = { key: keyof typeof emptyForm; label: string; type: "input" | "textarea"; required?: boolean };

const FORM_FIELDS: FormField[] = [
  { key: "common_name", label: "Tên thường gọi *", type: "input", required: true },
  { key: "scientific_name", label: "Tên khoa học", type: "input" },
  { key: "family", label: "Họ", type: "input" },
  { key: "region", label: "Khu vực", type: "input" },
  { key: "image_url", label: "URL Hình ảnh", type: "input" },
  { key: "description", label: "Mô tả", type: "textarea" },
];

export default function Admin() {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  const [plants, setPlants] = useState<Plant[]>([]);
  const [users, setUsers] = useState<SiteUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(isAdmin);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const showToast = (message: string, type: string) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPlants = async (signal?: AbortSignal) => {
    try {
      const res = await apiFetchRaw("/api/plants?page_size=100", { signal });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setPlants(data.items);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Lỗi fetch plants:", error);
      showToast("Không thể tải danh sách", "error");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetchRaw("/api/plants?page_size=100", { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (!cancelled) setPlants(data.items);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        if (!cancelled) {
          console.error("Lỗi fetch plants:", error);
          showToast("Không thể tải danh sách", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await apiFetchRaw("/api/users");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setUsers(data);
    } catch {
      showToast("Không thể tải danh sách người dùng (cần quyền admin)", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetchRaw("/api/users");
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        setUsers(await res.json());
      } catch {
        if (!cancelled) showToast("Không thể tải danh sách người dùng (cần quyền admin)", "error");
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xoá tài khoản này?")) return;
    try {
      const res = await apiFetchRaw(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      showToast("Xoá tài khoản thành công", "success");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      showToast("Có lỗi xảy ra", "error");
    }
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (plant: Plant) => {
    setForm({
      common_name: plant.common_name,
      scientific_name: plant.scientific_name || "",
      family: plant.family || "",
      region: plant.region || "",
      image_url: plant.image_url || "",
      description: plant.description || "",
    });
    setEditingId(plant.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/plants/${editingId}` : "/api/plants";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await apiFetchRaw(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(editingId ? "Cập nhật thành công" : "Thêm mới thành công", "success");
      setShowForm(false);
      fetchPlants();
    } catch {
      showToast("Có lỗi xảy ra", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xoá?")) return;
    try {
      const res = await apiFetchRaw(`/api/plants/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      showToast("Xoá thành công", "success");
      fetchPlants();
    } catch {
      showToast("Có lỗi xảy ra", "error");
    }
  };

  return (
    <div className="px-6 py-10 max-w-[1280px] mx-auto">
      {!isAdmin && (
        <div className="text-center py-20 rounded-3xl" style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}>
          <p style={{ fontSize: 48 }}>🔒</p>
          <h2 style={{ fontFamily: FS, fontSize: 24, fontWeight: 700, color: "#1c2e14", marginTop: 12 }}>
            Cần quyền quản trị viên
          </h2>
          <p style={{ color: "#6b7c5e", fontSize: 15, marginTop: 8, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
            Trang quản trị chỉ dành cho tài khoản có quyền quản trị viên.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm no-underline mt-6 transition-all"
            style={{ background: "#2d5a27", color: "#fff", fontWeight: 700 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1e3f1a")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#2d5a27")}
          >
            <LogIn className="w-4 h-4" /> Đăng nhập tài khoản admin
          </Link>
        </div>
      )}

      {isAdmin && (
        <>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-sm uppercase tracking-widest mb-2" style={{ color: "#7ab648", fontWeight: 700 }}>Quản trị</p>
          <h1 style={{ fontFamily: FS, fontSize: "clamp(24px, 3.5vw, 36px)", color: "#1c2e14", fontWeight: 700 }}>
            Quản Trị Cây Thuốc
          </h1>
          <p style={{ color: "#6b7c5e", fontSize: 14 }}>
            Thêm, sửa và xoá các loại cây thuốc trong cơ sở dữ liệu.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm no-underline transition-all flex-shrink-0"
          style={{ background: "#2d5a27", color: "#fff", fontWeight: 700 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#1e3f1a")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#2d5a27")}
        >
          <Plus className="w-4 h-4" /> Thêm Cây Thuốc
        </button>
      </div>

      <div className="rounded-3xl overflow-hidden" style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #eaf0e4" }}>
          <div className="flex items-center gap-2">
            <TreeDeciduous className="w-4 h-4" style={{ color: "#7ab648" }} />
            <span style={{ color: "#1c2e14", fontWeight: 700, fontSize: 15 }}>Danh sách cây thuốc</span>
            <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#eaf0e4", color: "#2d5a27", fontWeight: 600 }}>
              {plants.length}
            </span>
          </div>
          <button
            onClick={() => fetchPlants()}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "#6b7c5e", background: "#f5f0e8" }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p style={{ fontSize: 36 }}>🌿</p>
            <p style={{ color: "#6b7c5e", fontSize: 15, marginTop: 8 }}>Đang tải...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#faf5f0" }}>
                  {["ID", "Tên", "Tên khoa học", "Họ", "Khu vực", "Thao tác"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs uppercase tracking-wider whitespace-nowrap"
                      style={{ color: "#6b7c5e", fontWeight: 700 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plants.map((plant, idx) => (
                  <tr
                    key={plant.id}
                    className="text-sm transition-colors"
                    style={{
                      borderTop: "1px solid #f0ece4",
                      background: idx % 2 === 0 ? "#fff" : "#fdfbf7",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#eaf0e4")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fdfbf7")}
                  >
                    <td className="px-6 py-3.5" style={{ color: "#999", fontWeight: 600 }}>{plant.id}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "#eaf0e4" }}>
                          {plant.image_url ? (
                            <img src={plant.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Leaf className="w-4 h-4" style={{ color: "#7ab648" }} />
                          )}
                        </div>
                        <span style={{ color: "#1c2e14", fontWeight: 700 }}>{plant.common_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 italic" style={{ color: "#7ab648" }}>{plant.scientific_name || "-"}</td>
                    <td className="px-6 py-3.5" style={{ color: "#5a6e52" }}>{plant.family || "-"}</td>
                    <td className="px-6 py-3.5" style={{ color: "#5a6e52" }}>{plant.region || "-"}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(plant)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                          style={{ background: "#eaf0e4", color: "#2d5a27", fontWeight: 600 }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#d7e8cd")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#eaf0e4")}
                        >
                          <Pencil className="w-3.5 h-3.5" /> Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(plant.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                          style={{ background: "#fdeeee", color: "#c0392b", fontWeight: 600 }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#fadcdc")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#fdeeee")}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Xoá
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Users management */}
      {isAdmin && (
        <div className="rounded-3xl overflow-hidden mt-8" style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #eaf0e4" }}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: "#7ab648" }} />
              <span style={{ color: "#1c2e14", fontWeight: 700, fontSize: 15 }}>Quản lý tài khoản</span>
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#eaf0e4", color: "#2d5a27", fontWeight: 600 }}>
                {users.length}
              </span>
            </div>
            <button
              onClick={fetchUsers}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: "#6b7c5e", background: "#f5f0e8" }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Làm mới
            </button>
          </div>

          {loadingUsers ? (
            <div className="text-center py-12">
              <p style={{ fontSize: 32 }}>👤</p>
              <p style={{ color: "#6b7c5e", fontSize: 15, marginTop: 8 }}>Đang tải...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#faf5f0" }}>
                    {["ID", "Tên đăng nhập", "Email", "Vai trò", "Ngày tạo", "Thao tác"].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs uppercase tracking-wider whitespace-nowrap"
                        style={{ color: "#6b7c5e", fontWeight: 700 }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <tr
                      key={u.id}
                      className="text-sm transition-colors"
                      style={{
                        borderTop: "1px solid #f0ece4",
                        background: idx % 2 === 0 ? "#fff" : "#fdfbf7",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#eaf0e4")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fdfbf7")}
                    >
                      <td className="px-6 py-3.5" style={{ color: "#999", fontWeight: 600 }}>{u.id}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                            style={{ background: "linear-gradient(135deg, #2d5a27 0%, #7ab648 100%)" }}
                          >
                            {u.username.slice(0, 1).toUpperCase()}
                          </div>
                          <span style={{ color: "#1c2e14", fontWeight: 700 }}>{u.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5" style={{ color: "#5a6e52" }}>{u.email}</td>
                      <td className="px-6 py-3.5">
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: u.is_admin ? "#eaf0e4" : "#f5f0e8",
                            color: u.is_admin ? "#2d5a27" : "#888",
                          }}
                        >
                          {u.is_admin ? "Admin" : "Thành viên"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5" style={{ color: "#5a6e52", fontSize: 13 }}>
                        {new Date(u.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-6 py-3.5">
                        {!u.is_admin && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                            style={{ background: "#fdeeee", color: "#c0392b", fontWeight: 600 }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#fadcdc")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#fdeeee")}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Xoá
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowForm(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl overflow-hidden"
            style={{ background: "#fff", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5" style={{ background: "#faf5f0", borderBottom: "1px solid #e4ddd0" }}>
              <h2 style={{ fontFamily: FS, fontSize: 20, fontWeight: 700, color: "#1c2e14" }}>
                {editingId ? "Chỉnh Sửa Cây Thuốc" : "Thêm Cây Thuốc Mới"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "#fff" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#eaf0e4")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >
                <X className="w-4 h-4" style={{ color: "#6b7c5e" }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {FORM_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm mb-1.5" style={{ color: "#3d5c35", fontWeight: 600 }}>
                      {field.label}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        value={form[field.key]}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        rows={4}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none resize-y"
                        style={{ background: "#fff", border: "1.5px solid #e4ddd0", color: "#1c2e14", caretColor: "#2d5a27" }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "#e4ddd0")}
                      />
                    ) : (
                      <input
                        required={field.required}
                        value={form[field.key]}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none"
                        style={{ background: "#fff", border: "1.5px solid #e4ddd0", color: "#1c2e14", caretColor: "#2d5a27" }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "#e4ddd0")}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-5 py-2.5 rounded-xl text-sm transition-all"
                  style={{ background: "#2d5a27", color: "#fff", fontWeight: 700 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1e3f1a")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#2d5a27")}
                >
                  {editingId ? "Cập Nhật" : "Thêm Mới"}
                </button>
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl text-sm transition-all"
                  style={{ background: "#eaf0e4", color: "#2d5a27", fontWeight: 600 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#d7e8cd")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#eaf0e4")}
                  onClick={() => setShowForm(false)}
                >
                  Huỷ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed z-[60] px-5 py-3 rounded-xl text-sm font-semibold"
          style={{
            top: 88,
            right: 20,
            color: "#fff",
            background: toast.type === "success" ? "#2d5a27" : "#c0392b",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            animation: "slideIn 0.3s ease",
          }}
        >
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
        </>
      )}
    </div>
  );
}