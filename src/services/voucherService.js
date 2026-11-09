import apiClient from "./apiClient";

export async function checkVoucher(code, totalPrice) {
  const response = await apiClient.post("/vouchers/check", {
    code,
    total_price: totalPrice,
  });
  return response.data;
}

// GET /api/vouchers/active -> { vouchers: [...] }
export async function getActiveVouchers() {
  const response = await apiClient.get("/vouchers/active");
  return response.data.vouchers || [];
}