import apiClient from "./apiClient";

const USE_DUMMY_DATA = false;

function mapNotification(raw) {
  return {
    id: raw.notification_id,
    title: raw.title,
    message: raw.message,
    type: raw.type, // 'order' | 'promo' | 'system'
    isRead: raw.is_read,
    createdAt: raw.createdAt,
  };
}

export async function getNotifications() {
  if (USE_DUMMY_DATA) return [];

  const response = await apiClient.get("/notifications");
  return (response.data.notifications || []).map(mapNotification);
}

// PENTING: backend HANYA punya "tandai semua terbaca" — tidak ada
// endpoint untuk tandai satu notifikasi saja. Jadi fungsi ini akan
// menandai SEMUA notifikasi sekaligus, bukan cuma yang di-tap.
export async function markAllAsRead() {
  if (USE_DUMMY_DATA) return;

  await apiClient.put("/notifications/read-all");
}