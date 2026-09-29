import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { COLORS } from "../constants/colors";
import { getMyOrders, ORDER_STATUS_LABEL } from "../services/orderService";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

const FILTER_GROUPS = {
  pending: ["pending"],
  active: ["paid", "processing", "shipped"],
  delivered: ["delivered"],
};

const FILTER_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Belum Bayar" },
  { value: "active", label: "Diproses" },
  { value: "delivered", label: "Selesai" },
];

const TAB_COLORS = {
  "": COLORS.primary,
  "pending": "#E8A33D", 
  "active": "#4A90D9",  
  "delivered": "#3DBA6C", 
};

export default function OrderHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  
  // State Pull-to-Refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      setError("");
      getMyOrders()
        .then(setOrders)
        .catch(() => setError("Gagal memuat riwayat pesanan"))
        .finally(() => setIsLoading(false));
    }, [])
  );

  // Handler Pull-to-Refresh
  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await getMyOrders();
      setOrders(data);
      setError("");
    } catch (err) {
      setError("Gagal memuat riwayat pesanan");
    } finally {
      setIsRefreshing(false);
    }
  };

  const displayedOrders = filterStatus
    ? orders.filter((o) => FILTER_GROUPS[filterStatus]?.includes(o.status))
    : orders;

  const FilterRow = (
    <View style={styles.filterRow}>
      {FILTER_OPTIONS.map((item) => {
        const isActive = filterStatus === item.value;
        const activeColor = TAB_COLORS[item.value] || COLORS.primary;

        return (
          <Pressable
            key={item.value}
            style={[
              styles.filterChip, 
              isActive && { borderColor: activeColor, backgroundColor: `${activeColor}15` }
            ]}
            onPress={() => setFilterStatus(item.value)}
          >
            <Text style={[
              styles.filterChipText, 
              isActive && { color: activeColor, fontWeight: "700" }
            ]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <ScrollView contentContainerStyle={{ flex: 1 }} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        <View style={styles.centerContainer}>
          <Text style={{ color: COLORS.textMuted }}>{error}</Text>
        </View>
      </ScrollView>
    );
  }

  if (orders.length === 0) {
    return (
      <ScrollView contentContainerStyle={{ flex: 1 }} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        <View style={styles.centerContainer}>
          <Text style={{ fontSize: 40 }}>📦</Text>
          <Text style={styles.emptyTitle}>Belum Ada Pesanan</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Riwayat Pesanan</Text>
      {FilterRow}

      {displayedOrders.length === 0 ? (
        <ScrollView contentContainerStyle={{ flex: 1 }} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
          <View style={styles.centerContainer}>
            <Text style={{ color: COLORS.textMuted }}>Tidak ada pesanan dengan status ini.</Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={displayedOrders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingTop: 4 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          renderItem={({ item }) => {
            const status = ORDER_STATUS_LABEL[item.status] || { text: item.status, color: "textMuted" };
            const statusColor = COLORS[status.color] || COLORS.textMuted;
            return (
              <Pressable style={styles.orderCard} onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                  <Text style={[styles.statusBadge, { color: statusColor, borderColor: statusColor }]}>{status.text}</Text>
                </View>
                <Text style={styles.orderItems}>{item.items.length} produk · {item.items.map((i) => i.productName).join(", ")}</Text>
                <Text style={styles.orderTotal}>{formatRupiah(item.total)}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: COLORS.text, fontSize: 15, marginTop: 10 },
  header: { color: COLORS.text, fontSize: 20, fontWeight: "600", padding: 16, paddingBottom: 8 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  filterChip: { flex: 1, alignItems: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingVertical: 8 },
  filterChipText: { color: COLORS.textMuted, fontSize: 11 },
  orderCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderNumber: { color: COLORS.text, fontWeight: "600", fontSize: 13 },
  statusBadge: { fontSize: 10, borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  orderItems: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
  orderTotal: { color: COLORS.primary, fontSize: 14, fontWeight: "700", marginTop: 8 },
});