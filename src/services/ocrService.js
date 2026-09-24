import apiClient from "./apiClient";
import { mapProductFromApi } from "./productService";

// Backend: POST /api/cv/scan (lihat cv.controller.js)
// Menerima multipart/form-data field "image", proses OCR dilakukan
// sepenuhnya di server Python (diteruskan lewat proxy Node.js) — mobile
// TIDAK melakukan OCR/CV apa pun secara lokal, hanya ambil & kirim gambar.
//
// Response asli backend:
// {
//   recognizedText, confidence,
//   matchedProduct: {...} | null,   // 1 produk paling cocok (raw dari DB)
//   recommendations: [...],          // produk alternatif dari fuzzy match (raw dari DB)
//   message?: string                 // ada isinya kalau OCR gagal/servis down
// }
export async function searchProductByImage(imageUri) {
  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    name: "scan.jpg",
    type: "image/jpeg",
  });

  const response = await apiClient.post("/cv/scan", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const { recognizedText, matchedProduct, recommendations = [], message } = response.data;

  // Gabungkan matchedProduct (kalau ada) + recommendations jadi satu list,
  // sudah di-map ke format UI (id, variants, dst — sama seperti Katalog),
  // dan dedupe supaya matchedProduct tidak dobel muncul di recommendations.
  const rawList = [
    ...(matchedProduct ? [matchedProduct] : []),
    ...recommendations,
  ];

  const seenIds = new Set();
  const matchedProducts = rawList
    .filter((p) => {
      if (seenIds.has(p.product_id)) return false;
      seenIds.add(p.product_id);
      return true;
    })
    .map(mapProductFromApi);

  return {
    recognizedText,
    matchedProducts,
    message: message || null, // pesan dari backend saat OCR gagal/servis down
  };
}