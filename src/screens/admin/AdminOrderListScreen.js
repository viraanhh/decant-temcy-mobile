import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, StatusBar, Platform, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getAdminOrders } from "../../services/adminService";
import AppTextInput from "../../components/AppTextInput";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount || 0);
}

const STATUS_TABS = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "paid", label: "Dibayar" },
  { value: "processing", label: "Diproses" },
  { value: "shipped", label: "Dikirim" },
  { value: "delivered", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

const TIME_FILTERS = [
  { value: "all", label: "Semua Waktu" },
  { value: "today", label: "Hari Ini" },
  { value: "week", label: "7 Hari Terakhir" },
  { value: "month", label: "Bulan Ini" },
  { value: "custom", label: "Rentang Tanggal Custom" },
];

const STATUS_COLORS = {
  pending: "#E8A33D",
  paid: "#4A90D9",
  processing: "#4A90D9",
  shipped: "#8B5CF6",
  delivered: "#3DBA6C",
  cancelled: COLORS.primary, // Merah
};

// Ambil sekaligus dalam jumlah besar agar filter waktu akurat lintas semua data
const FETCH_LIMIT = 500;

export default function AdminOrderListScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [isTimeModalVisible, setTimeModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const insets = useSafeAreaInsets();
  const safeTopPadding = insets.top > 0 ? insets.top : (Platform.OS === "android" ? StatusBar.currentHeight : 44);

  const loadOrders = async (status = statusFilter) => {
    setIsLoading(true);
    try {
      const result = await getAdminOrders({
        page: 1,
        limit: FETCH_LIMIT,
        status: status || undefined,
      });
      setOrders(result.orders);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders(statusFilter);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter])
  );

  const filteredOrdersByTime = orders.filter((order) => {
    const orderDateStr = order.created_at || order.createdAt;
    if (!orderDateStr) return timeFilter === "all";
    const orderDate = new Date(orderDateStr);
    const now = new Date();

    if (timeFilter === "all") return true;
    if (timeFilter === "today") return orderDate.toDateString() === now.toDateString();
    if (timeFilter === "week") return (now - orderDate) / (1000 * 60 * 60 * 24) <= 7;
    if (timeFilter === "month") return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    if (timeFilter === "custom") {
      if (!customStart || !customEnd) return true;
      const start = new Date(customStart + "T00:00:00");
      const end = new Date(customEnd + "T23:59:59");
      return orderDate >= start && orderDate <= end;
    }
    return true;
  });

  const activeTimeLabel =
    timeFilter === "custom" && customStart && customEnd
      ? `${customStart} s/d ${customEnd}`
      : TIME_FILTERS.find((t) => t.value === timeFilter)?.label || "Waktu";

  return (
    <View style={[styles.container, { paddingTop: safeTopPadding }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Kelola Pesanan</Text>
          <Text style={styles.subtitle}>{filteredOrdersByTime.length} pesanan</Text>
        </View>
        <Pressable style={styles.timeFilterButton} onPress={() => setTimeModalVisible(true)}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.text} />
          <Text style={styles.timeFilterButtonText} numberOfLines={1}>{activeTimeLabel}</Text>
          <Ionicons name="chevron-down" size={12} color={COLORS.textMuted} />
        </Pressable>
      </View>

      <FlatList
        horizontal
        style={styles.tabsContainer}
        showsHorizontalScrollIndicator={false}
        data={STATUS_TABS}
        keyExtractor={(item) => item.value}
        contentContainerStyle={{ gap: 8, paddingHorizontal: SPACING.lg }}
        renderItem={({ item }) => {
          const isActive = statusFilter === item.value;
          const themeColor = item.value === "" ? COLORS.primary : (STATUS_COLORS[item.value] || COLORS.primary);
          
          return (
            <Pressable
              style={[
                styles.filterChip, 
                isActive && { borderColor: themeColor, backgroundColor: `${themeColor}15` }
              ]}
              onPress={() => setStatusFilter(item.value)}
            >
              <Text style={[
                styles.filterChipText, 
                isActive && { color: themeColor, fontWeight: "700" }
              ]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredOrdersByTime}
          keyExtractor={(item) => String(item.order_id)}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.sm }}
          ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada pesanan untuk filter ini.</Text>}
          renderItem={({ item }) => {
            // Perlindungan/fallback untuk mendapatkan nama customer dengan aman
            const customerName = item.user?.full_name || item.user?.name || item.full_name || item.customer_name || "Customer";

            return (
              <Pressable style={styles.card} onPress={() => navigation.navigate("AdminOrderDetail", { order: item })}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.orderCode}>{item.order_code}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status] || COLORS.textMuted}20` }]}>
                    <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[item.status] || COLORS.textMuted }]}>
                      {STATUS_TABS.find((s) => s.value === item.status)?.label || item.status}
                    </Text>
                  </View>
                </View>
                
                {/* Baris Nama Customer */}
                <Text style={styles.customerName} numberOfLines={1}>
                  {customerName}
                </Text>
                
                <Text style={styles.itemCount}>{item.items?.length || 0} produk</Text>
                <Text style={styles.total}>{formatRupiah(item.total_price)}</Text>
              </Pressable>
            );
          }}
        />
      )}

      {/* Modal Filter Waktu */}
      <Modal visible={isTimeModalVisible} animationType="fade" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setTimeModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Filter Berdasarkan Waktu</Text>
            {TIME_FILTERS.map((opt) => (
              <Pressable
                key={opt.value}
                style={styles.timeOptionRow}
                onPress={() => setTimeFilter(opt.value)}
              >
                <Text style={[styles.timeOptionText, timeFilter === opt.value && styles.timeOptionTextActive]}>
                  {opt.label}
                </Text>
                {timeFilter === opt.value && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
              </Pressable>
            ))}

            {timeFilter === "custom" && (
              <View style={{ marginTop: SPACING.sm, gap: 8 }}>
                <Text style={styles.modalLabel}>Dari Tanggal (YYYY-MM-DD)</Text>
                <AppTextInput style={styles.dateInput} value={customStart} onChangeText={setCustomStart} placeholder="2026-09-01" />
                <Text style={styles.modalLabel}>Sampai Tanggal (YYYY-MM-DD)</Text>
                <AppTextInput style={styles.dateInput} value={customEnd} onChangeText={setCustomEnd} placeholder="2026-09-30" />
              </View>
            )}

            <Pressable style={styles.applyButton} onPress={() => setTimeModalVisible(false)}>
              <Text style={styles.applyButtonText}>Terapkan</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: SPACING.lg, paddingBottom: SPACING.md },
  title: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
  subtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  timeFilterButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingVertical: 8, paddingHorizontal: 12, maxWidth: 160 },
  timeFilterButtonText: { color: COLORS.text, fontSize: 11, fontWeight: "600" },
  tabsContainer: { flexGrow: 0, flexShrink: 0, marginBottom: SPACING.sm },
  
  filterChip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, height: 32, justifyContent: "center", paddingHorizontal: 16 },
  filterChipText: { color: COLORS.textMuted, fontSize: 11 },
  
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center", marginTop: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, ...CARD_SHADOW },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderCode: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  statusBadge: { borderRadius: RADIUS.full, height: 22, paddingHorizontal: 10, justifyContent: "center", alignItems: "center" },
  statusBadgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  
  // Style untuk Nama Customer di Card
  customerName: { color: COLORS.textMuted, fontSize: 12, marginTop: 8 },
  
  itemCount: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  total: { color: COLORS.primary, fontWeight: "700", fontSize: 14, marginTop: 4 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: SPACING.xl },
  modalContent: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.lg, ...CARD_SHADOW },
  modalTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginBottom: SPACING.sm },
  modalLabel: { color: COLORS.textMuted, fontSize: 11 },
  dateInput: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, color: COLORS.text },
  timeOptionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  timeOptionText: { color: COLORS.text, fontSize: 14 },
  timeOptionTextActive: { color: COLORS.primary, fontWeight: "700" },
  applyButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14, alignItems: "center", marginTop: SPACING.md },
  applyButtonText: { color: COLORS.text, fontWeight: "600" },
});