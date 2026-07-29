import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

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

export default function Home() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch<{ items: Plant[]; total: number }>("/api/plants?page_size=6")
      .then((data) => {
        setPlants(data.items);
        setTotal(data.total);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Kho Tàng Cây Thuốc Việt Nam</h1>
          <p>
            Tra cứu thông tin về các loại cây thuốc quý, công dụng, bài thuốc
            dân gian và cách sử dụng. Kết hợp với trí tuệ nhân tạo để tra cứu
            thông minh.
          </p>
          <a className="hero-cta" href="/plants">
            Khám Phá Ngay
          </a>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <div className="stats">
            <div className="stat-card">
              <div className="stat-number">{total}</div>
              <div className="stat-label">Cây Thuốc</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">Đa Dạng</div>
              <div className="stat-label">Họ Thực Vật</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">Truyền Thống</div>
              <div className="stat-label">Bài Thuốc Dân Gian</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">AI</div>
              <div className="stat-label">Tra Cứu Thông Minh</div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section" style={{ background: "#fff" }}>
        <div className="container">
          <h2 className="section-title">Cây Thuốc Nổi Bật</h2>
          <div className="plant-grid">
            {plants.map((plant) => (
              <div
                key={plant.id}
                className="plant-card"
                onClick={() => navigate(`/plants/${plant.id}`)}
              >
                <div
                  className="plant-card-image"
                  style={{
                    background: plant.image_url
                      ? undefined
                      : "linear-gradient(135deg, #e8f5e9, #c8e6c9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "3rem",
                    color: "#2d6a4f",
                  }}
                >
                  {plant.image_url ? (
                    <img
                      src={plant.image_url}
                      alt={plant.common_name}
                      className="plant-card-image"
                    />
                  ) : (
                    "🌿"
                  )}
                </div>
                <div className="plant-card-body">
                  <h3>{plant.common_name}</h3>
                  {plant.scientific_name && (
                    <div className="sci-name">{plant.scientific_name}</div>
                  )}
                  {plant.description && <p>{plant.description}</p>}
                  {plant.tags.length > 0 && (
                    <div className="plant-tags">
                      {plant.tags.map((tag) => (
                        <span key={tag.id} className="plant-tag">
                          {tag.tag_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <h2 className="section-title">Tính Năng Chính</h2>
          <div className="features">
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Danh Mục Cây Thuốc</h3>
              <p>Tra cứu thông tin chi tiết về các loại cây thuốc, công dụng và phân bố.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>Tra Cứu AI</h3>
              <p>Hỏi đáp thông minh với AI dựa trên kho tài liệu cây thuốc đã được huấn luyện.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Tìm Kiếm Nâng Cao</h3>
              <p>Lọc cây thuốc theo bệnh lý, bộ phận sử dụng, khu vực phân bố.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
