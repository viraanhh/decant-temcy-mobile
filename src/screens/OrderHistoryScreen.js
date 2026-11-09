import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { getMyOrders, ORDER_STATUS_LABEL } from "../services/orderService";
import { SPACING, RADIUS, CARD_SHADOW } from "../constants/theme";
import AppTextInput from "../components/AppTextInput";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

const formatDateInput = (text) => {
  const cleaned = text.replace(/[^0-9]/g, "");
  let formatted = cleaned;
  if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  if (cleaned.length > 4) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  return formatted;
};

// Fungsi helper penampil status dinamis (mendukung label "Siap Diambil" untuk pickup)
function getHistoryOrderStatusLabel(order) {
  if (order.deliveryMethod === "pickup" && order.status === "shipped") {
    return { text: "Siap Diambil", color: "primary" };
  }
  return ORDER_STATUS_LABEL[order.status] || { text: order.status, color: "textMuted" };
}

const FILTER_OPTIONS = [
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
  { value: "custom", label: "Pilih Tanggal Manual" },
];

const TAB_COLORS = {
  "": COLORS.primary,
  "pending": "#E8A33D", 
  "paid": "#4A90D9",  
  "processing": "#4A90D9",
  "shipped": "#9333EA",
  "delivered": "#3DBA6C", 
  "cancelled": COLORS.textFaint,
};

