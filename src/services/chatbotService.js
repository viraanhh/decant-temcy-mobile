import apiClient from "./apiClient";

const USE_DUMMY_DATA = false;

export async function sendChatMessage(message, sessionId) {
  if (USE_DUMMY_DATA) {
    await new Promise((r) => setTimeout(r, 600));

    return {
      reply: `[Dummy] Pesan Anda diterima: "${message}"`,
      recommendations: null,
    };
  }

  const response = await apiClient.post("/chatbot", {
    message: message.trim(),
    session_id: sessionId,
  });

  return {
    reply: response.data.reply,
    recommendations: response.data.recommendations ?? null,
  };
}