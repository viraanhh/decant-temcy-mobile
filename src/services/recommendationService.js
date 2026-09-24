import apiClient from "./apiClient";
import { mapProductFromApi } from "./productService";

// Backend:
//   GET /api/recommendations/popular       -> publik, { products: [...] }
//   GET /api/recommendations/personalized  -> wajib login, { products, type, based_on }
//                                              (otomatis fallback ke populer di backend
//                                               kalau user belum punya riwayat/preferensi)
//
// isLoggedIn dipakai supaya guest tidak memicu request ke endpoint yang butuh
// auth (yang pasti 401), dan otomatis pakai /popular sebagai gantinya.
export async function getHomeRecommendations(isLoggedIn = false) {
  try {
    const endpoint = isLoggedIn ? "/recommendations/personalized" : "/recommendations/popular";
    const response = await apiClient.get(endpoint);
    const products = response.data?.products || [];
    return products.map(mapProductFromApi);
  } catch (err) {
    // Kalau personalized gagal (mis. token bermasalah), coba fallback ke popular
    // supaya section "Rekomendasi Untukmu" tidak kosong total.
    try {
      const fallback = await apiClient.get("/recommendations/popular");
      const products = fallback.data?.products || [];
      return products.map(mapProductFromApi);
    } catch (fallbackErr) {
      return [];
    }
  }
}
export async function getSimilarProducts(productId) {
  try {
    const response = await apiClient.get(`/recommendations/similar/${productId}`);
    const products = response.data?.products || [];
    return products.map(mapProductFromApi);
  } catch (err) {
    return [];
  }
}