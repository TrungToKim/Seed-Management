import React from "react";
import { Link } from "react-router-dom";
import { Leaf, Heart, Shield } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-emerald-950 text-emerald-100/80 border-t border-emerald-900/40 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Col 1: Brand */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-emerald-950 font-bold shadow-md">
                <Leaf className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                THỰC VẬT VIỆT
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-emerald-200/70">
              Nền tảng tra cứu kiến thức thực vật dược liệu Việt Nam chính xác, hiện đại, hỗ trợ bởi công nghệ AI thông minh.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm tracking-wider uppercase">
              Khám phá
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/plants" className="hover:text-emerald-400 transition-colors">
                  Tra cứu cây thuốc Nam
                </Link>
              </li>
              <li>
                <Link to="/articles" className="hover:text-emerald-400 transition-colors">
                  Kiến thức dược liệu
                </Link>
              </li>
              <li>
                <Link to="/ai-recognition" className="hover:text-emerald-400 transition-colors">
                  AI Nhận diện bằng hình ảnh
                </Link>
              </li>
              <li>
                <Link to="/chat" className="hover:text-emerald-400 transition-colors">
                  Trợ lý AI Hỏi đáp thảo dược
                </Link>
              </li>
              <li>
                <Link to="/favorites" className="hover:text-emerald-400 transition-colors">
                  Danh sách cây đã lưu
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Categories */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm tracking-wider uppercase">
              Công dụng phổ biến
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/plants?tag=Thanh nhiệt" className="hover:text-emerald-400 transition-colors">
                  Cây thuốc Thanh nhiệt - Giải độc
                </Link>
              </li>
              <li>
                <Link to="/plants?tag=Trị ho" className="hover:text-emerald-400 transition-colors">
                  Cây thuốc Trị ho - Phế quản
                </Link>
              </li>
              <li>
                <Link to="/plants?tag=Bổ khí huyết" className="hover:text-emerald-400 transition-colors">
                  Cây thuốc Bổ khí huyết - An thần
                </Link>
              </li>
              <li>
                <Link to="/plants?tag=Xương khớp" className="hover:text-emerald-400 transition-colors">
                  Cây thuốc Xương khớp - Phong thấp
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Disclaimer & Reliability */}
          <div className="space-y-3 md:col-span-1">
            <h4 className="font-bold text-white text-sm tracking-wider uppercase flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Độ tin cậy & Y tế</span>
            </h4>
            <div className="bg-emerald-900/50 border border-emerald-800/60 rounded-xl p-3 text-[11px] leading-relaxed text-emerald-200/80">
              <p>
                Nội dung mang tính tham khảo tài liệu y học cổ truyền. Thông tin không trình bày như chẩn đoán hoặc chỉ định điều trị y khoa chuyên nghiệp.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-emerald-900/60 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-400/60 gap-4">
          <p>© {new Date().getFullYear()} Thực Vật Việt. Tất cả quyền được bảo lưu.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              Phát triển với <Heart className="w-3.5 h-3.5 text-red-400 fill-current inline" /> cho Y học cổ truyền Việt Nam
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
