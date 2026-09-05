import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  RefreshCw,
  AlertCircle,
  Leaf,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import PlantCard from "../components/PlantCard";
import { PlantCardSkeleton } from "../components/SkeletonLoader";
import SEO from "../components/SEO";
import type { PlantListResponse } from "../api";
import { apiFetch } from "../api";

export default function PlantPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const tag = searchParams.get("tag") || "";
  const family = searchParams.get("family") || "";
  const usedPart = searchParams.get("used_part") || "";
  const region = searchParams.get("region") || "";
  const sortBy = searchParams.get("sort_by") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [searchInput, setSearchInput] = useState(search);
  const [plantsData, setPlantsData] = useState<PlantListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterOptions, setFilterOptions] = useState<{
    families: string[];
    tags: string[];
    used_parts: string[];
    regions: string[];
  }>({ families: [], tags: [], used_parts: [], regions: [] });

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync search input when URL changes
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Fetch filter options once
  useEffect(() => {
    apiFetch<{ families: string[]; tags: string[]; used_parts: string[]; regions: string[] }>(
      "/api/filters/options"
    )
      .then((res) => setFilterOptions(res))
      .catch(() => {});
  }, []);

  // Fetch plants when params change
  const fetchPlants = () => {
    setLoading(true);
    setError(null);

    const queryParts: string[] = [`page=${page}`, `page_size=12`];
    if (search) queryParts.push(`search=${encodeURIComponent(search)}`);
    if (tag) queryParts.push(`tag=${encodeURIComponent(tag)}`);
    if (family) queryParts.push(`family=${encodeURIComponent(family)}`);
    if (usedPart) queryParts.push(`used_part=${encodeURIComponent(usedPart)}`);
    if (region) queryParts.push(`region=${encodeURIComponent(region)}`);
    if (sortBy) queryParts.push(`sort_by=${encodeURIComponent(sortBy)}`);

    apiFetch<PlantListResponse>(`/api/plants?${queryParts.join("&")}`)
      .then((res) => {
        setPlantsData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Không thể tải danh sách cây thuốc. Vui lòng thử lại sau.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPlants();
  }, [search, tag, family, usedPart, region, sortBy, page]);

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set("page", "1"); // Reset to page 1 on filter change
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter("search", searchInput.trim());
  };

  const clearAllFilters = () => {
    setSearchInput("");
    setSearchParams(new URLSearchParams());
  };

  const totalPages = plantsData ? Math.ceil(plantsData.total / plantsData.page_size) : 1;

  const hasActiveFilters = Boolean(search || tag || family || usedPart || region || sortBy);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title="Tra cứu Cây Thuốc Nam - Danh sách & Bộ lọc Dược liệu"
        description="Tìm kiếm cây thuốc theo tên tiếng Việt, tên khoa học, họ thực vật, công dụng và bộ phận sử dụng."
      />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Thư viện dược liệu</span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Tra Cứu & Lọc Cây Thuốc Nam
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
            Kết hợp tìm kiếm tên gọi, công dụng điều trị, họ thực vật và bộ phận dùng với bộ lọc thông minh.
          </p>

          {/* Search Input Bar */}
          <form onSubmit={handleSearchSubmit} className="pt-2 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nhập tên cây, tên khoa học, họ cây..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700" />
            </div>
            <button
              type="submit"
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors"
            >
              Tìm kiếm
            </button>
          </form>
        </div>
      </div>

      {/* Main Layout Grid (Filter Sidebar + Plants List) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden lg:block space-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs h-fit sticky top-24">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-700" />
              <span>Bộ lọc tra cứu</span>
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-semibold text-red-500 hover:text-red-600"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {/* Filter 1: Công dụng (Tags) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Công dụng chính
            </label>
            <select
              value={tag}
              onChange={(e) => updateFilter("tag", e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50/50 focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Tất cả công dụng --</option>
              {filterOptions.tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Họ thực vật (Family) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Họ thực vật (Family)
            </label>
            <select
              value={family}
              onChange={(e) => updateFilter("family", e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50/50 focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Tất cả họ thực vật --</option>
              {filterOptions.families.map((f) => (
                <option key={f} value={f}>
                  Họ {f}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Bộ phận sử dụng */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Bộ phận sử dụng
            </label>
            <select
              value={usedPart}
              onChange={(e) => updateFilter("used_part", e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50/50 focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Tất cả bộ phận --</option>
              {filterOptions.used_parts.map((up) => (
                <option key={up} value={up}>
                  {up}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 4: Khu vực phân bố */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Khu vực phân bố
            </label>
            <select
              value={region}
              onChange={(e) => updateFilter("region", e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50/50 focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Tất cả khu vực --</option>
              {filterOptions.regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </aside>

        {/* Plants List & Control Header */}
        <main className="lg:col-span-3 space-y-6">
          {/* Controls Bar: Mobile filter trigger + Sort selector */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Bộ lọc</span>
              </button>
              <p className="text-xs font-semibold text-slate-500">
                {plantsData ? (
                  <span>
                    Hiển thị <strong>{plantsData.items.length}</strong> / <strong>{plantsData.total}</strong> cây thuốc
                  </span>
                ) : (
                  "Đang tải..."
                )}
              </p>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => updateFilter("sort_by", e.target.value)}
                className="p-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none"
              >
                <option value="">Sắp xếp mặc định</option>
                <option value="name_asc">Tên (A đến Z)</option>
                <option value="name_desc">Tên (Z đến A)</option>
                <option value="popular">Xem nhiều nhất</option>
                <option value="newest">Mới cập nhật</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Đang lọc:</span>
              {search && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-medium">
                  Từ khóa: "{search}"
                  <button onClick={() => updateFilter("search", "")} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {tag && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-medium">
                  Công dụng: {tag}
                  <button onClick={() => updateFilter("tag", "")} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {family && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-medium">
                  Họ: {family}
                  <button onClick={() => updateFilter("family", "")} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {usedPart && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-medium">
                  Bộ phận: {usedPart}
                  <button onClick={() => updateFilter("used_part", "")} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-xs text-red-500 underline font-medium hover:text-red-600"
              >
                Xóa tất cả
              </button>
            </div>
          )}

          {/* Plant Grid / Loading State / Error State / Empty State */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <PlantCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <div>
                <h3 className="font-bold text-red-900 text-base">Đã xảy ra lỗi khi tải dữ liệu</h3>
                <p className="text-xs text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={fetchPlants}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-red-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          ) : plantsData && plantsData.items.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {plantsData.items.map((plant) => (
                  <PlantCard key={plant.id} plant={plant} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-8">
                  <button
                    disabled={page <= 1}
                    onClick={() => updateFilter("page", String(page - 1))}
                    className="p-2 rounded-xl border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-700"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-4">
                    Trang {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => updateFilter("page", String(page + 1))}
                    className="p-2 rounded-xl border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-700"
                    aria-label="Trang sau"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center space-y-4">
              <Leaf className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="font-bold text-slate-800 text-base">Không tìm thấy cây thuốc phù hợp</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Thử tìm kiếm từ khóa khác hoặc điều chỉnh xóa bớt các bộ lọc để có kết quả hiển thị.
                </p>
              </div>
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-emerald-800"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xs bg-white h-full p-6 space-y-6 overflow-y-auto animate-in slide-in-from-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">Bộ lọc tra cứu</h3>
              <button onClick={() => setMobileFilterOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1.5">Công dụng</label>
                <select
                  value={tag}
                  onChange={(e) => updateFilter("tag", e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="">Tất cả công dụng</option>
                  {filterOptions.tags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1.5">Họ thực vật</label>
                <select
                  value={family}
                  onChange={(e) => updateFilter("family", e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="">Tất cả họ</option>
                  {filterOptions.families.map((f) => (
                    <option key={f} value={f}>
                      Họ {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1.5">Bộ phận dùng</label>
                <select
                  value={usedPart}
                  onChange={(e) => updateFilter("used_part", e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="">Tất cả bộ phận</option>
                  {filterOptions.used_parts.map((up) => (
                    <option key={up} value={up}>
                      {up}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex gap-2">
              <button
                onClick={clearAllFilters}
                className="w-1/2 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
              >
                Xóa lọc
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-1/2 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
