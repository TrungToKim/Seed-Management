import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch, apiFetchRaw } from "../api";
import {
  Search, Star, Wind, Filter, X, BookOpen, ChevronLeft, ChevronRight, ArrowLeft,
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

interface PlantDetail {
  id: number;
  section_type: string;
  content: string;
  source_reference: string | null;
}

interface PlantFull extends Plant {
  details: PlantDetail[];
}

function PlantCard({ plant, onClick }: { plant: Plant; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl overflow-hidden cursor-pointer transition-all"
      style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#7ab648";
        e.currentTarget.style.boxShadow = "0 8px 28px rgba(45,90,39,0.13)";
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e4ddd0";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "none";
      }}
    >
      <div className="relative h-44 overflow-hidden" style={{ background: "#eaf0e4" }}>
        {plant.image_url ? (
          <img src={plant.image_url} alt={plant.common_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ fontSize: "3rem", color: "#2d6a4f" }}>🌿</div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 50%)" }} />
        {plant.tags.length > 0 && (
          <div className="absolute top-3 left-3">
            <span className="text-xs px-2.5 py-1 rounded-full text-white" style={{ background: "rgba(45,90,39,0.85)", fontWeight: 600 }}>
              {plant.tags[0].tag_name}
            </span>
          </div>
        )}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.55)" }}>
          <Star className="w-3 h-3" style={{ fill: "#f0c84a", color: "#f0c84a" }} />
          <span className="text-white text-xs font-bold">4.9</span>
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#7ab648", fontWeight: 600 }}>
          {plant.family || "Thực vật"}
        </p>
        <h3 style={{ fontFamily: FS, fontSize: 17, fontWeight: 700, color: "#1c2e14", marginBottom: 2 }}>{plant.common_name}</h3>
        {plant.scientific_name && (
          <p className="text-xs italic mb-3" style={{ color: "#7ab648" }}>{plant.scientific_name}</p>
        )}
        {plant.description && (
          <p className="text-sm leading-relaxed mb-4" style={{ color: "#5a6e52", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {plant.description}
          </p>
        )}
        {plant.region && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#3d5c35", fontWeight: 600 }}>
            <Wind className="w-3.5 h-3.5" style={{ color: "#7ab648" }} />
            {plant.region}
          </div>
        )}
      </div>
    </div>
  );
}

