import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, apiFetchRaw, type PackagePlan } from "../api";
import { useAuth } from "../useAuth";
import { Sparkles, Infinity as InfinityIcon, Check, Crown, MessageCircle, Users, Loader } from "lucide-react";

const FS = "'Playfair Display', Georgia, serif";

const TIER_STYLES: Record<string, { bg: string; border: string; badge: string; cta: string; ctaHover: string }> = {
  "Miễn phí": { bg: "#fff", border: "#e4ddd0", badge: "#f5f0e8", cta: "#eaf0e4", ctaHover: "#d7e8cd" },
  "Cơ bản": { bg: "#fff", border: "#7ab648", badge: "#eaf0e4", cta: "#2d5a27", ctaHover: "#1e3f1a" },
  "Premium": { bg: "#1c2e14", border: "#7ab648", badge: "#2e4a24", cta: "#7ab648", ctaHover: "#5e9a32" },
};

function priceText(pkg: PackagePlan) {
  if (pkg.monthly_price <= 0) return "Miễn phí";
  return `${pkg.monthly_price.toLocaleString("vi-VN")}đ`;
}

function limitText(value: number, suffix: string) {
  return value <= 0 ? `Không giới hạn ${suffix}` : `${value} lượt ${suffix}`;
}

export default function Packages() {
  const { user, token } = useAuth();
  const [packages, setPackages] = useState<PackagePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const showToast = (message: string, type: string) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    apiFetch<PackagePlan[]>("/api/packages")
      .then(setPackages)
      .catch(() => showToast("Không thể tải danh sách gói", "error"))
      .finally(() => setLoading(false));
  }, []);

  const subscribe = async (pkg: PackagePlan) => {
    if (!token) {
      showToast("Vui lòng đăng nhập để chọn gói", "error");
      return;
    }
    setSubscribing(pkg.id);
    try {
      const res = await apiFetchRaw("/api/me/package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: pkg.id }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(`Bạn đã chọn gói ${pkg.name}`, "success");
      const me = await apiFetchRaw("/api/auth/me");
      if (me.ok) {
        const meData = await me.json();
        const stored = localStorage.getItem("tv_auth_user");
        if (stored) {
          localStorage.setItem("tv_auth_user", JSON.stringify({ ...JSON.parse(stored), ...meData }));
        }
      }
    } catch {
      showToast("Có lỗi xảy ra khi chọn gói", "error");
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <div className="px-6 py-12 max-w-[1280px] mx-auto">
      <div className="text-center mb-12">
        <p className="text-sm uppercase tracking-widest mb-2" style={{ color: "#7ab648", fontWeight: 700 }}>
          Gói dịch vụ
        </p>
        <h1 style={{ fontFamily: FS, fontSize: "clamp(28px, 4vw, 44px)", color: "#1c2e14", fontWeight: 700 }}>
          Chọn gói phù hợp với nhu cầu
        </h1>
        <p style={{ color: "#6b7c5e", fontSize: 15, maxWidth: 560, margin: "10px auto 0" }}>
          Mỗi gói quy định tốc độ phản hồi và giới hạn lượt sử dụng AI chat cùng cộng đồng.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-16">
          <Loader className="w-8 h-8 animate-spin" style={{ color: "#7ab648" }} />
          <p style={{ color: "#6b7c5e", fontSize: 15, marginTop: 12 }}>Đang tải các gói...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1000px] mx-auto">
          {packages.map((pkg) => {
            const style = TIER_STYLES[pkg.name] ?? TIER_STYLES["Miễn phí"];
            const isCurrent = user?.package_id === pkg.id;
            const isFree = pkg.monthly_price <= 0;
            return (
              <div
                key={pkg.id}
                className="relative rounded-3xl p-7 flex flex-col transition-transform hover:-translate-y-1"
                style={{ background: style.bg, border: `1.5px solid ${style.border}`, boxShadow: "0 10px 30px rgba(28,46,20,0.08)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2
                    style={{
                      fontFamily: FS,
                      fontSize: 20,
                      fontWeight: 700,
                      color: pkg.name === "Premium" ? "#fff" : "#1c2e14",
                    }}
                  >
                    {pkg.name}
                  </h2>
                  {pkg.name === "Premium" && (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ background: "#7ab648", color: "#1c2e14", fontWeight: 700 }}>
                      <Crown className="w-3.5 h-3.5" /> Cao cấp
                    </span>
                  )}
                </div>

                <p className="text-sm leading-relaxed mb-5" style={{ color: pkg.name === "Premium" ? "#c8e6b0" : "#6b7c5e" }}>
                  {pkg.description || "Không có mô tả."}
                </p>

                <div className="mb-6">
                  <span style={{ fontFamily: FS, fontSize: 34, fontWeight: 700, color: pkg.name === "Premium" ? "#7ab648" : "#2d5a27" }}>
                    {priceText(pkg)}
                  </span>
                  <span style={{ color: "#999", fontSize: 13 }}>/tháng</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-2.5 text-sm" style={{ color: pkg.name === "Premium" ? "#e6f2dd" : "#3d5c35" }}>
                    <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: pkg.name === "Premium" ? "#7ab648" : "#7ab648" }} />
                    {limitText(pkg.chat_per_minute, "chat/phút")}
                  </li>
                  <li className="flex items-center gap-2.5 text-sm" style={{ color: pkg.name === "Premium" ? "#e6f2dd" : "#3d5c35" }}>
                    {pkg.chat_per_day <= 0 ? (
                      <InfinityIcon className="w-4 h-4 flex-shrink-0" style={{ color: "#7ab648" }} />
                    ) : (
                      <MessageCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#7ab648" }} />
                    )}
                    {limitText(pkg.chat_per_day, "chat/ngày")}
                  </li>
                  <li className="flex items-center gap-2.5 text-sm" style={{ color: pkg.name === "Premium" ? "#e6f2dd" : "#3d5c35" }}>
                    <Users className="w-4 h-4 flex-shrink-0" style={{ color: "#7ab648" }} />
                    {limitText(pkg.community_per_day, "bài/ngày")}
                  </li>
                  {!isFree && (
                    <li className="flex items-center gap-2.5 text-sm" style={{ color: pkg.name === "Premium" ? "#e6f2dd" : "#3d5c35" }}>
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#7ab648" }} />
                      Ưu tiên tốc độ phản hồi
                    </li>
                  )}
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl text-sm font-bold"
                    style={{ background: style.badge, color: pkg.name === "Premium" ? "#7ab648" : "#2d5a27" }}
                  >
                    Gói hiện tại
                  </button>
                ) : (
                  <button
                    onClick={() => subscribe(pkg)}
                    disabled={subscribing !== null}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                    style={{ background: style.cta, color: pkg.name === "Premium" ? "#1c2e14" : "#fff" }}
                    onMouseEnter={(e) => { if (!subscribing) e.currentTarget.style.background = style.ctaHover; }}
                    onMouseLeave={(e) => { if (!subscribing) e.currentTarget.style.background = style.cta; }}
                  >
                    {subscribing === pkg.id ? "Đang xử lý..." : user ? "Chọn gói này" : "Đăng nhập để chọn gói"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!user && (
        <p className="text-center mt-10 text-sm" style={{ color: "#6b7c5e" }}>
          Bạn chưa có tài khoản?{" "}
          <Link to="/register" className="no-underline font-bold" style={{ color: "#2d5a27" }}>
            Tạo tài khoản miễn phí
          </Link>
        </p>
      )}

      <div className="mt-12 rounded-3xl p-6" style={{ background: "#eaf0e4", border: "1px solid #d7e8cd" }}>
        <p className="text-sm" style={{ color: "#3d5c35", lineHeight: 1.7 }}>
          <strong>Ghi chú:</strong> Chọn gói hiện chỉ là đăng ký hạn mức sử dụng (chưa kết nối thanh toán thực tế).
          Admin có thể thay đổi gói của bất kỳ người dùng nào trong trang Quản trị.
        </p>
      </div>

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
    </div>
  );
}