import apiClient from "./apiClient";
import { mapProductFromApi } from "./productService";

// Backend: GET /api/favorites -> { favorites: [{ favorite_id, product_id, product: {...} }] }
export async function getFavorites() {
  const response = await apiClient.get("/favorites");
  const favorites = response.data.favorites || [];
  return favorites.map((f) => ({
    productId: f.product_id,
    product: f.product ? mapProductFromApi(f.product) : null,
  }));
}

// Backend: POST /api/favorites/toggle { product_id } -> { message, is_favorite }
// Satu endpoint untuk tambah/hapus sekaligus — backend yang tentukan status akhirnya.
export async function toggleFavorite(productId) {
  const response = await apiClient.post("/favorites/toggle", { product_id: productId });
  return response.data.is_favorite;
}