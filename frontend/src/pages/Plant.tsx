import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

interface Tag {
  id: number;
  category: string;
  tag_name: string;
}

interface PlantDetail {
  id: number;
  section_type: string;
  content: string;
  source_reference: string | null;
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
  details: PlantDetail[];
}

function PlantList() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [loading, setLoading] = useState(true);
  const pageSize = 12;
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then(setTags)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (search) params.set("search", search);
    if (selectedTag) params.set("tag", selectedTag);

    fetch(`/api/plants?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setPlants(data.items);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, selectedTag]);

  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
      <h1 className="section-title" style={{ marginBottom: 24 }}>Danh Mục Cây Thuốc</h1>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Tìm kiếm cây thuốc..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={selectedTag} onChange={(e) => { setSelectedTag(e.target.value); setPage(1); }}>
          <option value="">Tất cả</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.tag_name}>{tag.tag_name}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">Tìm</button>
      </form>

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : plants.length === 0 ? (
        <div className="loading">Không tìm thấy cây thuốc nào.</div>
      ) : (
        <>
          <div className="plant-grid">
            {plants.map((plant) => (
              <div
                key={plant.id}
                className="plant-card"
                onClick={() => navigate(`/plants/${plant.id}`)}
              >
                <div
                  style={{
                    height: 200,
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
                    <img src={plant.image_url} alt={plant.common_name} className="plant-card-image" />
                  ) : "🌿"}
                </div>
                <div className="plant-card-body">
                  <h3>{plant.common_name}</h3>
                  {plant.scientific_name && <div className="sci-name">{plant.scientific_name}</div>}
                  {plant.description && <p>{plant.description}</p>}
                  {plant.tags.length > 0 && (
                    <div className="plant-tags">
                      {plant.tags.map((tag) => (
                        <span key={tag.id} className="plant-tag">{tag.tag_name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={p === page ? "active" : ""} onClick={() => setPage(p)}>
                  {p}
                </button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>Sau</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/plants/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setPlant)
      .catch(() => navigate("/plants"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <div className="loading" style={{ padding: 60 }}>Đang tải...</div>;
  if (!plant) return null;

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
      <button className="back-btn" onClick={() => navigate("/plants")}>
        &larr; Quay lại danh sách
      </button>

      <div className="plant-detail">
        <div className="plant-detail-header">
          <div
            style={{
              width: 320,
              height: 320,
              background: plant.image_url
                ? undefined
                : "linear-gradient(135deg, #e8f5e9, #c8e6c9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "5rem",
              color: "#2d6a4f",
              borderRadius: 12,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {plant.image_url ? (
              <img src={plant.image_url} alt={plant.common_name} className="plant-detail-image" />
            ) : "🌿"}
          </div>
          <div className="plant-detail-info">
            <h1>{plant.common_name}</h1>
            {plant.scientific_name && <div className="sci-name">{plant.scientific_name}</div>}
            {plant.family && <div className="meta"><strong>Họ:</strong> {plant.family}</div>}
            {plant.region && <div className="meta"><strong>Khu vực:</strong> {plant.region}</div>}
            {plant.tags.length > 0 && (
              <div className="plant-tags" style={{ marginTop: 12 }}>
                {plant.tags.map((tag) => (
                  <span key={tag.id} className="plant-tag">{tag.tag_name}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {plant.description && (
          <div className="plant-detail-description">{plant.description}</div>
        )}

        {plant.details.length > 0 && (
          <div className="plant-details-section">
            <h2>Chi Tiết</h2>
            {plant.details.map((detail) => (
              <div key={detail.id} className="detail-item">
                <div className="detail-type">{detail.section_type}</div>
                <div>{detail.content}</div>
                {detail.source_reference && (
                  <div className="detail-source">Nguồn: {detail.source_reference}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlantPage() {
  const { id } = useParams();
  if (id) return <PlantDetail />;
  return <PlantList />;
}
