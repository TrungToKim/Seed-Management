import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import {
  ArrowRight, TreeDeciduous, Flower2,
  Sprout, Search, BookOpen, Shield, Droplets, Sun, Tag as TagIcon,
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

const CATEGORY_ICON_MAP: Record<string, string> = {
  "Thanh nhiệt, giải độc": "🔥",
  "Bổ khí, dưỡng huyết": "🩸",
  "Bổ can thận, mạnh gân cốt": "💪",
  "Hóa đàm, chỉ khái": "🍃",
  "Khu phong, trừ thấp": "💨",
  "Hoạt huyết, tiêu thũng": "💧",
};

const CATEGORY_COLOR_MAP: Record<string, { color: string; border: string }> = {
  "Thanh nhiệt, giải độc": { color: "#fff1e6", border: "#f5b56b" },
  "Bổ khí, dưỡng huyết": { color: "#fdeeee", border: "#e28a8a" },
  "Bổ can thận, mạnh gân cốt": { color: "#eaf4e3", border: "#a8d48a" },
  "Hóa đàm, chỉ khái": { color: "#f0faf0", border: "#90d890" },
  "Khu phong, trừ thấp": { color: "#e8f4ff", border: "#8fbbe8" },
  "Hoạt huyết, tiêu thũng": { color: "#e8f8ff", border: "#80cce8" },
};

const FEATURES = [
  { icon: BookOpen, title: "Bách khoa cây thuốc", desc: "Cơ sở dữ liệu các loài cây thuốc Việt Nam với mô tả chi tiết, hình ảnh và phân loại khoa học.", color: "#2d5a27" },
  { icon: MessageCircle, title: "Chat AI chuyên gia", desc: "Hỏi đáp với AI tra cứu kho tài liệu cây thuốc đã được huấn luyện.", color: "#7ab648" },
  { icon: Shield, title: "Nhận diện cây độc", desc: "Cảnh báo các loài cây độc hại, nguy hiểm giúp bảo vệ gia đình và vật nuôi.", color: "#c0392b" },
  { icon: Droplets, title: "Hướng dẫn sử dụng", desc: "Công dụng, bài thuốc dân gian và cách sử dụng cho từng loại cây thuốc.", color: "#2980b9" },
  { icon: Sun, title: "Phân bố vùng miền", desc: "Thông tin cây thuốc theo khu vực, thổ nhưỡng và khí hậu Việt Nam.", color: "#e67e22" },
  { icon: Search, title: "Tìm kiếm thông minh", desc: "Tìm kiếm theo tên thường gọi, tên khoa học hoặc bộ phận sử dụng.", color: "#9b59b6" },
];

export default function Home() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [total, setTotal] = useState(0);
  const [tags, setTags] = useState<Tag[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch<{ items: Plant[]; total: number }>("/api/plants?page_size=6")
      .then((data) => {
        setPlants(data.items);
        setTotal(data.total);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    apiFetch<Tag[]>("/api/tags")
      .then(setTags)
      .catch(() => {});
  }, []);

  const categories = tags.map((tag) => [tag.tag_name, [tag.tag_name]] as const);

  const stats = [
    { value: total > 0 ? total.toLocaleString("vi-VN") + "+" : "—", label: "Loài cây thuốc", icon: TreeDeciduous, color: "#2d5a27" },
    { value: tags.length > 0 ? String(tags.length) : "—", label: "Nhóm công dụng", icon: TagIcon, color: "#7ab648" },
    { value: "1.000+", label: "Bài thuốc dân gian", icon: Flower2, color: "#c0392b" },
    { value: "24/7", label: "Hỗ trợ AI", icon: Sprout, color: "#8b6914" },
  ];

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
              <span style={{ fontWeight: 600 }}>Bách khoa cây thuốc Việt Nam</span>
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
              Khám phá kho tàng{' '}
              <span style={{ color: "#a8e06a", fontStyle: "italic" }}>cây thuốc</span>{' '}
              Việt Nam
            </h1>
            <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 17, lineHeight: 1.7, marginBottom: 32 }}>
              {total > 0
                ? `Tra cứu ${total.toLocaleString("vi-VN")}+ loài cây thuốc, học cách sử dụng, nhận diện cây độc và trò chuyện với AI.`
                : "Tra cứu các loài cây thuốc Việt Nam, học cách sử dụng, nhận diện cây độc và trò chuyện với AI."}
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
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ background: "#2d5a27" }}>
        <div className="px-6 py-5 max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ value, label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}>
                <Icon className="w-5 h-5 text-white" style={{ color: "rgba(255,255,255,0.9)" }} />
              </div>
              <div>
                <p style={{ color: "#a8e06a", fontWeight: 800, fontSize: 20, lineHeight: 1 }}>{value}</p>
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
            Khám phá theo công dụng
          </h2>
        </div>
        {categories.length === 0 ? (
          <div className="text-center py-10">
            <p style={{ fontSize: 36 }}>🌿</p>
            <p style={{ color: "#6b7c5e", fontSize: 15, marginTop: 8 }}>Đang tải danh mục...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map(([category, names]) => {
              const meta = CATEGORY_COLOR_MAP[category] ?? { color: "#f0faf0", border: "#90d890" };
              const icon = CATEGORY_ICON_MAP[category] ?? "🌿";
              return (
                <Link
                  key={category}
                  to={`/plants?tag=${encodeURIComponent(names[0])}`}
                  className="flex flex-col items-center gap-2 p-5 rounded-2xl no-underline transition-all group"
                  style={{ background: meta.color, border: `1.5px solid ${meta.border}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <span style={{ fontSize: 32 }}>{icon}</span>
                  <span style={{ color: "#1c2e14", fontWeight: 700, fontSize: 13, textAlign: "center" }}>{category}</span>
                  <span style={{ color: "#7ab648", fontSize: 11, fontWeight: 600 }}>Cây thuốc</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured plants */}
      <section style={{ background: "#fff" }} className="px-6 py-14">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-sm uppercase tracking-widest mb-2" style={{ color: "#7ab648", fontWeight: 700 }}>Nổi bật</p>
              <h2 style={{ fontFamily: FS, fontSize: "clamp(24px, 3.5vw, 36px)", color: "#1c2e14", fontWeight: 700 }}>
                Cây thuốc mới nhất
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
              <p style={{ color: "#6b7c5e", fontSize: 16, marginTop: 8 }}>Đang tải cây thuốc...</p>
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
                    {plant.region && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: "#3d5c35", fontWeight: 600 }}>
                        <Sprout className="w-3.5 h-3.5" style={{ color: "#7ab648" }} />
                        {plant.region}
                      </div>
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
            Mọi thứ bạn cần về cây thuốc
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
              Có thắc mắc về cây thuốc? Hỏi ngay AI!
            </h2>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 16, marginBottom: 0 }}>
              AI tra cứu kho tài liệu cây thuốc Việt Nam. Trả lời 24/7.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
