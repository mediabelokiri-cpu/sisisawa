# KASIRKU - Aplikasi Kasir / Point of Sale (POS) UMKM

Aplikasi Kasir / POS modern berbasis web untuk UMKM dengan pendekatan **Tablet-First**, performa tinggi, dan struktur kode bersih.

---

## 1. STRUKTUR PROYEK

```
d:/KASIRKU/kasirku/
├── backend/
│   ├── src/
│   │   ├── config/          # Koneksi database PostgreSQL (pg pool & embedded engine)
│   │   ├── controllers/     # AuthController, DashboardController
│   │   ├── middleware/      # authMiddleware (JWT & Role checking ADMIN/KASIR)
│   │   ├── routes/          # authRoutes, dashboardRoutes
│   │   ├── db/
│   │   │   ├── schema.sql   # DDL skema PostgreSQL murni
│   │   │   └── seed.sql     # Seed data awal (Admin, Kasir, Kategori, Produk, Setting Toko)
│   │   └── server.ts        # Express REST API Server
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/      # Sidebar (7 menu + logout), Header (WITA Clock), AdminLayout, ProtectedRoute
│   │   │   └── ui/          # Button, Card, StatCard, Badge, Modal, Input, Select, LoadingSpinner
│   │   ├── context/         # AuthContext (login, logout, session)
│   │   ├── pages/
│   │   │   ├── Login.tsx    # Halaman Login terpadu (ADMIN & KASIR)
│   │   │   ├── admin/
│   │   │   │   └── Dashboard.tsx # 4 Stat Cards, Grafik Penjualan (#40A8C4), Top 5 Produk, Transaksi Terbaru
│   │   │   └── cashier/
│   │   │       └── PosPlaceholder.tsx # Halaman pendaratan Kasir
│   │   ├── services/        # api.ts (Axios + JWT interceptor)
│   │   ├── styles/          # Tailwind setup + Color System
│   │   ├── types/           # TypeScript Interfaces
│   │   ├── App.tsx          # Router & Role protection
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── package.json
```

---

## 2. TEKNOLOGI YANG DIGUNAKAN

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React (outline icons), Recharts (data visualizer), React Router DOM v7.
* **Backend**: Node.js, Express.js, TypeScript, JSON Web Token (JWT), bcryptjs (hashing password aman).
* **Database**: PostgreSQL murni (Relational SQL) dengan dukungan auto-migration & auto-seeding.
* **Color System**:
  * Primary Dark: `#235784` (Sidebar & Identitas Utama)
  * Primary Accent: `#F7AA00` (CTA, Highlight, Menu Aktif)
  * Secondary: `#40A8C4` (Grafik Penjualan & Info)
  * Background: `#EEF6F7` (Latar Belakang Aplikasi)
  * Card: `#FFFFFF` (Card & Panel)

---

## 3. SKEMA DATABASE (POSTGRESQL)

Entitas database relasional:
1. `users`: `id`, `name`, `username`, `password_hash`, `role` (ADMIN/KASIR), `status` (Active/Inactive), `created_at`, `updated_at`
2. `categories`: `id`, `name`, `created_at`, `updated_at`
3. `products`: `id`, `name`, `category_id` (FK), `buy_price`, `sell_price`, `image_url`, `sku`, `status` (AVAILABLE/UNAVAILABLE), `created_at`, `updated_at`
4. `transactions`: `id`, `invoice_number`, `user_id` (FK), `subtotal`, `discount`, `tax`, `total`, `payment_method` (Cash/QRIS/Debit/Transfer), `status` (Completed/Cancelled), `created_at`, `updated_at`
5. `transaction_items`: `id`, `transaction_id` (FK), `product_id` (FK), `product_name`, `price`, `quantity`, `subtotal`
6. `settings`: `key` (PK), `value` (JSONB), `updated_at`

---

## 4. CARA MENJALANKAN PROYEK

### Menjalankan Backend:
```bash
cd backend
npm run dev
# Server berjalan di http://localhost:5000
```

### Menjalankan Frontend:
```bash
cd frontend
npm run dev
# Frontend berjalan di http://localhost:3000
```

### Akun Bawaan (Default):
* **Admin**: Username: `admin` | Password: `admin123` (Masuk ke Admin Panel Dashboard)
* **Kasir**: Username: `kasir` | Password: `kasir123` (Masuk ke Halaman Kasir)
