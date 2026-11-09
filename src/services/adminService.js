import apiClient from "./apiClient";

export async function getDashboardStats() {
  const response = await apiClient.get("/admin/dashboard");
  return response.data;
}

export async function getSysAdminUsers(params = {}) {
  const response = await apiClient.get("/sysadmin/users", { params });
  return response.data;
}

export async function createSysAdminUser(data) {
  const response = await apiClient.post("/sysadmin/users", data);
  return response.data;
}

export async function updateSysAdminUser(id, data) {
  const response = await apiClient.put(`/sysadmin/users/${id}`, data);
  return response.data;
}

export async function resetSysAdminUserPassword(id, data) {
  const response = await apiClient.put(`/sysadmin/users/${id}/reset-password`, data);
  return response.data;
}

export async function toggleSysAdminUserStatus(id, sysadminPassword) {
  const response = await apiClient.put(`/sysadmin/users/${id}/toggle-status`, {
    sysadmin_password: sysadminPassword,
  });
  return response.data;
}

export async function setSysAdminUserRole(id, role, sysadminPassword) {
  const response = await apiClient.put(`/sysadmin/users/${id}/set-role`, {
    role,
    sysadmin_password: sysadminPassword,
  });
  return response.data;
}

export async function getSystemStatus() {
  const response = await apiClient.get("/sysadmin/monitoring/status", { timeout: 30000 });
  return response.data;
}

export async function getSystemLogs(params = {}) {
  const response = await apiClient.get("/sysadmin/monitoring/logs", { params });
  return response.data;
}

export async function getSystemConfigs() {
  const response = await apiClient.get("/sysadmin/config");
  return response.data.configs;
}

export async function updateSystemConfigs(configs) {
  const response = await apiClient.put("/sysadmin/config", { configs });
  return response.data;
}

export async function testSmtpConnection() {
  const response = await apiClient.post("/sysadmin/config/test-smtp", null, { timeout: 30000 });
  return response.data;
}

export async function testAiConnection() {
  const response = await apiClient.post("/sysadmin/config/test-ai", null, { timeout: 30000 });
  return response.data;
}

export async function getAdminReviews(params = {}) {
  const response = await apiClient.get("/admin/reviews", { params });
  return response.data;
}

export async function deleteAdminReview(id) {
  const response = await apiClient.delete(`/reviews/admin/${id}`);
  return response.data;
}

export async function getSalesReport(params = {}) {
  const response = await apiClient.get("/admin/sales-report", { params });
  return response.data;
}

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

export async function deleteAdminProduct(id) {
  const response = await apiClient.delete(`/products/${id}`);
  return response.data;
}

export async function getAdminOrders(params = {}) {
  const response = await apiClient.get("/orders", { params });
  return response.data;
}

export async function updateOrderStatus(orderId, status) {
  const response = await apiClient.put(`/orders/${orderId}/status`, { status });
  return response.data;
}

export async function updateTracking(data) {
  const response = await apiClient.post("/tracking", data);
  return response.data;
}

export async function getAdminVouchers() {
  const response = await apiClient.get("/vouchers/admin");
  return response.data.vouchers;
}

export async function createAdminVoucher(fields) {
  const response = await apiClient.post("/vouchers/admin", fields);
  return response.data.voucher;
}

export async function updateAdminVoucher(id, fields) {
  const response = await apiClient.put(`/vouchers/admin/${id}`, fields);
  return response.data.voucher;
}

export async function deleteAdminVoucher(id) {
  const response = await apiClient.delete(`/vouchers/admin/${id}`);
  return response.data;
}

export async function getAdminInventory(params = {}) {
  const response = await apiClient.get("/products/admin/all", { params });
  return response.data;
}

export async function updateProductStock(id, payload) {
  const response = await apiClient.patch(`/products/${id}/stock`, payload);
  return response.data;
}

export async function getAdminStores() {
  const response = await apiClient.get("/stores/admin");
  return response.data.stores;
}

export async function createAdminStore(data) {
  const response = await apiClient.post("/stores/admin", data);
  return response.data;
}

export async function updateAdminStore(id, data) {
  const response = await apiClient.put(`/stores/admin/${id}`, data);
  return response.data;
}

export async function toggleAdminStore(id) {
  const response = await apiClient.put(`/stores/admin/${id}/toggle`);
  return response.data;
}