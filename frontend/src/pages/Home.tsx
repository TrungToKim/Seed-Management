import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import {
  Leaf, ArrowRight, TreeDeciduous, Flower2,
  Sprout, Search, Star, BookOpen, MessageCircle, Shield, Droplets, Sun,
} from "lucide-react";

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

const STATS = [
  { value: "12,000+", label: "Loài cây", icon: TreeDeciduous, color: "#2d5a27" },
  { value: "850+", label: "Cây dược liệu", icon: Leaf, color: "#7ab648" },
  { value: "300+", label: "Cây hoa", icon: Flower2, color: "#c0392b" },
  { value: "50,000+", label: "Người dùng", icon: Sprout, color: "#8b6914" },
];

const CATEGORIES = [
  { label: "Cây bóng mát", icon: "🌳", count: 248, color: "#eaf4e3", border: "#a8d48a" },
  { label: "Cây hoa", icon: "🌸", count: 315, color: "#fdf0f0", border: "#f4a3a3" },
  { label: "Cây dược liệu", icon: "🌿", count: 189, color: "#f0faf0", border: "#90d890" },
  { label: "Cây ăn quả", icon: "🍃", count: 204, color: "#fffbea", border: "#f0c84a" },
  { label: "Cây cảnh", icon: "🪴", count: 432, color: "#f0f4ff", border: "#9aabf4" },
  { label: "Thủy sinh", icon: "💧", count: 97, color: "#e8f8ff", border: "#80cce8" },
];

const FEATURES = [
  { icon: BookOpen, title: "Bách khoa thực vật", desc: "Cơ sở dữ liệu 12,000+ loài cây với mô tả chi tiết, hình ảnh, phân loại khoa học.", color: "#2d5a27" },
  { icon: MessageCircle, title: "Chat AI chuyên gia", desc: "Hỏi đáp 24/7 với AI được huấn luyện từ hàng triệu tài liệu khoa học thực vật.", color: "#7ab648" },
  { icon: Shield, title: "Nhận diện cây độc", desc: "Cảnh báo các loài cây độc hại, nguy hiểm giúp bảo vệ gia đình và vật nuôi.", color: "#c0392b" },
  { icon: Droplets, title: "Hướng dẫn chăm sóc", desc: "Lịch tưới nước, bón phân, ánh sáng phù hợp cho từng loại cây cụ thể.", color: "#2980b9" },
  { icon: Sun, title: "Theo mùa vụ", desc: "Thông tin cây trồng theo mùa, thổ nhưỡng và vùng khí hậu Việt Nam.", color: "#e67e22" },
  { icon: Search, title: "Tìm kiếm thông minh", desc: "Tìm kiếm theo tên, tên khoa học, công dụng hoặc đặc điểm hình dáng.", color: "#9b59b6" },
];

