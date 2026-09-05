import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Calendar, User } from "lucide-react";
import SEO from "../components/SEO";
import type { ArticleListResponse } from "../api";
import { apiFetch } from "../api";

export default function ArticlesPage() {
  const [articlesData, setArticlesData] = useState<ArticleListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<ArticleListResponse>("/api/articles?page=1&page_size=12")
      .then((res) => {
        setArticlesData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title="Kiến Thức Dược Liệu & Y Học Cổ Truyền"
        description="Cẩm nang bài viết chuyên sâu về công dụng, kinh nghiệm thu hái, chế biến và sử dụng thảo dược Việt Nam."
      />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-8 sm:p-12 rounded-3xl shadow-lg space-y-3">
        <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" />
          <span>Cẩm nang Y học dân gian</span>
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Kiến Thức & Kinh Nghiệm Dược Liệu
        </h1>
        <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
          Tổng hợp các bài nghiên cứu, hướng dẫn nhận biết và phương pháp sử dụng cây thuốc Nam an toàn từ chuyên gia.
        </p>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : articlesData && articlesData.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articlesData.items.map((art) => (
            <Link
              key={art.id}
              to={`/articles/${art.slug}`}
              className="group bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col h-full"
            >
              <div className="aspect-16/9 bg-slate-100 overflow-hidden relative">
                <img
                  src={art.image_url || "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80"}
                  alt={art.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-emerald-950/80 backdrop-blur-md text-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/20">
                  {art.category}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors line-clamp-2">
                    {art.title}
                  </h3>
                  {art.summary && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {art.summary}
                    </p>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {art.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(art.created_at).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-500">
          Chưa có bài viết nào được xuất bản.
        </div>
      )}
    </div>
  );
}