export default function OrderHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [timeFilter, setTimeFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [isTimeModalVisible, setTimeModalVisible] = useState(false);

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

  const displayedOrders = orders.filter((o) => {
    const matchesStatus = filterStatus ? o.status === filterStatus : true;
    if (!matchesStatus) return false;

    const orderDateStr = o.createdAt || o.created_at;
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
      ? `${customStart} s/d ${customEnd}`
      : TIME_FILTERS.find((t) => t.value === timeFilter)?.label || "Waktu";

  const FilterRow = (
    <View style={styles.filterWrapper}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.filterScrollContainer}
      >
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
      </ScrollView>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Memuat riwayat...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <ScrollView contentContainerStyle={{ flex: 1 }} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </ScrollView>
    );
  }

  if (orders.length === 0) {
    return (
      <ScrollView contentContainerStyle={{ flex: 1 }} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        <View style={styles.centerContainer}>
          <Ionicons name="cart-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyTitle}>Belum Ada Pesanan</Text>
          <Text style={styles.emptySubtitle}>Ayo mulai belanja dan temukan parfum favoritmu!</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Riwayat Pesanan</Text>
        <Pressable style={styles.timeFilterButton} onPress={() => setTimeModalVisible(true)}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.text} />
          <Text style={styles.timeFilterButtonText} numberOfLines={1}>{activeTimeLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
        </Pressable>
      </View>
      
      {FilterRow}

      {displayedOrders.length === 0 ? (
        <ScrollView contentContainerStyle={{ flex: 1 }} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
          <View style={styles.centerContainer}>
            <Ionicons name="search-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyTitle}>Tidak Ada Pesanan</Text>
            <Text style={styles.emptySubtitle}>Tidak ada pesanan yang sesuai dengan filter ini.</Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={displayedOrders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          renderItem={({ item }) => {
            const status = getHistoryOrderStatusLabel(item);
            const statusColor = COLORS[status.color] || COLORS.textMuted;
            const dateStr = item.createdAt || item.created_at;
            const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "";

            return (
              <Pressable style={styles.orderCard} onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}>
                <View style={styles.orderHeader}>
                  <View style={styles.headerLeft}>
                    <Ionicons name="receipt-outline" size={18} color={COLORS.textMuted} />
                    <View>
                      <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                      {!!formattedDate && <Text style={styles.orderDate}>{formattedDate}</Text>}
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{status.text}</Text>
                  </View>
                </View>
                
                <View style={styles.divider} />

                <View style={styles.orderBody}>
                  <Ionicons name="cube-outline" size={20} color={COLORS.primary} style={{ marginTop: 2 }} />
                  <View style={styles.itemInfo}>
                    <Text style={styles.orderItemsTitle} numberOfLines={2}>
                      {item.items.map((i) => i.productName).join(", ")}
                    </Text>
                    <Text style={styles.orderItemsCount}>
                      {item.items.reduce((acc, curr) => acc + (curr.quantity || 1), 0)} Produk
                    </Text>
                  </View>
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.footerLabel}>Total Belanja</Text>
                  <Text style={styles.orderTotal}>{formatRupiah(item.total)}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* MODAL FILTER WAKTU */}
      <Modal visible={isTimeModalVisible} animationType="fade" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setTimeModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Filter Berdasarkan Waktu</Text>
            
            {TIME_FILTERS.map((opt) => (
              <Pressable key={opt.value} style={styles.timeOptionRow} onPress={() => setTimeFilter(opt.value)}>
                <Text style={[styles.timeOptionText, timeFilter === opt.value && styles.timeOptionTextActive]}>
                  {opt.label}
                </Text>
                {timeFilter === opt.value ? (
                  <Ionicons name="radio-button-on" size={22} color={COLORS.primary} />
                ) : (
                  <Ionicons name="radio-button-off" size={22} color={COLORS.border} />
                )}
              </Pressable>
            ))}

            {timeFilter === "custom" && (
              <View style={styles.customDateContainer}>
                <View style={styles.dateInputWrapper}>
                  <Text style={styles.modalLabel}>Dari Tanggal</Text>
                  <AppTextInput 
                    style={styles.dateInput} 
                    value={customStart} 
                    onChangeText={(text) => setCustomStart(formatDateInput(text))} 
                    placeholder="DD/MM/YYYY" 
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
                <View style={styles.dateInputWrapper}>
                  <Text style={styles.modalLabel}>Sampai Tanggal</Text>
                  <AppTextInput 
                    style={styles.dateInput} 
                    value={customEnd} 
                    onChangeText={(text) => setCustomEnd(formatDateInput(text))} 
                    placeholder="DD/MM/YYYY" 
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
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
  centerContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 20 },
  
  loadingText: { color: COLORS.primary, fontSize: 16, marginTop: 12, fontWeight: "600" },
  errorText: { color: COLORS.textMuted, fontSize: 16, marginTop: 12, textAlign: "center" },
  
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginTop: 16 },
  emptySubtitle: { color: COLORS.textMuted, fontSize: 14, marginTop: 8, textAlign: "center", paddingHorizontal: 20 },
  
  headerContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 10 },
  header: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
  
  timeFilterButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, maxWidth: 160 },
  timeFilterButtonText: { color: COLORS.text, fontSize: 12, fontWeight: "600" },
  
  filterWrapper: { marginBottom: 10 },
  filterScrollContainer: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    gap: 10, 
    alignItems: "center" 
  },
  filterChip: { 
    alignItems: "center", 
    justifyContent: "center",
    backgroundColor: COLORS.surface, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 20, 
    paddingVertical: 8, 
    paddingHorizontal: 16,
  },
  filterChipText: { 
    color: COLORS.textMuted, 
    fontSize: 13, 
    fontWeight: "500",
  },
  
  listContainer: { padding: 16, gap: 16, paddingBottom: 40 },
  orderCard: { 
    backgroundColor: COLORS.surface, 
    borderRadius: 12, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: COLORS.border,
  },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerLeft: { flexDirection: "row", gap: 8, alignItems: "center", flex: 1 },
  orderNumber: { color: COLORS.text, fontWeight: "700", fontSize: 14 },
  orderDate: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: "700" },
  
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  
  orderBody: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  itemInfo: { flex: 1 },
  orderItemsTitle: { color: COLORS.text, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  orderItemsCount: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  
  orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  footerLabel: { color: COLORS.text, fontSize: 14, fontWeight: "500" },
  orderTotal: { color: COLORS.primary, fontSize: 16, fontWeight: "700" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: SPACING.xl },
  modalContent: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.lg, ...CARD_SHADOW, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: SPACING.md, textAlign: "center" },
  
  timeOptionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  timeOptionText: { color: COLORS.text, fontSize: 15 },
  timeOptionTextActive: { color: COLORS.primary, fontWeight: "700" },
  
  customDateContainer: { marginTop: SPACING.md, gap: 12 },
  dateInputWrapper: { gap: 6 },
  modalLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: "500" },
  dateInput: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text, fontSize: 15 },
  
  applyButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14, alignItems: "center", marginTop: SPACING.lg },
  applyButtonText: { color: COLORS.text, fontWeight: "700", fontSize: 15 },
});