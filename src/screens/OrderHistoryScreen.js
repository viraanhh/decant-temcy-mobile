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

const TIME_FILTERS = [
  { value: "all", label: "Semua Waktu" },
  { value: "today", label: "Hari Ini" },
  { value: "week", label: "7 Hari Terakhir" },
  { value: "month", label: "Bulan Ini" },
  { value: "custom", label: "Rentang Tanggal Custom" },
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
    const matchesStatus = filterStatus ? FILTER_GROUPS[filterStatus]?.includes(o.status) : true;
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
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Riwayat Pesanan</Text>
        <Pressable style={styles.timeFilterButton} onPress={() => setTimeModalVisible(true)}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.text} />
          <Text style={styles.timeFilterButtonText} numberOfLines={1}>{activeTimeLabel}</Text>
          <Ionicons name="chevron-down" size={12} color={COLORS.textMuted} />
        </Pressable>
      </View>
      
      {FilterRow}

      {displayedOrders.length === 0 ? (
        <ScrollView contentContainerStyle={{ flex: 1 }} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
          <View style={styles.centerContainer}>
            <Text style={{ color: COLORS.textMuted }}>Tidak ada pesanan dengan filter ini.</Text>
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
            const dateStr = item.createdAt || item.created_at;
            const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString("id-ID") : "";

            return (
              <Pressable style={styles.orderCard} onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                    {!!formattedDate && <Text style={styles.orderDate}>{formattedDate}</Text>}
                  </View>
                  <Text style={[styles.statusBadge, { color: statusColor, borderColor: statusColor }]}>{status.text}</Text>
                </View>
                <Text style={styles.orderItems}>{item.items.length} produk · {item.items.map((i) => i.productName).join(", ")}</Text>
                <Text style={styles.orderTotal}>{formatRupiah(item.total)}</Text>
              </Pressable>
            );
          }}
        />
      )}

      <Modal visible={isTimeModalVisible} animationType="fade" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setTimeModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Filter Berdasarkan Waktu</Text>
            {TIME_FILTERS.map((opt) => (
              <Pressable key={opt.value} style={styles.timeOptionRow} onPress={() => setTimeFilter(opt.value)}>
                <Text style={[styles.timeOptionText, timeFilter === opt.value && styles.timeOptionTextActive]}>
                  {opt.label}
                </Text>
                {timeFilter === opt.value && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
              </Pressable>
            ))}

            {timeFilter === "custom" && (
              <View style={{ marginTop: SPACING.sm, gap: 8 }}>
                <Text style={styles.modalLabel}>Dari Tanggal (DD/MM/YYYY)</Text>
                <AppTextInput 
                  style={styles.dateInput} 
                  value={customStart} 
                  onChangeText={(text) => setCustomStart(formatDateInput(text))} 
                  placeholder="01/09/2026" 
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <Text style={styles.modalLabel}>Sampai Tanggal (DD/MM/YYYY)</Text>
                <AppTextInput 
                  style={styles.dateInput} 
                  value={customEnd} 
                  onChangeText={(text) => setCustomEnd(formatDateInput(text))} 
                  placeholder="30/09/2026" 
                  keyboardType="number-pad"
                  maxLength={10}
                />
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
  centerContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: COLORS.text, fontSize: 15, marginTop: 10 },
  headerContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 8 },
  header: { color: COLORS.text, fontSize: 20, fontWeight: "600" },
  timeFilterButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingVertical: 6, paddingHorizontal: 10, maxWidth: 150 },
  timeFilterButtonText: { color: COLORS.text, fontSize: 10, fontWeight: "600" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  filterChip: { flex: 1, alignItems: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingVertical: 8 },
  filterChipText: { color: COLORS.textMuted, fontSize: 11 },
  orderCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderNumber: { color: COLORS.text, fontWeight: "600", fontSize: 13 },
  orderDate: { color: COLORS.textFaint, fontSize: 10, marginTop: 2 },
  statusBadge: { fontSize: 10, borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  orderItems: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
  orderTotal: { color: COLORS.primary, fontSize: 14, fontWeight: "700", marginTop: 8 },
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