import { markOrderAsPaid } from "./orderService";

// 🔴 TODO: ganti ke false + sambungkan ke POST /api/payments (payment gateway asli)
// begitu backend teman sudah dikonfirmasi
const USE_DUMMY_DATA = true;

// 🔴 Khusus dummy: menyimpan status simulasi di memori sementara
const dummyPaymentStatus = {};

export async function createPayment(orderId, amount) {
  if (USE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 500));
    return {
      paymentId: `PAY-${orderId}`,
      orderId,
      amount,
      method: "QRIS",
      status: "pending",
      // 🔴 Placeholder — nanti ini diisi URL gambar QRIS asli dari payment gateway
      qrImageUrl: null,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 menit
    };
  }
  // const response = await apiClient.post("/payments", { orderId, method: "QRIS" });
  // return response.data;
}

export async function checkPaymentStatus(paymentId) {
  if (USE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 400));
    // Di dummy ini, status "paid" baru muncul setelah disimulasikan manual
    return { status: dummyPaymentStatus[paymentId] || "pending" };
  }
  // const response = await apiClient.get(`/payments/${paymentId}/status`);
  // return response.data;
}

export function simulatePaymentSuccess(paymentId) {
  dummyPaymentStatus[paymentId] = "paid";
  const orderId = Number(paymentId.replace("PAY-", ""));
  markOrderAsPaid(orderId);
}