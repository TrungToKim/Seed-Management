import { useEffect, useState } from "react";

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

const emptyForm = {
  common_name: "",
  scientific_name: "",
  family: "",
  region: "",
  image_url: "",
  description: "",
};

export default function Admin() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(
    null,
  );

  const showToast = (message: string, type: string) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Thêm tham số signal (không bắt buộc) để dùng với AbortController
  const fetchPlants = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      // Truyền signal vào options của fetch
      const res = await fetch("/api/plants?page_size=100", { signal });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      setPlants(data.items);
    } catch (error: any) {
      // Nếu lỗi là do chủ động hủy request thì bỏ qua
      if (error.name === "AbortError") {
        return;
      }
      console.error("Lỗi fetch plants:", error);
      showToast("Không thể tải danh sách", "error");
    } finally {
      // Chỉ tắt loading nếu request không bị huỷ
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    // Gọi API với signal từ controller
    fetchPlants(controller.signal);

    // Dọn dẹp request khi component unmount
    return () => {
      controller.abort();
    };
  }, []);

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
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(
        editingId ? "Cập nhật thành công" : "Thêm mới thành công",
        "success",
      );
      setShowForm(false);
      // Gọi lại fetchPlants không cần signal vì đây là request chủ động của user
      fetchPlants();
    } catch {
      showToast("Có lỗi xảy ra", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xoá?")) return;
    try {
      const res = await fetch(`/api/plants/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      showToast("Xoá thành công", "success");
      // Gọi lại fetchPlants không cần signal
      fetchPlants();
    } catch {
      showToast("Có lỗi xảy ra", "error");
    }
  };

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>
        Quản Trị Cây Thuốc
      </h1>

      <div className="admin-layout">
        <div className="admin-sidebar">
          <button className="active">Danh Sách Cây Thuốc</button>
          <button onClick={openCreate}>+ Thêm Cây Thuốc</button>
        </div>

        <div className="admin-content">
          {showForm && (
            <div className="modal-overlay" onClick={() => setShowForm(false)}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <h2>
                  {editingId ? "Chỉnh Sửa Cây Thuốc" : "Thêm Cây Thuốc Mới"}
                </h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Tên thường gọi *</label>
                    <input
                      required
                      value={form.common_name}
                      onChange={(e) =>
                        setForm({ ...form, common_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Tên khoa học</label>
                    <input
                      value={form.scientific_name}
                      onChange={(e) =>
                        setForm({ ...form, scientific_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Họ</label>
                    <input
                      value={form.family}
                      onChange={(e) =>
                        setForm({ ...form, family: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Khu vực</label>
                    <input
                      value={form.region}
                      onChange={(e) =>
                        setForm({ ...form, region: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>URL Hình ảnh</label>
                    <input
                      value={form.image_url}
                      onChange={(e) =>
                        setForm({ ...form, image_url: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Mô tả</label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      {editingId ? "Cập Nhật" : "Thêm Mới"}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ background: "#eee" }}
                      onClick={() => setShowForm(false)}
                    >
                      Huỷ
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading">Đang tải...</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên</th>
                  <th>Tên khoa học</th>
                  <th>Họ</th>
                  <th>Khu vực</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {plants.map((plant) => (
                  <tr key={plant.id}>
                    <td>{plant.id}</td>
                    <td>{plant.common_name}</td>
                    <td>{plant.scientific_name || "-"}</td>
                    <td>{plant.family || "-"}</td>
                    <td>{plant.region || "-"}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="btn btn-edit"
                          onClick={() => openEdit(plant)}
                        >
                          Sửa
                        </button>
                        <button
                          className="btn btn-delete"
                          onClick={() => handleDelete(plant.id)}
                        >
                          Xoá
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
