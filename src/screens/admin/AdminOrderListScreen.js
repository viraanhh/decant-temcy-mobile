import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, StatusBar, Platform, Modal, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getAdminOrders } from "../../services/adminService";
import AppTextInput from "../../components/AppTextInput";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount || 0);
}

const formatDateInput = (text) => {
  const cleaned = text.replace(/[^0-9]/g, "");
  let formatted = cleaned;
  if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  if (cleaned.length > 4) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  return formatted;
};

const STATUS_TABS = [
  { value: "", label: "Semua", icon: "grid-outline" },
  { value: "pending", label: "Menunggu", icon: "time-outline" },
  { value: "paid", label: "Dibayar", icon: "card-outline" },
  { value: "processing", label: "Diproses", icon: "sync-outline" },
  { value: "shipped", label: "Dikirim", icon: "car-outline" },
  { value: "delivered", label: "Selesai", icon: "checkmark-done-circle-outline" },
  { value: "cancelled", label: "Dibatalkan", icon: "close-circle-outline" },
];

const TIME_FILTERS = [
  { value: "all", label: "Semua Waktu" },
  { value: "today", label: "Hari Ini" },
  { value: "week", label: "7 Hari Terakhir" },
  { value: "month", label: "Bulan Ini" },
  { value: "custom", label: "Rentang Tanggal Custom" },
];

const STATUS_COLORS = {
  pending: "#F59E0B",
  paid: "#3B82F6",
  processing: "#3B82F6",
  shipped: "#8B5CF6",
  delivered: "#10B981",
  cancelled: "#EF4444", 
};

const FETCH_LIMIT = 500;

