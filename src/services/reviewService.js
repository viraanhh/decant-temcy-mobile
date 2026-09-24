import apiClient from "./apiClient";

const USE_DUMMY_DATA = false;

// 🔴 Field user.full_name masih asumsi dari struktur User model yang kita
// tahu (kolom full_name) — belum pernah lihat JSON asli 1 review dengan
// relasi user ter-include. Kalau field beda, ubah di sini saja.
function mapBackendReview(r) {
  return {
    id: r.review_id ?? r.id,
    userName: r.user?.full_name ?? "Pengguna",
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at ?? r.createdAt,
  };
}

export async function getReviewsByProduct(productId) {
  if (USE_DUMMY_DATA) return { reviews: [], avgRating: 0, totalReviews: 0 };

  const response = await apiClient.get(`/reviews/product/${productId}`);
  const data = response.data;

  return {
    reviews: (data.reviews || []).map(mapBackendReview),
    avgRating: Number(data.avg_rating ?? 0),
    totalReviews: Number(data.total_reviews ?? 0),
  };
}

export async function submitReview({ productId, rating, comment }) {
  if (USE_DUMMY_DATA) return null;

  // Backend TIDAK butuh orderItemId — tidak ada validasi "harus sudah beli"
  // di backend saat ini, hanya product_id, rating, comment.
  const response = await apiClient.post("/reviews", {
    product_id: productId,
    rating,
    comment,
  });

  return response.data;
}