import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Sparkles,
  Leaf,
  ChevronRight,
  Camera,
  ArrowRight,
  Flame,
  Activity,
  HeartPulse,
  Brain,
  Feather,
  Zap,
} from "lucide-react";
import PlantCard from "../components/PlantCard";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import SEO from "../components/SEO";
import type { Plant, Article, AutocompletePlant } from "../api";
import { apiFetch } from "../api";

const CATEGORIES = [
  {
    name: "Thanh nhiệt - Giải độc",
    tag: "Thanh nhiệt",
    icon: Flame,
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Giảm mụn nhọt, rôm sảy, hỗ trợ chức năng gan thận.",
  },
  {
    name: "Trị ho - Long đờm",
    tag: "Trị ho",
    icon: Feather,
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Bổ phế, dịu họng, chữa ho gió, ho khan dai dẳng.",
  },
  {
    name: "Bổ khí huyết - An thần",
    tag: "Bổ khí huyết",
    icon: HeartPulse,
    color: "from-rose-500 to-red-600",
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    desc: "Tăng cường thể lực, bồi bổ suy nhược, giúp ngủ ngon.",
  },
  {
    name: "Xương khớp - Phong thấp",
    tag: "Xương khớp",
    icon: Activity,
    color: "from-indigo-500 to-blue-600",
    bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    desc: "Trị đau lưng mỏi gối, tê thấp, cứng khớp mùa lạnh.",
  },
  {
    name: "Tiêu hóa - Dạ dày",
    tag: "Tiêu hóa",
    icon: Zap,
    color: "from-teal-500 to-cyan-600",
    bg: "bg-teal-50 text-teal-700 border-teal-200",
    desc: "Giảm đầy hơi, ợ chua, viêm loét dạ dày tá tràng.",
  },
  {
    name: "An thần - Giảm Stress",
    tag: "An thần",
    icon: Brain,
    color: "from-purple-500 to-indigo-600",
    bg: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Dịu thần kinh, chữa mất ngủ, hồi hộp đánh trống ngực.",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompletePlant[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [featuredPlants, setFeaturedPlants] = useState<Plant[]>([]);
  const [latestArticles, setLatestArticles] = useState<Article[]>([]);
  const [loadingPlants, setLoadingPlants] = useState(true);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced Autocomplete (300ms)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      apiFetch<AutocompletePlant[]>(`/api/plants/autocomplete?q=${encodeURIComponent(searchTerm.trim())}`)
        .then((res) => {
          setSuggestions(res);
          setShowSuggestions(res.length > 0);
        })
        .catch(() => setSuggestions([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Close search suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Featured Plants & Articles
  useEffect(() => {
    setLoadingPlants(true);
    Promise.all([
      apiFetch<Plant[]>("/api/plants/featured"),
      apiFetch<{ items: Article[] }>("/api/articles?page=1&page_size=3"),
    ])
      .then(([plants, articlesRes]) => {
        setFeaturedPlants(plants);
        setLatestArticles(articlesRes.items || []);
      })
      .catch((err) => console.error("Error loading home data", err))
      .finally(() => setLoadingPlants(false));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setShowSuggestions(false);
      navigate(`/plants?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="space-y-12 md:space-y-20 pb-16">
      <SEO
        title="Trang chủ - Cơ sở dữ liệu Thực Vật Dược Liệu Việt Nam"
        description="Tra cứu cây thuốc Nam, nhận diện thực vật bằng AI, bài viết dược liệu uy tín chuẩn hóa."
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-emerald-950 via-emerald-900 to-teal-950 text-white overflow-hidden py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        {/* Background Decorative Accents */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -right-20 w-96 h-96 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-800/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md animate-in fade-in slide-in-from-top-3">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Kho tàng 10.000+ Cây thuốc & Thảo dược Việt Nam</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight text-white">
            Tra Cứu Dược Liệu Việt Nam <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 font-serif italic">
              Chính Xác & Chuẩn Hóa
            </span>
          </h1>

          <p className="text-base sm:text-lg text-emerald-100/80 max-w-2xl mx-auto font-normal leading-relaxed">
            Khám phá công dụng, tính vị, nhận diện đặc điểm sinh học và ứng dụng y học cổ truyền Việt Nam ngay trong tầm tay.
          </p>

          {/* Prominent Search Bar with Autocomplete */}
          <div ref={searchContainerRef} className="relative max-w-2xl mx-auto pt-2">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                placeholder="Nhập tên tiếng Việt (vd: Đinh lăng, Ngải cứu), tên khoa học, công dụng..."
                className="w-full pl-12 pr-28 py-4 rounded-2xl bg-white text-slate-800 placeholder-slate-400 text-sm md:text-base font-medium shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400/40 border-0"
              />
              <Search className="absolute left-4 w-5 h-5 text-emerald-700 pointer-events-none" />
              <button
                type="submit"
                className="absolute right-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs md:text-sm rounded-xl shadow-md transition-all hover:scale-105"
              >
                Tra cứu
              </button>
            </form>

            {/* Autocomplete Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 text-left animate-in fade-in slide-in-from-top-2">
                <div className="p-2 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4">
                  Gợi ý cây thuốc phù hợp ({suggestions.length})
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {suggestions.map((item) => (
                    <Link
                      key={item.id}
                      to={`/plants/${item.slug}`}
                      onClick={() => setShowSuggestions(false)}
                      className="flex items-center gap-3.5 px-4 py-3 hover:bg-emerald-50/80 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.common_name} className="w-full h-full object-cover" />
                        ) : (
                          <Leaf className="w-5 h-5 text-emerald-600 m-auto mt-2.5" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{item.common_name}</h4>
                        {item.scientific_name && (
                          <p className="text-xs text-slate-400 italic font-serif">{item.scientific_name}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Keyword Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-emerald-200/80">
            <span className="font-semibold text-emerald-400">Từ khóa hot:</span>
            {["Đinh lăng", "Ba kích", "Ngải cứu", "Hà thủ ô", "Actisô"].map((kw) => (
              <button
                key={kw}
                onClick={() => {
                  setSearchTerm(kw);
                  navigate(`/plants?search=${encodeURIComponent(kw)}`);
                }}
                className="px-3 py-1 rounded-full bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-700/50 transition-colors"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Health Disclaimer Banner */}
        <MedicalDisclaimer />

        {/* Section 1: Explore by Usage */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
            <div>
              <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Danh mục dược tính</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Khám Phá Theo Công Dụng Điều Trị
              </h2>
            </div>
            <Link
              to="/plants"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <span>Xem tất cả bộ lọc</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.tag}
                  to={`/plants?tag=${encodeURIComponent(cat.tag)}`}
                  className="group relative bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-start gap-4"
                >
                  <div className={`p-3 rounded-2xl shrink-0 ${cat.bg} border transition-transform group-hover:scale-110`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-base group-hover:text-emerald-700 transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{cat.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Section 2: Featured Medicinal Plants */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Cây thuốc tiêu biểu</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Cây Thuốc Nổi Bật / Phổ Biến
              </h2>
            </div>
            <Link
              to="/plants"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              <span>Xem thêm</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loadingPlants ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-72 bg-slate-100 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : featuredPlants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredPlants.slice(0, 8).map((plant) => (
                <PlantCard key={plant.id} plant={plant} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
              <Leaf className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Đang cập nhật danh sách cây thuốc nổi bật...</p>
            </div>
          )}
        </section>

        {/* Section 3: AI Feature Callout Banner */}
        <section className="relative bg-gradient-to-r from-teal-900 to-emerald-950 rounded-3xl p-8 md:p-12 text-white overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold">
              <Camera className="w-4 h-4" />
              <span>Độc quyền AI Công nghệ cao</span>
            </span>
            <h3 className="text-2xl md:text-3xl font-extrabold leading-tight">
              Nhận Diện Cây Thuốc Bằng Hình Ảnh AI
            </h3>
            <p className="text-xs md:text-sm text-teal-100/80 leading-relaxed">
              Bạn chụp được ảnh cây lạ trong vườn hoặc trên đồi núi? Tải ảnh lên để AI phân tích hoa, lá, thân và đưa ra gợi ý loài cây dược liệu phù hợp cùng các cảnh báo an toàn.
            </p>
            <div className="pt-2">
              <Link
                to="/ai-recognition"
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-400 text-teal-950 font-bold text-xs md:text-sm rounded-xl shadow-lg hover:bg-teal-300 transition-all hover:scale-105"
              >
                <Camera className="w-4 h-4" />
                <span>Thử ngay AI Nhận diện</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Section 4: Knowledge / Articles Section */}
        {latestArticles.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Cẩm nang sức khỏe</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Kiến Thức Dược Liệu & Y Học Cổ Truyền
                </h2>
              </div>
              <Link
                to="/articles"
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                <span>Tất cả bài viết</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {latestArticles.map((article) => (
                <Link
                  key={article.id}
                  to={`/articles/${article.slug}`}
                  className="group bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                >
                  <div className="aspect-16/9 bg-slate-100 overflow-hidden">
                    <img
                      src={article.image_url || "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80"}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {article.category}
                      </span>
                      <h3 className="font-bold text-slate-800 text-base group-hover:text-emerald-700 line-clamp-2">
                        {article.title}
                      </h3>
                      {article.summary && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {article.summary}
                        </p>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span>{article.author}</span>
                      <span>{new Date(article.created_at).toLocaleDateString("vi-VN")}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
