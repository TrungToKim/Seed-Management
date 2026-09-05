import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  RefreshCw,
  Info,
} from "lucide-react";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import SEO from "../components/SEO";
import type { AIRecognitionResult } from "../api";
import { apiFetchRaw } from "../api";

export default function AIRecognitionPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AIRecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await apiFetchRaw("/api/ai/recognize", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Không thể xử lý ảnh qua máy chủ AI.");
      }

      const jsonResult: AIRecognitionResult = await res.json();
      setResult(jsonResult);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi trong quá trình phân tích hình ảnh AI.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title="AI Nhận Diện Cây Thuốc Bằng Hình Ảnh"
        description="Tải ảnh cây thuốc lên để trí tuệ nhân tạo Gemini phân tích hình thái lá, hoa và đưa ra gợi ý tên loài cây phù hợp."
      />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-emerald-900 to-teal-900 text-white p-8 sm:p-12 rounded-3xl shadow-lg space-y-3 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold">
            <Sparkles className="w-4 h-4" />
            <span>Công nghệ AI Thị giác Gemini</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Nhận Diện Thực Vật Bằng AI
          </h1>
          <p className="text-xs sm:text-sm text-teal-100/80 leading-relaxed">
            Chụp hoặc tải lên hình ảnh thân, lá, hoa của cây thuốc để AI đưa ra dự đoán tên loài và thông tin dược liệu đối chiếu.
          </p>
        </div>
      </div>

      {/* Upload Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-sm space-y-6">
        <div className="border-2 border-dashed border-emerald-300/80 bg-emerald-50/30 rounded-3xl p-8 text-center space-y-4 hover:border-emerald-500 transition-colors relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
          />

          {previewUrl ? (
            <div className="space-y-4">
              <div className="w-48 h-48 mx-auto rounded-2xl overflow-hidden shadow-md border border-slate-200">
                <img src={previewUrl} alt="Xem trước" className="w-full h-full object-cover" />
              </div>
              <p className="text-xs text-slate-500 font-medium">Nhấp hoặc kéo thả ảnh khác để thay đổi</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Tải ảnh cây thuốc lên</h3>
                <p className="text-xs text-slate-500 mt-1">Hỗ trợ định dạng JPG, PNG, WEBP (Tối đa 10MB)</p>
              </div>
            </div>
          )}
        </div>

        {/* Analyze Button */}
        {selectedFile && (
          <div className="text-center">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg transition-all hover:scale-105"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI Đang Phân Tích Hình Ảnh...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>Bắt Đầu Phân Tích Với AI</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Analysis Result Card */}
      {result && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-md space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>Kết Quả Phân Tích AI</span>
            </h3>
          </div>

          {result.primary_candidate ? (
            <div className="space-y-6">
              {/* Primary Candidate Card */}
              <div className="p-6 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      Khả nghi cao nhất ({result.primary_candidate.confidence_percent}%)
                    </span>
                    <h4 className="text-2xl font-extrabold text-emerald-950 mt-1">
                      {result.primary_candidate.vietnamese_name}
                    </h4>
                    {result.primary_candidate.scientific_name && (
                      <p className="text-xs font-serif italic text-emerald-700">
                        {result.primary_candidate.scientific_name}
                      </p>
                    )}
                  </div>

                  {result.primary_candidate.db_plant_slug && (
                    <Link
                      to={`/plants/${result.primary_candidate.db_plant_slug}`}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-emerald-800"
                    >
                      <span>Xem hồ sơ cây</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>

                {result.primary_candidate.observed_features && (
                  <p className="text-xs text-emerald-900/80 leading-relaxed bg-white/60 p-3 rounded-xl">
                    <strong>Đặc điểm nhận biết qua ảnh:</strong> {result.primary_candidate.observed_features}
                  </p>
                )}
              </div>

              {/* Secondary Candidates */}
              {result.other_candidates && result.other_candidates.length > 0 && (
                <div className="space-y-3">
                  <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Các khả năng khác có thể xảy ra:
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.other_candidates.map((cand, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <p className="text-xs font-bold text-slate-800">{cand.vietnamese_name}</p>
                        {cand.scientific_name && (
                          <p className="text-[11px] font-serif italic text-slate-500">{cand.scientific_name}</p>
                        )}
                        <span className="text-[10px] text-slate-400 font-semibold">Độ tin cậy: {cand.confidence_percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs">
              AI không nhận diện chắc chắn loài cây này. Thử chụp lại ảnh rõ nét các góc hoa, lá.
            </div>
          )}

          {/* AI Disclaimer Alert */}
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Cảnh báo quan trọng:</strong> {result.disclaimer}
            </p>
          </div>
        </div>
      )}

      <MedicalDisclaimer />
    </div>
  );
}