export default function Home() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch<{ items: Plant[]; total: number }>("/api/plants?page_size=6")
      .then((data) => {
        setPlants(data.items);
        setTotal(data.total);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="overflow-hidden" style={{ background: "#f5f0e8" }}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url(https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=1600&h=700&fit=crop&auto=format)",
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(28,46,20,0.88) 0%, rgba(45,90,39,0.72) 50%, rgba(122,182,72,0.4) 100%)" }}
        />
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 C30 5 50 20 50 35 C50 47 41 55 30 55 C19 55 10 47 10 35 C10 20 30 5 30 5Z' fill='%23ffffff' opacity='0.3'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative px-6 py-28 max-w-[1280px] mx-auto">
          <div className="max-w-[620px]">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-6"
              style={{ background: "rgba(122,182,72,0.25)", border: "1px solid rgba(122,182,72,0.5)", color: "#c8f0a0" }}
            >
              <Sprout className="w-4 h-4" />
              <span style={{ fontWeight: 600 }}>Bách khoa thực vật Việt Nam</span>
            </div>
            <h1
              style={{
                fontFamily: FS,
                fontSize: "clamp(36px, 5vw, 58px)",
                color: "#fff",
                fontWeight: 700,
                lineHeight: 1.15,
                marginBottom: 20,
              }}
            >
              Khám phá thế giới{' '}
              <span style={{ color: "#a8e06a", fontStyle: "italic" }}>cây xanh</span>{' '}
              Việt Nam
            </h1>
            <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 17, lineHeight: 1.7, marginBottom: 32 }}>
              Tra cứu hàng nghìn loài thực vật, học cách chăm sóc cây, nhận diện
              cây độc và trò chuyện với AI chuyên gia thực vật học.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/plants"
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm no-underline transition-all"
                style={{ background: "#7ab648", color: "#fff", fontWeight: 700, fontSize: 15 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#5e9a32")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#7ab648")}
              >
                <TreeDeciduous className="w-4 h-4" />
                Tra cứu cây ngay
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/chat"
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm no-underline transition-all"
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600, fontSize: 15, border: "1.5px solid rgba(255,255,255,0.4)", backdropFilter: "blur(8px)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
              >
                <MessageCircle className="w-4 h-4" />
                Chat với AI
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ background: "#2d5a27" }}>
        <div className="px-6 py-5 max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(({ value, label, icon: Icon }, i) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p style={{ color: "#a8e06a", fontWeight: 800, fontSize: 20, lineHeight: 1 }}>
                  {i === 0 && total > 0 ? total.toLocaleString("vi-VN") + "+" : value}
                </p>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 500 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="px-6 py-14 max-w-[1280px] mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm uppercase tracking-widest mb-2" style={{ color: "#7ab648", fontWeight: 700 }}>Danh mục</p>
          <h2 style={{ fontFamily: FS, fontSize: "clamp(26px, 4vw, 38px)", color: "#1c2e14", fontWeight: 700 }}>
            Khám phá theo loại cây
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              to="/plants"
              className="flex flex-col items-center gap-2 p-5 rounded-2xl no-underline transition-all group"
              style={{ background: cat.color, border: `1.5px solid ${cat.border}` }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <span style={{ fontSize: 32 }}>{cat.icon}</span>
              <span style={{ color: "#1c2e14", fontWeight: 700, fontSize: 13, textAlign: "center" }}>{cat.label}</span>
              <span style={{ color: "#7ab648", fontSize: 11, fontWeight: 600 }}>{cat.count} loài</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured plants */}
      <section style={{ background: "#fff" }} className="px-6 py-14">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-sm uppercase tracking-widest mb-2" style={{ color: "#7ab648", fontWeight: 700 }}>Nổi bật</p>
              <h2 style={{ fontFamily: FS, fontSize: "clamp(24px, 3.5vw, 36px)", color: "#1c2e14", fontWeight: 700 }}>
                Cây được yêu thích nhất
              </h2>
            </div>
            <Link
              to="/plants"
              className="hidden md:flex items-center gap-1.5 text-sm no-underline transition-colors"
              style={{ color: "#2d5a27", fontWeight: 600 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#7ab648")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#2d5a27")}
            >
              Xem tất cả <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {plants.length === 0 ? (
            <div className="text-center py-16">
              <p style={{ fontSize: 40 }}>🌿</p>
              <p style={{ color: "#6b7c5e", fontSize: 16, marginTop: 8 }}>Đang tải cây thuốc nổi bật...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plants.map((plant) => (
                <div
                  key={plant.id}
                  onClick={() => navigate(`/plants/${plant.id}`)}
                  className="rounded-2xl overflow-hidden cursor-pointer transition-all"
                  style={{ border: "1.5px solid #e4ddd0", background: "#fff" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(45,90,39,0.15)";
                    e.currentTarget.style.borderColor = "#7ab648";
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "#e4ddd0";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <div className="relative h-52 overflow-hidden" style={{ background: "#e4ddd0" }}>
                    {plant.image_url ? (
                      <img src={plant.image_url} alt={plant.common_name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #e8f5e9, #c8e6c9)", fontSize: "3rem" }}>🌿</div>
                    )}
                    {plant.tags.length > 0 && (
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full text-xs text-white" style={{ background: "#2d5a27", fontWeight: 700 }}>
                          {plant.tags[0].tag_name}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.5)" }}>
                      <Star className="w-3 h-3" style={{ fill: "#f0c84a", color: "#f0c84a" }} />
                      <span className="text-white text-xs font-bold">4.9</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#7ab648", fontWeight: 600 }}>
                      {plant.family || "Thực vật"}
                    </p>
                    <h3 style={{ fontFamily: FS, fontSize: 20, fontWeight: 700, color: "#1c2e14", marginBottom: 4 }}>{plant.common_name}</h3>
                    {plant.scientific_name && (
                      <p className="text-xs italic mb-3" style={{ color: "#7ab648" }}>{plant.scientific_name}</p>
                    )}
                    {plant.description && (
                      <p className="text-sm leading-relaxed" style={{ color: "#5a6e52", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {plant.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex-1 h-px" style={{ background: "#eaf0e4" }} />
                      <span className="text-xs" style={{ color: "#7ab648", fontWeight: 600 }}>Xem chi tiết →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features grid */}
      <section className="px-6 py-14 max-w-[1280px] mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm uppercase tracking-widest mb-2" style={{ color: "#7ab648", fontWeight: 700 }}>Tính năng</p>
          <h2 style={{ fontFamily: FS, fontSize: "clamp(24px, 3.5vw, 36px)", color: "#1c2e14", fontWeight: 700 }}>
            Mọi thứ bạn cần về thực vật
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="p-6 rounded-2xl transition-all cursor-default"
              style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 8px 24px ${color}22`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e4ddd0"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}18` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <h3 style={{ fontFamily: FS, fontSize: 18, fontWeight: 700, color: "#1c2e14", marginBottom: 8 }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#6b7c5e" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-6 pb-16 max-w-[1280px] mx-auto">
        <div
          className="relative rounded-3xl overflow-hidden p-12 text-center"
          style={{ background: "linear-gradient(135deg, #1c2e14 0%, #2d5a27 50%, #3d7a30 100%)" }}
        >
          <div className="relative">
            <p className="text-sm uppercase tracking-widest mb-3" style={{ color: "#a8e06a", fontWeight: 700 }}>🌿 Chat AI miễn phí</p>
            <h2 style={{ fontFamily: FS, fontSize: "clamp(24px, 3.5vw, 38px)", color: "#fff", fontWeight: 700, marginBottom: 12 }}>
              Có thắc mắc về cây? Hỏi ngay AI!
            </h2>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 16, marginBottom: 32 }}>
              AI được huấn luyện từ hàng triệu tài liệu khoa học thực vật học. Trả lời 24/7.
            </p>
            <div className="flex justify-center">
              <Link
                to="/chat"
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm no-underline transition-all"
                style={{ background: "#7ab648", color: "#fff", fontWeight: 700 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#5e9a32")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#7ab648")}
              >
                <MessageCircle className="w-4 h-4" />
                Bắt đầu chat
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
