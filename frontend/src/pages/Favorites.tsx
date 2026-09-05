import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowRight, LogIn } from "lucide-react";
import PlantCard from "../components/PlantCard";
import SEO from "../components/SEO";
import type { Plant } from "../api";
import { getToken, getGuestFavorites, apiFetch } from "../api";

export default function FavoritesPage() {
  const token = getToken();
  const [favoritePlants, setFavoritePlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = () => {
    setLoading(true);
    if (token) {
      apiFetch<Plant[]>("/api/favorites")
        .then((res) => {
          setFavoritePlants(res);
          setLoading(false);
        })
        .catch(() => {
          setFavoritePlants([]);
          setLoading(false);
        });
    } else {
      const guestIds = getGuestFavorites();
      if (guestIds.length === 0) {
        setFavoritePlants([]);
        setLoading(false);
        return;
      }
      // Fetch details of guest favorite plant IDs
      Promise.all(
        guestIds.map((id) => apiFetch<Plant>(`/api/plants/${id}`).catch(() => null))
      ).then((res) => {
        const valid = res.filter((p): p is Plant => p !== null);
        setFavoritePlants(valid);
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [token]);

  const handleFavoriteToggle = (plantId: number, isFav: boolean) => {
    if (!isFav) {
      setFavoritePlants((prev) => prev.filter((p) => p.id !== plantId));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title="Cây Thuốc Đã Lưu - Bộ Sưu Tập Của Tôi"
        description="Quản lý danh sách các loài cây thuốc Nam bạn đã đánh dấu lưu lại để tiện tra cứu sau."
      />

      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
            <Heart className="w-4 h-4 fill-current" />
            <span>Bộ sưu tập cá nhân</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Danh Sách Cây Thuốc Đã Lưu ({favoritePlants.length})
          </h1>
          <p className="text-xs text-slate-500">
            {!token
              ? "Bạn đang lưu cục bộ trên trình duyệt. Đăng nhập để đồng bộ an toàn vào tài khoản!"
              : "Dữ liệu được lưu trữ an toàn trong tài khoản của bạn."}
          </p>
        </div>

        {!token && (
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập để đồng bộ</span>
          </Link>
        )}
      </div>

      {/* Grid or Empty state */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : favoritePlants.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favoritePlants.map((plant) => (
            <PlantCard key={plant.id} plant={{ ...plant, is_favorite: true }} onFavoriteToggle={handleFavoriteToggle} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center space-y-4 max-w-xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-lg">Chưa có cây thuốc nào được lưu</h3>
            <p className="text-xs text-slate-500">
              Nhấn vào biểu tượng trái tim khi xem thông tin cây thuốc để thêm vào danh sách yêu thích của bạn.
            </p>
          </div>
          <Link
            to="/plants"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md hover:bg-emerald-800"
          >
            <span>Khám phá cây thuốc ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