function PlantList() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const pageSize = 12;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";

  const updateSearch = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("search", value);
    else next.delete("search");
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  useEffect(() => {
    apiFetch<Tag[]>("/api/tags")
      .then(setTags)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (search) params.set("search", search);
    if (selectedTag) params.set("tag", selectedTag);

    apiFetch<{ items: Plant[]; total: number }>(`/api/plants?${params}`)
      .then((data) => {
        if (cancelled) return;
        setPlants(data.items);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, search, selectedTag]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar filter */}
      <aside
        className={`${showFilter ? "flex" : "hidden"} md:flex flex-col w-60 flex-shrink-0 overflow-y-auto p-5 sticky top-[73px] max-h-[calc(100vh-73px)]`}
        style={{ background: "#fff", borderRight: "1px solid #e4ddd0" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontFamily: FS, fontSize: 17, fontWeight: 700, color: "#1c2e14" }}>Bộ lọc</h3>
          <button className="md:hidden" onClick={() => setShowFilter(false)}><X className="w-4 h-4" style={{ color: "#6b7c5e" }} /></button>
        </div>

        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#7ab648", fontWeight: 700 }}>Loại cây</p>
          <div className="space-y-1">
            <button
              onClick={() => { setSelectedTag(""); setPage(1); setLoading(true); }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
              style={{
                background: selectedTag === "" ? "#2d5a27" : "transparent",
                color: selectedTag === "" ? "#fff" : "#3d5c35",
                fontWeight: selectedTag === "" ? 700 : 400,
              }}
              onMouseEnter={(e) => { if (selectedTag !== "") e.currentTarget.style.background = "#eaf0e4"; }}
              onMouseLeave={(e) => { if (selectedTag !== "") e.currentTarget.style.background = "transparent"; }}
            >
              Tất cả
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => { setSelectedTag(tag.tag_name); setPage(1); setLoading(true); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: selectedTag === tag.tag_name ? "#2d5a27" : "transparent",
                  color: selectedTag === tag.tag_name ? "#fff" : "#3d5c35",
                  fontWeight: selectedTag === tag.tag_name ? 700 : 400,
                }}
                onMouseEnter={(e) => { if (selectedTag !== tag.tag_name) e.currentTarget.style.background = "#eaf0e4"; }}
                onMouseLeave={(e) => { if (selectedTag !== tag.tag_name) e.currentTarget.style.background = "transparent"; }}
              >
                {tag.tag_name}
              </button>
            ))}
          </div>
        </div>

        {(selectedTag !== "") && (
          <button
            onClick={() => setSelectedTag("")}
            className="text-xs flex items-center gap-1.5 py-2"
            style={{ color: "#c0392b", fontWeight: 600 }}
          >
            <X className="w-3.5 h-3.5" /> Xóa bộ lọc
          </button>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1">
        {/* Header */}
        <div className="px-6 py-5 border-b sticky top-[73px] z-20" style={{ background: "#f5f0e8", borderColor: "#e4ddd0" }}>
          <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <h1 style={{ fontFamily: FS, fontSize: 24, fontWeight: 700, color: "#1c2e14" }}>
                Tra cứu cây
              </h1>
              <p style={{ color: "#6b7c5e", fontSize: 13 }}>
                Tìm thấy <strong style={{ color: "#2d5a27" }}>{total}</strong> loài cây
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm"
                style={{ background: "#eaf0e4", color: "#2d5a27", fontWeight: 600 }}
              >
                <Filter className="w-4 h-4" /> Lọc
              </button>
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#7ab648" }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => updateSearch(e.target.value)}
                  placeholder="Tìm tên cây, tên khoa học..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ background: "#fff", border: "1.5px solid #e4ddd0", color: "#1c2e14", caretColor: "#2d5a27" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#7ab648")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e4ddd0")}
                />
                {search && (
                  <button onClick={() => updateSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4" style={{ color: "#999" }} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="px-6 py-6">
          <div className="max-w-[1000px] mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}>
                    <div className="h-44" style={{ background: "#eaf0e4" }} />
                    <div className="p-4 space-y-2">
                      <div className="h-3 w-1/3 rounded" style={{ background: "#eaf0e4" }} />
                      <div className="h-4 w-2/3 rounded" style={{ background: "#e4ddd0" }} />
                      <div className="h-3 w-full rounded" style={{ background: "#eaf0e4" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : plants.length === 0 ? (
              <div className="text-center py-20">
                <p style={{ fontSize: 40 }}>🌿</p>
                <p style={{ color: "#6b7c5e", fontSize: 16, marginTop: 8 }}>Không tìm thấy cây nào phù hợp.</p>
                <button
                  onClick={() => { updateSearch(""); setSelectedTag(""); setPage(1); setLoading(true); }}
                  className="mt-4 px-4 py-2 rounded-xl text-sm"
                  style={{ background: "#2d5a27", color: "#fff", fontWeight: 600 }}
                >
                  Xóa tìm kiếm
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {plants.map((plant) => (
                  <PlantCard key={plant.id} plant={plant} onClick={() => navigate(`/plants/${plant.id}`)} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  disabled={page === 1}
                  onClick={() => { setPage(page - 1); setLoading(true); }}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-40"
                  style={{ border: "1.5px solid #e4ddd0", background: "#fff", color: "#2d5a27" }}
                >
                  <ChevronLeft className="w-4 h-4" /> Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPage(p); setLoading(true); }}
                    className="w-10 h-10 rounded-lg text-sm transition-all"
                    style={{
                      background: p === page ? "#2d5a27" : "#fff",
                      color: p === page ? "#fff" : "#3d5c35",
                      border: "1.5px solid #e4ddd0",
                      fontWeight: p === page ? 700 : 500,
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={page === totalPages}
                  onClick={() => { setPage(page + 1); setLoading(true); }}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-40"
                  style={{ border: "1.5px solid #e4ddd0", background: "#fff", color: "#2d5a27" }}
                >
                  Sau <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plant, setPlant] = useState<PlantFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetchRaw(`/api/plants/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setPlant(data);
      })
      .catch(() => navigate("/plants"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="px-6 py-16 max-w-[1280px] mx-auto">
        <div className="rounded-3xl overflow-hidden" style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}>
          <div className="h-80" style={{ background: "#eaf0e4" }} />
          <div className="p-8 space-y-3">
            <div className="h-5 w-1/2 rounded" style={{ background: "#e4ddd0" }} />
            <div className="h-4 w-1/3 rounded" style={{ background: "#eaf0e4" }} />
            <div className="h-4 w-full rounded" style={{ background: "#eaf0e4" }} />
          </div>
        </div>
      </div>
    );
  }
  if (!plant) return null;

  return (
    <div className="px-6 py-10 max-w-[1280px] mx-auto">
      <button
        onClick={() => navigate("/plants")}
        className="flex items-center gap-2 text-sm mb-6 transition-colors"
        style={{ color: "#2d5a27", fontWeight: 600 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#7ab648")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#2d5a27")}
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      {/* Header card */}
      <div className="rounded-3xl overflow-hidden" style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}>
        <div className="grid md:grid-cols-2 gap-0">
          <div className="relative min-h-[320px] flex items-center justify-center" style={{ background: plant.image_url ? "#eaf0e4" : "linear-gradient(135deg, #e8f5e9, #c8e6c9)" }}>
            {plant.image_url ? (
              <img src={plant.image_url} alt={plant.common_name} className="w-full h-full object-cover" style={{ position: "absolute", inset: 0 }} />
            ) : (
              <span style={{ fontSize: "5rem", color: "#2d6a4f" }}>🌿</span>
            )}
            {plant.tags.length > 0 && (
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {plant.tags.map((tag) => (
                  <span key={tag.id} className="px-3 py-1 rounded-full text-xs text-white" style={{ background: "rgba(45,90,39,0.85)", fontWeight: 600 }}>
                    {tag.tag_name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="p-8">
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#7ab648", fontWeight: 700 }}>
              {plant.family || "Thực vật"}
            </p>
            <h1 style={{ fontFamily: FS, fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, color: "#1c2e14", marginBottom: 4 }}>
              {plant.common_name}
            </h1>
            {plant.scientific_name && (
              <p className="italic mb-4" style={{ color: "#7ab648", fontSize: 16 }}>{plant.scientific_name}</p>
            )}
            {plant.region && (
              <div className="flex items-center gap-2 mb-6">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#eaf0e4" }}>
                  <Wind className="w-4 h-4" style={{ color: "#7ab648" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#6b7c5e" }}>Khu vực phân bố</p>
                  <p className="text-sm" style={{ color: "#1c2e14", fontWeight: 700 }}>{plant.region}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full" style={{ background: "#fffbea" }}>
                <Star className="w-4 h-4" style={{ fill: "#f0c84a", color: "#f0c84a" }} />
                <span style={{ fontWeight: 700, color: "#8b6914" }}>4.9</span>
              </div>
              <span className="px-3 py-1.5 rounded-full text-xs" style={{ background: "#eaf0e4", color: "#2d5a27", fontWeight: 600 }}>
                {plant.details.length} mục chi tiết
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {plant.description && (
        <div className="mt-8 rounded-3xl p-8" style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}>
          <h2 style={{ fontFamily: FS, fontSize: 22, fontWeight: 700, color: "#1c2e14", marginBottom: 12 }}>
            Giới thiệu
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "#3d5c35", fontSize: 15, lineHeight: 1.8 }}>{plant.description}</p>
        </div>
      )}

      {/* Details */}
      {plant.details.length > 0 && (
        <div className="mt-8">
          <h2 style={{ fontFamily: FS, fontSize: 22, fontWeight: 700, color: "#1c2e14", marginBottom: 16 }}>
            Chi tiết về {plant.common_name}
          </h2>
          <div className="space-y-4">
            {plant.details.map((detail) => (
              <div key={detail.id} className="rounded-2xl p-6" style={{ background: "#fff", border: "1.5px solid #e4ddd0" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#eaf0e4" }}>
                    <BookOpen className="w-4 h-4" style={{ color: "#2d5a27" }} />
                  </div>
                  <p className="text-sm" style={{ color: "#2d5a27", fontWeight: 700, textTransform: "capitalize" }}>
                    {detail.section_type}
                  </p>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#3d5c35", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                  {detail.content}
                </p>
                {detail.source_reference && (
                  <p className="text-xs mt-3 italic" style={{ color: "#999" }}>
                    Nguồn: {detail.source_reference}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlantPage() {
  const { id } = useParams();
  if (id) return <PlantDetail key={id} />;
  return <PlantList />;
}
