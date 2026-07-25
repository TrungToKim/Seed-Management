# Frontend - Quản Lý Cây Thuốc

React 19 + TypeScript + Vite 8 frontend cho hệ thống quản lý cây thuốc.

## Cấu trúc

```
frontend/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx                # Router setup
│   ├── App.css                # Global styles
│   ├── components/
│   │   ├── Layout.tsx         # Layout chung (nav, footer)
│   │   └── Chatbox.tsx        # Chat AI component
│   ├── pages/
│   │   ├── Home.tsx           # Trang chủ
│   │   ├── Plant.tsx          # Danh sách & chi tiết cây thuốc
│   │   ├── Admin.tsx          # Quản trị (CRUD)
│   │   └── Chat.tsx           # Trang chat AI
│   └── assets/                # Hình ảnh, icons
├── index.html
├── vite.config.ts             # Proxy /api → localhost:8000
└── package.json
```

## Chạy

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Production build → dist/
```

## Các trang

| Route | Trang | Mô tả |
|-------|-------|-------|
| / | Home | Trang chủ giới thiệu |
| /plants | Plant | Danh sách & tìm kiếm cây thuốc |
| /plants/:id | Plant | Chi tiết cây thuốc |
| /admin | Admin | CRUD quản trị |
| /chat | Chat | Hỏi đáp với AI |

## Proxy

Vite proxy cấu hình trong `vite.config.ts`: tất cả request `/api/*` được chuyển tiếp đến `http://localhost:8000`.
