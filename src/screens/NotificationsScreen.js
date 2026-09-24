import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS } from "../constants/colors";
import { getNotifications, markAllAsRead } from "../services/notificationService";

const TYPE_ICON = { order: "📦", promo: "🎁", system: "🔔" };

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Baru saja";
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${Math.floor(diffHours / 24)} hari lalu`;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setIsLoading(true);
    setError("");
    getNotifications()
      .then(setNotifications)
      .catch(() => setError("Gagal memuat notifikasi"))
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(load);

  const hasUnread = notifications.some((n) => !n.isRead);

  const handleMarkAllRead = async () => {
    setIsMarking(true);
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      setError("Gagal menandai notifikasi");
    } finally {
      setIsMarking(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ fontSize: 40 }}>🔔</Text>
        <Text style={styles.emptyTitle}>Belum Ada Notifikasi</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifikasi</Text>
        {hasUnread && (
          <Pressable onPress={handleMarkAllRead} disabled={isMarking}>
            <Text style={styles.markAllText}>{isMarking ? "..." : "Tandai Semua Dibaca"}</Text>
          </Pressable>
        )}
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.isRead && styles.cardUnread]}>
            <Text style={{ fontSize: 20 }}>{TYPE_ICON[item.type] || "🔔"}</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: COLORS.text, fontSize: 15, marginTop: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 8 },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: "600" },
  markAllText: { color: COLORS.primary, fontSize: 12, fontWeight: "600" },
  errorText: { color: COLORS.primary, fontSize: 12, textAlign: "center", marginBottom: 8 },
  card: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: "flex-start" },
  cardUnread: { borderColor: COLORS.primary },
  title: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  message: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  time: { color: COLORS.textFaint, fontSize: 10, marginTop: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 4 },
});