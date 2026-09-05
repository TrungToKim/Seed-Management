import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Heart,
  ChevronLeft,
  Share2,
  AlertTriangle,
  BookOpen,
  Maximize2,
  X,
  ShieldAlert,
} from "lucide-react";
import PlantCard from "../components/PlantCard";
import { PlantDetailSkeleton } from "../components/SkeletonLoader";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import SEO from "../components/SEO";
import type { Plant } from "../api";
import {
  getToken,
  isGuestFavorite,
  toggleGuestFavorite,
  apiFetch,
  getImageUrl,
} from "../api";

export default function PlantDetail() {
  const { id: idOrSlug } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = getToken();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [relatedPlants, setRelatedPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Gallery state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Active section tab
  const [activeTab, setActiveTab] = useState<"overview" | "uses" | "usage" | "precautions" | "references">("overview");

  useEffect(() => {
    if (!idOrSlug) return;
    setLoading(true);
    setError(null);

    Promise.all([
      apiFetch<Plant>(`/api/plants/${idOrSlug}`),
      apiFetch<Plant[]>(`/api/plants/${idOrSlug}/related`).catch(() => []),
    ])
      .then(([plantRes, relatedRes]) => {
        setPlant(plantRes);
        setRelatedPlants(relatedRes);
        setSelectedImage(getImageUrl(plantRes.image_url) || null);
        if (plantRes.is_favorite !== undefined) {
          setIsFav(plantRes.is_favorite);
        } else {
          setIsFav(isGuestFavorite(plantRes.id));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Không thể tải thông tin chi tiết cây thuốc.");
        setLoading(false);
      });
  }, [idOrSlug]);

  const handleToggleFavorite = async () => {
    if (!plant || favLoading) return;
    setFavLoading(true);
    const newFavState = !isFav;
    setIsFav(newFavState);

    if (token) {
      try {
        if (newFavState) {
          await apiFetch(`/api/favorites/${plant.id}`, { method: "POST" });
        } else {
          await apiFetch(`/api/favorites/${plant.id}`, { method: "DELETE" });
        }
      } catch {
        setIsFav(!newFavState);
      }
    } else {
      toggleGuestFavorite(plant.id);
    }
    setFavLoading(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: plant?.common_name,
        text: `Tra cứu cây thuốc Nam ${plant?.common_name} tại Thực Vật Việt`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Đã sao chép đường dẫn bài viết vào bộ nhớ tạm!");
    }
  };

  if (loading) return <PlantDetailSkeleton />;

  if (error || !plant) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy thông tin cây thuốc</h2>
        <p className="text-xs text-slate-500">{error || "Cây thuốc bạn tìm kiếm có thể đã bị xóa hoặc đường dẫn không hợp lệ."}</p>
        <Link
          to="/plants"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Quay lại danh sách</span>
        </Link>
      </div>
    );
  }

  // Combine plant images gallery
  const galleryImages: string[] = [];
  if (plant.image_url) galleryImages.push(getImageUrl(plant.image_url));
  if (plant.images && plant.images.length > 0) {
    plant.images.forEach((img) => {
      const formatted = getImageUrl(img.image_url);
      if (formatted && !galleryImages.includes(formatted)) {
        galleryImages.push(formatted);
      }
    });
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "name": plant.common_name,
    "about": {
      "@type": "MedicalTherapy",
      "name": plant.common_name,
      "code": plant.scientific_name,
    },
    "description": plant.description,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <SEO
        title={`${plant.common_name} (${plant.scientific_name || ""}) - Công Dụng & Cách Dùng`}
        description={`Tra cứu thông tin cây ${plant.common_name}: đặc điểm nhận dạng, bộ phận dùng, công dụng điều trị, cách dùng và lưu ý khi sử dụng.`}
        image={plant.image_url || undefined}
        structuredData={structuredData}
      />

      {/* Top Breadcrumb & Action bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="p-2.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Chia sẻ cây thuốc"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleFavorite}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs ${
              isFav
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-white border border-slate-200 text-slate-700 hover:border-red-400 hover:text-red-500"
            }`}
          >
            <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
            <span>{isFav ? "Đã lưu cây" : "Lưu cây yêu thích"}</span>
          </button>
        </div>
      </div>

      {/* Main Showcase Section (Gallery + Fast Info) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Column: Image Gallery & Lightbox Viewer */}
        <div className="space-y-4">
          <div className="relative aspect-4/3 rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 shadow-md group">
            <img
              src={selectedImage || plant.image_url || "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80"}
              alt={plant.common_name}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => setLightboxOpen(true)}
              className="absolute bottom-4 right-4 p-2.5 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
              title="Xem ảnh phóng to"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Gallery Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    selectedImage === img ? "border-emerald-600 scale-105" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Plant Primary Information */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Họ {plant.family || "Thực vật"}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">
              {plant.common_name}
            </h1>
            {plant.scientific_name && (
              <p className="text-sm font-serif italic text-slate-500 mt-1">
                Tên khoa học: {plant.scientific_name}
              </p>
            )}
            {plant.other_names && (
              <p className="text-xs text-slate-600 mt-2">
                <strong>Tên gọi khác:</strong> {plant.other_names}
              </p>
            )}
          </div>

          {/* Quick Facts Grid */}
          <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div className="p-3 bg-emerald-50/50 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase block">Bộ phận dùng</span>
              <p className="text-xs font-semibold text-slate-800">{plant.used_parts || "Toàn cây"}</p>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase block">Khu vực phân bố</span>
              <p className="text-xs font-semibold text-slate-800">{plant.region || "Toàn quốc Việt Nam"}</p>
            </div>
          </div>

          {/* Overview Description */}
          {plant.description && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 text-sm">Tổng quan sinh học</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-2xl border border-slate-100">
                {plant.description}
              </p>
            </div>
          )}

          {/* Plant Tags Badges */}
          {plant.tags && plant.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Nhóm công dụng chính</h3>
              <div className="flex flex-wrap gap-2">
                {plant.tags.map((t) => (
                  <span
                    key={t.id}
                    className="bg-emerald-700 text-white text-xs px-3 py-1 rounded-full font-medium"
                  >
                    #{t.tag_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Structured Content Tabs */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {[
            { id: "overview", label: "Đặc điểm & Phân bố" },
            { id: "uses", label: "Công dụng & Chủ trị" },
            { id: "usage", label: "Cách dùng & Liều lượng" },
            { id: "precautions", label: "Lưu ý & Cảnh báo", badge: "Quan trọng" },
            { id: "references", label: "Nguồn tham khảo" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-4 text-xs font-bold whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-emerald-700 text-emerald-800 bg-emerald-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="ml-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full uppercase">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="p-6 sm:p-8 space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Đặc điểm hình thái & Thành phần hóa học</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-800 text-sm">Thành phần hóa học</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {plant.chemical_components || "Chứa hợp chất Flavonoid, Saponin, Alkaloid và các vi chất dinh dưỡng tự nhiên."}
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-800 text-sm">Sinh thái & Phân bố</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Cây phát triển tốt tại khu vực đồi núi, vườn nhà khu vực khí hậu nhiệt đới gió mùa {plant.region || "Việt Nam"}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "uses" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Công dụng chữa bệnh trong Y học cổ truyền</h3>
              <div className="space-y-3">
                {plant.details && plant.details.length > 0 ? (
                  plant.details.map((d) => (
                    <div key={d.id} className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100">
                      <h4 className="font-bold text-emerald-900 text-sm capitalize">{d.section_type}</h4>
                      <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed">{d.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Theo Đông y, cây có tính mát, vị ngọt đắng nhẹ, quy kinh can phế, tác dụng thanh nhiệt giải độc, khu phong trừ thấp, bổ khí huyết.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "usage" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Cách dùng & Bài thuốc tham khảo</h3>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
                {plant.how_to_use || "Thường dùng dưới dạng sắc uống (10 - 20g/ngày dược liệu khô), ngâm rượu hoặc giã nát đắp ngoài da. Nên tham khảo liều lượng cụ thể từ bác sĩ."}
              </div>
            </div>
          )}

          {activeTab === "precautions" && (
            <div className="space-y-4">
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  <span>Cảnh báo an toàn y tế</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                  {plant.precautions || "Phụ nữ có thai, người có thể trạng hàn trệ hoặc đang dùng thuốc tây điều trị bệnh mạn tính tuyệt đối không tự ý dùng liều cao khi chưa hỏi ý kiến chuyên gia."}
                </p>
              </div>
              <MedicalDisclaimer />
            </div>
          )}

          {activeTab === "references" && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Nguồn tài liệu khoa học & Y học</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Cây thuốc và vị thuốc Việt Nam - NXB Y học (GS.Đỗ Tất Lợi)</span>
                </li>
                <li className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Từ điển cây thuốc Việt Nam - NXB Y học (Võ Văn Chi)</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Section: Related Plants */}
      {relatedPlants.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Đề xuất liên quan</span>
              <h2 className="text-2xl font-extrabold text-slate-900">Cây Thuốc Cùng Họ Hoặc Công Dụng</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {relatedPlants.slice(0, 3).map((rel) => (
              <PlantCard key={rel.id} plant={rel} />
            ))}
          </div>
        </section>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-3 bg-white/20 text-white rounded-full hover:bg-white/40"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={selectedImage} alt="" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}