export default function AdminOrderListScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [isTimeModalVisible, setTimeModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    }, [statusFilter])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders(statusFilter);
    setIsRefreshing(false);
  };

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
      if (customStart.length !== 10 || customEnd.length !== 10) return true;
      const [sDay, sMonth, sYear] = customStart.split("/");
      const [eDay, eMonth, eYear] = customEnd.split("/");
      const start = new Date(`${sYear}-${sMonth}-${sDay}T00:00:00`);
      const end = new Date(`${eYear}-${eMonth}-${eDay}T23:59:59`);
      return orderDate >= start && orderDate <= end;
    }
    return true;
  });

  const activeTimeLabel =
    timeFilter === "custom" && customStart && customEnd
      ? `${customStart} - ${customEnd}`
      : TIME_FILTERS.find((t) => t.value === timeFilter)?.label || "Waktu";

  return (
    <View style={[styles.container, { paddingTop: safeTopPadding }]}>
      {/* HEADER UTAMA */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Kelola Pesanan</Text>
          <Text style={styles.subtitle}>{filteredOrdersByTime.length} pesanan ditemukan</Text>
        </View>
        <Pressable 
          style={({ pressed }) => [styles.timeFilterButton, pressed && { opacity: 0.8 }]} 
          onPress={() => setTimeModalVisible(true)}
        >
          <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
          <Text style={styles.timeFilterButtonText} numberOfLines={1}>{activeTimeLabel}</Text>
          <Ionicons name="chevron-down" size={12} color={COLORS.textMuted} />
        </Pressable>
      </View>

      {/* FILTER TABS STATUS (HORIZONTAL) */}
      <View style={{ height: 50, marginBottom: 4 }}>
        <FlatList
          horizontal
          style={styles.tabsContainer}
          showsHorizontalScrollIndicator={false}
          data={STATUS_TABS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={{ gap: 8, paddingHorizontal: SPACING.lg, alignItems: "center" }}
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
                <Ionicons name={item.icon} size={14} color={isActive ? themeColor : COLORS.textMuted} />
                <Text style={[
                  styles.filterChipText, 
                  isActive && { color: themeColor, fontWeight: "750" }
                ]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* KONTEN UTAMA */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredOrdersByTime}
          keyExtractor={(item) => String(item.order_id)}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, flexGrow: 1, paddingBottom: 90 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Tidak Ada Pesanan</Text>
              <Text style={styles.emptyText}>Belum ada data pesanan untuk filter status atau waktu ini.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const customerName = item.user?.full_name || item.user?.name || item.full_name || item.customer_name || "Pelanggan";
            const isPickup = item.delivery_method === "pickup";
            const storeName = isPickup ? (item.shipping_address || "").match(/^Pickup di (.+?)\s+[—-]\s/)?.[1] : null;

            const statusLabel = isPickup && item.status === "shipped" 
              ? "Siap Diambil" 
              : (STATUS_TABS.find((s) => s.value === item.status)?.label || item.status);

            const statusColor = STATUS_COLORS[item.status] || COLORS.textMuted;

            return (
              <Pressable 
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]} 
                onPress={() => navigation.navigate("AdminOrderDetail", { order: item })}
              >
                <View style={styles.cardTopRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="receipt-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.orderCode}>{item.order_code}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.customerRow}>
                  <Ionicons name="person-outline" size={13} color={COLORS.textMuted} />
                  <Text style={styles.customerName} numberOfLines={1}>{customerName}</Text>
                </View>

                <View style={styles.cardBottomRow}>
                  <View style={styles.itemCountBadge}>
                    <Ionicons name="cube-outline" size={12} color={COLORS.textMuted} />
                    <Text style={styles.itemCount}>{item.items?.length || 0} Produk</Text>
                  </View>
                  <Text style={styles.total}>{formatRupiah(item.total_price)}</Text>
                </View>
                
                {isPickup && (
                  <View style={styles.pickupRow}>
                    <Ionicons name="storefront-outline" size={13} color="#10B981" />
                    <Text style={styles.pickupText} numberOfLines={1}>
                      Ambil di Toko{storeName ? ` · ${storeName}` : ""}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}

      {/* MODAL FILTER WAKTU */}
      <Modal visible={isTimeModalVisible} animationType="fade" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setTimeModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Waktu Pesanan</Text>
              <Pressable onPress={() => setTimeModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </Pressable>
            </View>

            {TIME_FILTERS.map((opt) => (
              <Pressable key={opt.value} style={styles.timeOptionRow} onPress={() => setTimeFilter(opt.value)}>
                <Text style={[styles.timeOptionText, timeFilter === opt.value && styles.timeOptionTextActive]}>{opt.label}</Text>
                {timeFilter === opt.value ? (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                ) : (
                  <Ionicons name="ellipse-outline" size={20} color={COLORS.border} />
                )}
              </Pressable>
            ))}

            {timeFilter === "custom" && (
              <View style={styles.customDateWrapper}>
                <Text style={styles.modalLabel}>Dari Tanggal (DD/MM/YYYY)</Text>
                <AppTextInput 
                  style={styles.dateInput} 
                  value={customStart} 
                  onChangeText={(text) => setCustomStart(formatDateInput(text))} 
                  placeholder="01/09/2026" 
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <Text style={[styles.modalLabel, { marginTop: 8 }]}>Sampai Tanggal (DD/MM/YYYY)</Text>
                <AppTextInput 
                  style={styles.dateInput} 
                  value={customEnd} 
                  onChangeText={(text) => setCustomEnd(formatDateInput(text))} 
                  placeholder="30/09/2026" 
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
            )}

            <Pressable style={styles.applyButton} onPress={() => setTimeModalVisible(false)}>
              <Text style={styles.applyButtonText}>Terapkan Filter</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: SPACING.lg, 
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm 
  },
  title: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
  subtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  
  timeFilterButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6, 
    backgroundColor: COLORS.surface, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: RADIUS.full, 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    maxWidth: 170,
    ...CARD_SHADOW
  },
  timeFilterButtonText: { color: COLORS.text, fontSize: 11, fontWeight: "700" },
  
  tabsContainer: { flexGrow: 0, flexShrink: 0 },
  filterChip: { 
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: RADIUS.full, 
    height: 36, 
    paddingHorizontal: 14,
    ...CARD_SHADOW
  },
  filterChipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },

  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 20 },
  emptyIconBox: { 
    width: 80, 
    height: 80, 
    borderRadius: RADIUS.full, 
    backgroundColor: COLORS.surface, 
    alignItems: "center", 
    justifyContent: "center", 
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border 
  },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center", lineHeight: 18 },

  card: { 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    padding: SPACING.md, 
    ...CARD_SHADOW 
  },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderCode: { color: COLORS.text, fontWeight: "750", fontSize: 14 },
  
  statusBadge: { 
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.full, 
    height: 24, 
    paddingHorizontal: 10, 
  },
  statusDot: { width: 6, height: 6, borderRadius: RADIUS.full },
  statusBadgeText: { fontSize: 10, fontWeight: "750", textTransform: "uppercase" },

  cardDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },

  customerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  customerName: { color: COLORS.text, fontSize: 13, fontWeight: "600", flex: 1 },

  cardBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  itemCountBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  itemCount: { color: COLORS.textMuted, fontSize: 11, fontWeight: "500" },
  total: { color: COLORS.primary, fontWeight: "800", fontSize: 14 },

  pickupRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6, 
    marginTop: 8, 
    backgroundColor: "rgba(16, 185, 129, 0.08)", 
    paddingVertical: 6, 
    paddingHorizontal: 8, 
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)"
  },
  pickupText: { color: "#10B981", fontSize: 11, fontWeight: "700", flex: 1 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: SPACING.lg },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, ...CARD_SHADOW },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md },
  modalTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  modalLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: "600", marginBottom: 4 },
  dateInput: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, color: COLORS.text, fontSize: 13 },
  timeOptionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  timeOptionText: { color: COLORS.text, fontSize: 14, fontWeight: "500" },
  timeOptionTextActive: { color: COLORS.primary, fontWeight: "750" },
  customDateWrapper: { marginTop: SPACING.sm, backgroundColor: COLORS.background, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  applyButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14, alignItems: "center", marginTop: SPACING.md, ...CARD_SHADOW },
  applyButtonText: { color: COLORS.surface, fontWeight: "800", fontSize: 14 },
});