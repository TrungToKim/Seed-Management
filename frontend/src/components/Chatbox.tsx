import React, { useState } from "react";

export default function ChatBot() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Hàm gọi API khi người dùng bấm nút Gửi
  const handleAskQuestion = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setAnswer("");
    setSources([]);

    try {
      // Gọi tới API FastAPI đang chạy ở localhost:8000
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: query }),
      });

      const data = await response.json();

      if (data.status === "success") {
        setAnswer(data.answer); // Lưu câu trả lời để in ra
        setSources(data.sources); // Lưu danh sách nguồn
      } else {
        setAnswer("Đã có lỗi xảy ra từ server.");
      }
    } catch (error) {
      console.error("Lỗi gọi API:", error);
      setAnswer(
        "Không thể kết nối đến Backend. Hãy kiểm tra lại server FastAPI.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "50px auto",
        fontFamily: "sans-serif",
      }}
    >
      <h2>Trợ lý AI Tra cứu Tài liệu 🤖</h2>

      {/* 1. KHUNG NHẬP CÂU HỎI */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nhập câu hỏi của bạn..."
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
          }}
          onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
        />
        <button
          onClick={handleAskQuestion}
          disabled={isLoading}
          style={{ padding: "10px 20px", cursor: "pointer" }}
        >
          {isLoading ? "Đang xử lý..." : "Hỏi AI"}
        </button>
      </div>

      {/* 2. KHUNG IN KẾT QUẢ (DATA) TRẢ VỀ */}
      {answer && (
        <div
          style={{
            padding: "20px",
            backgroundColor: "#f9f9f9",
            borderRadius: "8px",
            border: "1px solid #ddd",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#2c3e50" }}>Trả lời:</h4>
          <p style={{ lineHeight: "1.6" }}>{answer}</p>

          {/* IN RA NGUỒN TÀI LIỆU */}
          {sources && sources.length > 0 && (
            <div
              style={{
                marginTop: "15px",
                borderTop: "1px solid #ddd",
                paddingTop: "10px",
              }}
            >
              <span style={{ fontWeight: "bold", fontSize: "14px" }}>
                Nguồn tham khảo:
              </span>
              <ul
                style={{
                  margin: "5px 0",
                  paddingLeft: "20px",
                  fontSize: "14px",
                  color: "#555",
                }}
              >
                {sources.map((source, index) => (
                  <li key={index}>{source}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
