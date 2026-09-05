import React from "react";
import { AlertTriangle, Info } from "lucide-react";

interface DisclaimerProps {
  compact?: boolean;
}

export const MedicalDisclaimer: React.FC<DisclaimerProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>Lưu ý:</strong> Thông tin trên website chỉ mang tính chất tham khảo cứu chữa dân gian, không thay thế việc chẩn đoán hoặc chỉ định điều trị y khoa chuyên nghiệp.
        </span>
      </div>
    );
  }

  return (
    <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-5 md:p-6 my-6 shadow-xs">
      <div className="flex items-start gap-3.5">
        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-semibold text-emerald-900 text-base mb-1">
            Cảnh báo miễn trừ trách nhiệm y tế
          </h4>
          <p className="text-sm text-emerald-800 leading-relaxed">
            Mọi thông tin về công dụng, tính vị và bài thuốc thảo dược tại <strong>Thực Vật Việt</strong> chỉ mang tính chất tham khảo kiến thức. Chúng tôi không trình bày công dụng cây thuốc như chẩn đoán chuyên khoa hoặc chỉ định điều trị thay thế y tế. Người bệnh tuyệt đối không tự ý áp dụng khi chưa hỏi ý kiến thầy thuốc hoặc bác sĩ Y học cổ truyền.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MedicalDisclaimer;
