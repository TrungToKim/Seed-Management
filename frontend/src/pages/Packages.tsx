import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, apiFetchRaw, type PackagePlan } from "../api";
import { useAuth } from "../useAuth";
import { Sparkles, Infinity as InfinityIcon, Check, Crown, MessageCircle, Users, Loader, X, CreditCard, Landmark, QrCode } from "lucide-react";

const FS = "'Playfair Display', Georgia, serif";

const TIER_STYLES: Record<string, { bg: string; border: string; badge: string; cta: string; ctaHover: string }> = {
  "Miễn phí": { bg: "#fff", border: "#e4ddd0", badge: "#f5f0e8", cta: "#eaf0e4", ctaHover: "#d7e8cd" },
  "Cơ bản": { bg: "#fff", border: "#7ab648", badge: "#eaf0e4", cta: "#2d5a27", ctaHover: "#1e3f1a" },
  "Premium": { bg: "#1c2e14", border: "#7ab648", badge: "#2e4a24", cta: "#7ab648", ctaHover: "#5e9a32" },
};

function limitText(value: number, suffix: string) {
  return value <= 0 ? `Không giới hạn ${suffix}` : `${value} lượt ${suffix}`;
}

type DurationType = "Free" | "1" | "3" | "6" | "12";

export default function Packages() {
  const { user, token } = useAuth();
  const [packages, setPackages] = useState<PackagePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState<DurationType>("1");
  const [selectedPkg, setSelectedPkg] = useState<PackagePlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "bank" | "card">("qr");
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

  const getDiscountInfo = (pkgName: string, dur: DurationType) => {
    if (dur === "Free" || pkgName === "Miễn phí") return { discountPercent: 0, months: 1 };
    const months = parseInt(dur);
    if (dur === "3") {
      return { discountPercent: pkgName === "Premium" ? 10 : 5, months };
    }
    if (dur === "6") {
      return { discountPercent: pkgName === "Premium" ? 20 : 10, months };
    }
    if (dur === "12") {
      return { discountPercent: pkgName === "Premium" ? 30 : 15, months };
    }
    return { discountPercent: 0, months: 1 };
  };

  const handleSelectPlan = (pkg: PackagePlan) => {
    if (!token) {
      showToast("Vui lòng đăng nhập để chọn gói", "error");
      return;
    }
    setSelectedPkg(pkg);
  };

  const handlePay = async () => {
    if (!selectedPkg) return;
    setSubscribing(selectedPkg.id);
    try {
      const res = await apiFetchRaw("/api/me/package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: selectedPkg.id }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(`Đã thanh toán & nâng cấp gói ${selectedPkg.name} thành công!`, "success");
      
      const me = await apiFetchRaw("/api/auth/me");
      if (me.ok) {
        const meData = await me.json();
        const stored = localStorage.getItem("tv_auth_user");
        if (stored) {
          localStorage.setItem("tv_auth_user", JSON.stringify({ ...JSON.parse(stored), ...meData }));
        }
      }
      setSelectedPkg(null);
    } catch {
      showToast("Có lỗi xảy ra khi thực hiện thanh toán", "error");
    } finally {
      setSubscribing(null);
    }
  };

  // Filter packages by active duration choice
  const displayedPackages = packages.filter((pkg) => {
    if (duration === "Free") {
      return pkg.name === "Miễn phí";
    } else {
      return pkg.name !== "Miễn phí";
    }
  });

  return (
    <div className="px-6 py-12 max-w-[1280px] mx-auto">
      <div className="text-center mb-12">
        <p className="text-sm uppercase tracking-widest mb-2" style={{ color: "#7ab648", fontWeight: 700 }}>
          Gói dịch vụ
        </p>
        <h1 style={{ fontFamily: FS, fontSize: "clamp(28px, 4vw, 44px)", color: "#1c2e14", fontWeight: 700 }}>
          Chọn gói phù hợp với nhu cầu
        </h1>
        <p style={{ color: "#6b7c5e", fontSize: 15, maxWidth: 560, margin: "10px auto 24px" }}>
          Mỗi gói quy định tốc độ phản hồi và giới hạn lượt sử dụng AI chat cùng cộng đồng.
        </p>

        {/* Duration Selection Tabs */}
        <div className="inline-flex rounded-xl p-1.5" style={{ background: "#eaf0e4", border: "1.5px solid #d7e8cd" }}>
          {(["Free", "1", "3", "6", "12"] as DurationType[]).map((dur) => (
            <button
              key={dur}
              onClick={() => setDuration(dur)}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
              style={{
                background: duration === dur ? "#2d5a27" : "transparent",
                color: duration === dur ? "#fff" : "#3d5c35",
              }}
            >
              {dur === "Free" ? "Trải nghiệm Free" : dur === "1" ? "1 Tháng" : `${dur} Tháng`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-16">
          <Loader className="w-8 h-8 animate-spin" style={{ color: "#7ab648" }} />
          <p style={{ color: "#6b7c5e", fontSize: 15, marginTop: 12 }}>Đang tải các gói...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[800px] mx-auto">
          {displayedPackages.map((pkg) => {
            const style = TIER_STYLES[pkg.name] ?? TIER_STYLES["Miễn phí"];
            const isCurrent = user?.package_id === pkg.id;
            const isFree = pkg.monthly_price <= 0;
            
            const { discountPercent, months } = getDiscountInfo(pkg.name, duration);
            const originalMonthlyPrice = pkg.monthly_price;
            const discountedMonthlyPrice = originalMonthlyPrice * (1 - discountPercent / 100);
            const originalTotalPrice = originalMonthlyPrice * months;
            const discountedTotalPrice = discountedMonthlyPrice * months;
            const savings = originalTotalPrice - discountedTotalPrice;

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
                  {discountPercent > 0 ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ color: "#999", textDecoration: "line-through", fontSize: 16 }}>
                          {originalMonthlyPrice.toLocaleString("vi-VN")}đ
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: "#fdeeee", color: "#c0392b" }}>
                          Giảm {discountPercent}%
                        </span>
                      </div>
                      <div className="mt-1">
                        <span style={{ fontFamily: FS, fontSize: 34, fontWeight: 700, color: pkg.name === "Premium" ? "#7ab648" : "#2d5a27" }}>
                          {discountedMonthlyPrice.toLocaleString("vi-VN")}đ
                        </span>
                        <span style={{ color: "#999", fontSize: 13 }}>/tháng</span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: pkg.name === "Premium" ? "#c8e6b0" : "#6b7c5e" }}>
                        Tổng thanh toán cho {months} tháng: <strong style={{ color: pkg.name === "Premium" ? "#7ab648" : "#2d5a27" }}>{discountedTotalPrice.toLocaleString("vi-VN")}đ</strong> (Tiết kiệm {savings.toLocaleString("vi-VN")}đ)
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontFamily: FS, fontSize: 34, fontWeight: 700, color: pkg.name === "Premium" ? "#7ab648" : "#2d5a27" }}>
                        {isFree ? "Miễn phí" : `${originalMonthlyPrice.toLocaleString("vi-VN")}đ`}
                      </span>
                      {!isFree && <span style={{ color: "#999", fontSize: 13 }}>/tháng</span>}
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-2.5 text-sm" style={{ color: pkg.name === "Premium" ? "#e6f2dd" : "#3d5c35" }}>
                    <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: "#7ab648" }} />
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
                    onClick={() => handleSelectPlan(pkg)}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                    style={{ background: style.cta, color: pkg.name === "Premium" ? "#1c2e14" : "#fff" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = style.ctaHover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = style.cta; }}
                  >
                    {user ? "Chọn gói này" : "Đăng nhập để chọn gói"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal Window */}
      {selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[#f5f0e8] rounded-3xl w-full max-w-[500px] overflow-hidden shadow-2xl border border-[#e4ddd0]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#eaf0e4]">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#7ab648]" />
                <h3 style={{ fontFamily: FS, fontSize: 18, fontWeight: 700, color: "#1c2e14" }}>Thông tin thanh toán</h3>
              </div>
              <button onClick={() => setSelectedPkg(null)} className="p-1 rounded-full hover:bg-[#eaf0e4] text-[#6b7c5e]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {(() => {
                const { discountPercent, months } = getDiscountInfo(selectedPkg.name, duration);
                const originalMonthlyPrice = selectedPkg.monthly_price;
                const discountedMonthlyPrice = originalMonthlyPrice * (1 - discountPercent / 100);
                const discountedTotalPrice = discountedMonthlyPrice * months;
                const savings = (originalMonthlyPrice - discountedMonthlyPrice) * months;

                return (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-4 border border-[#e4ddd0]">
                      <div className="flex justify-between items-center pb-2 border-b border-[#faf5f0]">
                        <span className="text-sm text-[#6b7c5e] font-semibold">Gói đăng ký</span>
                        <span className="font-bold text-[#1c2e14]">{selectedPkg.name}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#faf5f0]">
                        <span className="text-sm text-[#6b7c5e] font-semibold">Thời hạn sử dụng</span>
                        <span className="font-bold text-[#2d5a27]">{months === 1 ? "1 Tháng" : `${months} Tháng`}</span>
                      </div>
                      {discountPercent > 0 && (
                        <div className="flex justify-between items-center py-2 border-b border-[#faf5f0]">
                          <span className="text-sm text-[#6b7c5e] font-semibold">Khuyến mãi</span>
                          <span className="text-xs px-2 py-0.5 rounded font-bold bg-[#fdeeee] text-[#c0392b]">- {discountPercent}%</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-sm font-bold text-[#1c2e14]">Tổng thanh toán</span>
                        <span className="text-xl font-black text-[#2d5a27]">{discountedTotalPrice.toLocaleString("vi-VN")}đ</span>
                      </div>
                      {savings > 0 && (
                        <p className="text-right text-xs text-[#7ab648] font-bold mt-1">Tiết kiệm {savings.toLocaleString("vi-VN")}đ</p>
                      )}
                    </div>

                    {/* Payment Method Selector */}
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-2 font-bold text-[#3d5c35]">Phương thức thanh toán</p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setPaymentMethod("qr")}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all"
                          style={{
                            background: paymentMethod === "qr" ? "#eaf0e4" : "#fff",
                            borderColor: paymentMethod === "qr" ? "#7ab648" : "#e4ddd0",
                            color: paymentMethod === "qr" ? "#2d5a27" : "#6b7c5e",
                          }}
                        >
                          <QrCode className="w-5 h-5" /> QR Code / MoMo
                        </button>
                        <button
                          onClick={() => setPaymentMethod("bank")}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all"
                          style={{
                            background: paymentMethod === "bank" ? "#eaf0e4" : "#fff",
                            borderColor: paymentMethod === "bank" ? "#7ab648" : "#e4ddd0",
                            color: paymentMethod === "bank" ? "#2d5a27" : "#6b7c5e",
                          }}
                        >
                          <Landmark className="w-5 h-5" /> Ngân hàng
                        </button>
                        <button
                          onClick={() => setPaymentMethod("card")}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all"
                          style={{
                            background: paymentMethod === "card" ? "#eaf0e4" : "#fff",
                            borderColor: paymentMethod === "card" ? "#7ab648" : "#e4ddd0",
                            color: paymentMethod === "card" ? "#2d5a27" : "#6b7c5e",
                          }}
                        >
                          <CreditCard className="w-5 h-5" /> Thẻ Quốc tế
                        </button>
                      </div>
                    </div>

                    {/* QR Code display mockup */}
                    {paymentMethod === "qr" && (
                      <div className="flex flex-col items-center p-4 bg-white rounded-2xl border border-[#e4ddd0]">
                        <div className="w-32 h-32 bg-[#eee] rounded-xl flex items-center justify-center font-bold text-[#888] border-2 border-dashed border-[#ccc]">
                          [MÃ QR MOCKUP]
                        </div>
                        <p className="text-xs text-[#6b7c5e] mt-2 text-center">Quét mã QR bằng ứng dụng ngân hàng hoặc ví MoMo để chuyển khoản.</p>
                      </div>
                    )}

                    {paymentMethod === "bank" && (
                      <div className="p-4 bg-white rounded-2xl border border-[#e4ddd0] text-xs space-y-1.5">
                        <p className="font-semibold text-[#1c2e14]">Thông tin chuyển khoản:</p>
                        <p className="text-[#6b7c5e]">Ngân hàng: <strong>MB Bank (Quân Đội)</strong></p>
                        <p className="text-[#6b7c5e]">Số tài khoản: <strong>098765432199</strong></p>
                        <p className="text-[#6b7c5e]">Chủ tài khoản: <strong>CONG TY THUC VAT VIET</strong></p>
                        <p className="text-[#6b7c5e]">Nội dung: <strong>TVV UPGRADE {user?.username}</strong></p>
                      </div>
                    )}

                    {paymentMethod === "card" && (
                      <div className="p-4 bg-white rounded-2xl border border-[#e4ddd0] space-y-2 text-xs">
                        <input type="text" placeholder="Số thẻ (Card Number)" className="w-full p-2 border rounded-lg focus:outline-none" style={{ borderColor: "#e4ddd0" }} />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" placeholder="MM/YY" className="p-2 border rounded-lg focus:outline-none" style={{ borderColor: "#e4ddd0" }} />
                          <input type="text" placeholder="CVV" className="p-2 border rounded-lg focus:outline-none" style={{ borderColor: "#e4ddd0" }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 px-6 py-4 bg-[#eaf0e4] border-t border-[#d7e8cd]">
              <button
                onClick={() => setSelectedPkg(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border border-[#2d5a27] bg-white text-[#2d5a27]"
              >
                Hủy
              </button>
              <button
                onClick={handlePay}
                disabled={subscribing !== null}
                className="flex-1 flex justify-center items-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all bg-[#2d5a27] hover:bg-[#1e3f1a]"
              >
                {subscribing ? <Loader className="w-4 h-4 animate-spin" /> : "Xác nhận thanh toán"}
              </button>
            </div>
          </div>
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
          <strong>Ghi chú:</strong> Nâng cấp gói sẽ áp dụng hạn mức sử dụng AI tương ứng ngay lập tức.
          Admin có thể thay đổi gói hoặc vai trò của người dùng trong trang Quản trị.
        </p>
      </div>

      {toast && (
        <div
          className="fixed z-[60] px-5 py-3 rounded-xl text-sm font-semibold text-white"
          style={{
            top: 88,
            right: 20,
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