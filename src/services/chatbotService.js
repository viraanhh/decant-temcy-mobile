import apiClient from "./apiClient";

const USE_DUMMY_DATA = false;

// Backend endpoint: POST /api/chatbot
// Request:  { message, session_id? }
// Response: { reply } — HANYA teks, tidak ada recommendedProductIds
// (berbeda dari asumsi dummy lama). Kalau AI Engineer nanti menambah
// rekomendasi produk, kemungkinan besar formatnya perlu didiskusikan ulang —
// untuk sekarang chatbot murni percakapan teks.
export async function sendChatMessage(message, sessionId) {
  if (USE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 600));
    return { reply: `[Dummy] Pesan Anda diterima: "${message}"` };
  }

  const response = await apiClient.post("/chatbot", {
    message,
    session_id: sessionId,
  });

  return { reply: response.data.reply };
}