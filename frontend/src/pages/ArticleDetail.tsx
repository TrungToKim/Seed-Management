import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Calendar, User, Eye } from "lucide-react";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import SEO from "../components/SEO";
import type { Article } from "../api";
import { apiFetch } from "../api";

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    apiFetch<Article>(`/api/articles/${slug}`)
      .then((res) => {
        setArticle(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-4 bg-slate-200 rounded w-32" />
        <div className="h-8 bg-slate-200 rounded w-3/4" />
        <div className="h-64 bg-slate-200 rounded-3xl" />
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 rounded w-full" />
          <div className="h-4 bg-slate-200 rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy bài viết</h2>
        <Link to="/articles" className="inline-block px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl">
          Quay lại danh sách bài viết
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO title={article.title} description={article.summary || undefined} image={article.image_url || undefined} />

      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Quay lại</span>
      </button>

      <article className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-sm space-y-6">
        <div className="space-y-3">
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {article.category}
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-b border-slate-100 pb-4">
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <User className="w-3.5 h-3.5 text-emerald-700" />
              {article.author}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(article.created_at).toLocaleDateString("vi-VN")}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {article.views_count} lượt xem
            </span>
          </div>
        </div>

        {article.image_url && (
          <div className="aspect-16/9 rounded-2xl overflow-hidden bg-slate-100">
            <img src={article.image_url} alt={article.title} className="w-full h-full object-cover" />
          </div>
        )}

        {article.summary && (
          <div className="p-4 bg-emerald-50/50 rounded-2xl border-l-4 border-emerald-600 text-xs sm:text-sm font-medium text-emerald-950 leading-relaxed italic">
            "{article.summary}"
          </div>
        )}

        <div className="prose prose-emerald max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-4">
          {article.content.split("\n\n").map((para, idx) => (
            <p key={idx}>{para}</p>
          ))}
        </div>

        <MedicalDisclaimer />
      </article>
    </div>
  );
}
