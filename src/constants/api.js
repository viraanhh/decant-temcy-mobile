export const API_BASE_URL = "http://10.131.209.246:5000/api";

// Base URL tanpa "/api" — dipakai untuk akses file statis (gambar produk, avatar)
export const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export function getProductImageUrl(filename) {
  if (!filename) return null;
  return `${SERVER_BASE_URL}/uploads/products/${filename}`;
}

export function getAvatarUrl(filename) {
  if (!filename || filename === "default-avatar.png") return null;
  return `${SERVER_BASE_URL}/uploads/avatars/${filename}`;
}