import apiClient from "./apiClient";

// GET /api/stores (publik) -> { stores: [...] }, hanya store aktif
export async function getActiveStores() {
  const response = await apiClient.get("/stores");
  return response.data.stores || [];
}