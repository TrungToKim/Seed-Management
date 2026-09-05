import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, PenTool, Image, Sparkles, Check, AlertCircle } from "lucide-react";
import { apiFetch, type ArticleResponse } from "../api";
import { useAuth } from "../useAuth";

interface CreateArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (article: ArticleResponse) => void;
}

const CATEGORIES = [
  "Chia sẻ kinh nghiệm",
  "Bài thuốc dân gian",
  "Cách dùng & Chế biến",
  "Nhận biết cây thuốc",
  "Hướng dẫn",
  "Khác",
];

export default function CreateArticleModal({ isOpen, onClose, onSuccess }: CreateArticleModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Chia sẻ kinh nghiệm");
  const [summary, setSummary] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Vui lòng đăng nhập để đăng bài viết.");
      return;
    }
    if (!title.trim() || !content.trim()) {
      setError("Vui lòng nhập đầy đủ Tiêu đề và Nội dung bài viết.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch<ArticleResponse>("/api/articles", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim() || "Chia sẻ kinh nghiệm",
          summary: summary.trim() || undefined,
          image_url: imageUrl.trim() || undefined,
          content: content.trim(),
          author: user.full_name || user.username,
        }),
      });

      setLoading(false);
      onClose();
      if (onSuccess) {
        onSuccess(res);
      } else {
        navigate(`/articles/${res.slug}`);
      }
    } catch (err: any) {
      setError(err?.message || "Đã xảy ra lỗi khi đăng bài. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-900 to-teal-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-800/60 border border-emerald-500/30 flex items-center justify-center">
              <PenTool className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Đăng Bài Viết Chia Sẻ Kinh Nghiệm</h2>
              <p className="text-xs text-emerald-200/80">Đóng góp kiến thức và bài thuốc dân gian cho cộng đồng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Tiêu đề bài viết <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Kinh nghiệm dùng Cây Ngải Cứu chữa đau lưng hiệu quả tại nhà"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
            />
          </div>

          {/* Category & Image URL row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Chuyên mục
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span>Ảnh minh họa (URL)</span>
                <span className="text-[10px] text-slate-400 font-normal">Không bắt buộc</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://example.com/hinh-anh.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                />
                <Image className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
              <span>Tóm tắt ngắn</span>
              <span className="text-[10px] text-slate-400 font-normal">Tối đa 150 ký tự</span>
            </label>
            <input
              type="text"
              placeholder="Mô tả ngắn gọn về bài chia sẻ của bạn..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Nội dung chia sẻ chi tiết <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={8}
              placeholder="Chia sẻ cách sử dụng, liều lượng, nguyên liệu và các lưu ý khi áp dụng bài thuốc..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 leading-relaxed transition-all resize-y"
            />
          </div>

          {/* Submit buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Đang đăng...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Xuất bản bài viết</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
