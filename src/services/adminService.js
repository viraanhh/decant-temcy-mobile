import apiClient from "./apiClient";
import { mapProductFromApi } from "./productService"; // Dipertahankan dari sc lama

// ─────────────────────────────────────────────────────────────────────────
// Semua fungsi di file ini WAJIB dipanggil oleh user dengan role "admin".
// Backend (admin.routes.js) sudah proteksi dengan authenticate + authorizeAdmin,
// jadi kalau dipanggil user biasa, otomatis dapat 403 dari server — tapi
// tetap gate juga di sisi UI (jangan render tombol/layar admin untuk non-admin).
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// DASHBOARD
// GET /api/admin/dashboard
// Response: { stats: { totalUsers, totalProducts, totalOrders, totalRevenue },
//             recentOrders: [...], ordersByStatus: [...] }
// ─────────────────────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const response = await apiClient.get("/admin/dashboard");
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────
// USERS
// GET /api/admin/users?page=&limit=&search=
// Response: { total, users: [...] }  (password & google_id sudah di-exclude backend)
// ─────────────────────────────────────────────────────────────────────────
export async function getAdminUsers(params = {}) {
  const response = await apiClient.get("/admin/users", { params });
  return response.data;
}

// PUT /api/admin/users/:id/toggle-status
// Response: { message, user }
export async function toggleUserStatus(userId) {
  const response = await apiClient.put(`/admin/users/${userId}/toggle-status`);
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────
// REVIEWS
// GET /api/admin/reviews?page=&limit=
// Response: { total, reviews: [...] }
// ─────────────────────────────────────────────────────────────────────────
export async function getAdminReviews(params = {}) {
  const response = await apiClient.get("/admin/reviews", { params });
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────
// SALES REPORT
// GET /api/admin/sales-report?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
// Response: { totalRevenue, totalOrders, orders: [...] }
// ─────────────────────────────────────────────────────────────────────────
export async function getSalesReport(params = {}) {
  const response = await apiClient.get("/admin/sales-report", { params });
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────
// PRODUK (Kelola Produk)
//
// PENTING: createProduct/updateProduct backend pakai ...req.body MENTAH
// langsung ke Product.create()/update() — jadi key di object `fields` HARUS
// PERSIS nama kolom database (product_name, price_1ml, dst), bukan camelCase
// hasil olahan mobile (mis. productName). Field yang tidak dikirim/kosong
// akan otomatis di-skip (tidak dikirim ke FormData sama sekali) supaya
// tidak menimpa data lama dengan string kosong saat update.
// ─────────────────────────────────────────────────────────────────────────

// POST /api/products (field: image, multipart/form-data)
// Response: { message, product }
export async function createAdminProduct(fields, imageUri) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") formData.append(key, value);
  });
  if (imageUri) {
    formData.append("image", { uri: imageUri, name: "product.jpg", type: "image/jpeg" });
  }

  const response = await apiClient.post("/products", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.product;
}

// PUT /api/products/:id (field: image, opsional — kalau tidak dikirim,
// image_filename lama tetap dipertahankan backend, tidak ikut ke-reset)
// Response: { message, product }
export async function updateAdminProduct(id, fields, imageUri) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") formData.append(key, value);
  });
  if (imageUri) {
    formData.append("image", { uri: imageUri, name: "product.jpg", type: "image/jpeg" });
  }

  const response = await apiClient.put(`/products/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.product;
}

// DELETE /api/products/:id
// SOFT DELETE — backend cuma set is_active: false, data tidak hilang permanen.
// Response: { message }  (tidak ada "product" di response ini)
export async function deleteAdminProduct(id) {
  const response = await apiClient.delete(`/products/${id}`);
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────
// PESANAN (Kelola Pesanan)
//
// PENTING: endpoint order base path-nya /api/orders (BUKAN /api/admin/...
// seperti dashboard/users/reviews di atas) — tetap proteksi authorizeAdmin
// di backend untuk 2 fungsi berikut, cuma beda prefix URL.
// ─────────────────────────────────────────────────────────────────────────

// GET /api/orders?status=&page=&limit=
// status kosong/undefined = semua status. Response: { total, orders }
// (tiap order sudah include array "items")
export async function getAdminOrders(params = {}) {
  const response = await apiClient.get("/orders", { params });
  return response.data;
}

// PUT /api/orders/:id/status  (body: { status })
// Backend OTOMATIS kirim notifikasi ke customer begitu status berubah
// (lihat statusMessages di order.controller.js) — mobile tidak perlu
// trigger notifikasi manual sama sekali.
// Response: { message, order }
export async function updateOrderStatus(orderId, status) {
  const response = await apiClient.put(`/orders/${orderId}/status`, { status });
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────
// TRACKING
// ─────────────────────────────────────────────────────────────────────────

// POST /api/tracking (admin only)
// Body: { order_id, courier, tracking_number, status, description, location }
// Response: { message, tracking }
export async function updateTracking(data) {
  const response = await apiClient.post("/tracking", data);
  return response.data;
}