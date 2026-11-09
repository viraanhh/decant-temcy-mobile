import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { COLORS } from "../constants/colors";
import { getNotifications, markAllAsRead } from "../services/notificationService";

const TYPE_ICON = { order: "📦", promo: "🎁", system: "🔔" };

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setNotifications(await getNotifications());
    } catch {
      setError("Gagal memuat notifikasi");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Muat ulang tiap layar dibuka (tanpa spinner kalau daftar sudah ada)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  const handleMarkAllRead = async () => {
    setIsMarking(true);
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
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
        contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: 40 }}>🔔</Text>
            <Text style={styles.emptyTitle}>Belum Ada Notifikasi</Text>
            <Text style={styles.emptySub}>Tarik ke bawah untuk menyegarkan</Text>
          </View>
        }
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
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyTitle: { color: COLORS.text, fontSize: 15, marginTop: 10 },
  emptySub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
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