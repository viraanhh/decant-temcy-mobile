import apiClient from "./apiClient";

// Backend: GET /api/tracking/:orderId -> { tracking: {...} | null }
// tracking bisa null kalau admin belum pernah input resi untuk order ini.
export async function getTracking(orderId) {
  const response = await apiClient.get(`/tracking/${orderId}`);
  return response.data.tracking || null;
}