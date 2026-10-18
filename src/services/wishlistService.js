import apiClient from "./apiClient";
import { mapProductFromApi } from "./productService";

export async function getFavorites() {
  const response = await apiClient.get("/favorites");
  const favorites = response.data.favorites || [];
  return favorites.map((f) => ({
    productId: f.product_id,
    product: f.product ? mapProductFromApi(f.product) : null,
  }));
}

export async function toggleFavorite(productId) {
  const response = await apiClient.post("/favorites/toggle", { product_id: productId });
  return response.data.is_favorite;
}