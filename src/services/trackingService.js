import apiClient from "./apiClient";

export async function getTracking(orderId) {
  const response = await apiClient.get(`/tracking/${orderId}`);
  return response.data.tracking || null;
}