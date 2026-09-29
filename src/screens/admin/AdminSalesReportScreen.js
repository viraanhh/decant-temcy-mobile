import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getSalesReport } from "../../services/adminService";
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

const TIME_FILTERS = [
  { value: "all", label: "Semua Waktu" },
  { value: "today", label: "Hari Ini" },
  { value: "week", label: "7 Hari Terakhir" },
  { value: "month", label: "Bulan Ini" },
  { value: "custom", label: "Rentang Tanggal Custom" },
];

export default function AdminSalesReportScreen() {
  const [allOrders, setAllOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [timeFilter, setTimeFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [isTimeModalVisible, setTimeModalVisible] = useState(false);

  const loadReport = useCallback(() => {
    setIsLoading(true);
    setError("");
    getSalesReport({})
      .then((data) => {
        const deliveredOrders = (data.orders || []).filter((o) => o.status === "delivered");
        setAllOrders(deliveredOrders);
      })
      .catch(() => setError("Gagal memuat laporan"))
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(loadReport);

  const filteredOrders = allOrders.filter((order) => {
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

  let totalRevenue = 0;
  let totalUnits = 0;

  filteredOrders.forEach((o) => {
    totalRevenue += o.total_price || 0;
    const itemsArray = o.items || o.order_items || [];
    itemsArray.forEach((item) => {
      totalUnits += item.quantity || 1;
    });
  });

  const totalOrders = filteredOrders.length;
  const avgTransaction = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const chartDataMap = {};
  filteredOrders.forEach((o) => {
    const dateObj = new Date(o.createdAt || o.created_at);
    const key = dateObj.toISOString().split("T")[0];
    chartDataMap[key] = (chartDataMap[key] || 0) + (o.total_price || 0);
  });

  // FIX: Kalkulasi Produk Terlaris
  const productSalesMap = {};
  filteredOrders.forEach((o) => {
    const itemsArray = o.items || o.order_items || [];
    itemsArray.forEach((item) => {
      const name = item.product_name || item.product?.product_name || "Produk";
      productSalesMap[name] = (productSalesMap[name] || 0) + (item.quantity || 1);
    });
  });
  
  // Ambil top 5
  const topProducts = Object.entries(productSalesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const sortedDates = Object.keys(chartDataMap).sort();
  const chartData = sortedDates.map((k) => {
    const d = new Date(k);
    return {
      label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      value: chartDataMap[k],
    };
  });
  const maxChartValue = Math.max(...chartData.map((d) => d.value), 1);

  const activeTimeLabel =
    timeFilter === "custom" && customStart && customEnd
      ? `${customStart} s/d ${customEnd}`
      : TIME_FILTERS.find((t) => t.value === timeFilter)?.label || "Waktu";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Laporan Penjualan</Text>
          <Text style={styles.subtitle}>Dihitung dari pesanan "Selesai"</Text>
        </View>
        <Pressable style={styles.timeFilterButton} onPress={() => setTimeModalVisible(true)}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.text} />
          <Text style={styles.timeFilterButtonText} numberOfLines={1}>
            {activeTimeLabel}
          </Text>
          <Ionicons name="chevron-down" size={12} color={COLORS.textMuted} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.order_id)}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.sm }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.summaryValue}>{formatRupiah(totalRevenue)}</Text>
                  <Text style={styles.summaryLabel}>Total Pendapatan</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Ionicons name="receipt-outline" size={20} color="#4A90D9" />
                  <Text style={styles.summaryValue}>{totalOrders}</Text>
                  <Text style={styles.summaryLabel}>Pesanan Selesai</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Ionicons name="cube-outline" size={20} color="#8B5CF6" />
                  <Text style={styles.summaryValue}>{totalUnits}</Text>
                  <Text style={styles.summaryLabel}>Unit Terjual</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Ionicons name="pie-chart-outline" size={20} color="#E8A33D" />
                  <Text style={styles.summaryValue}>{formatRupiah(avgTransaction)}</Text>
                  <Text style={styles.summaryLabel}>Rata-Rata Transaksi</Text>
                </View>
              </View>

              {chartData.length > 0 && (
                <View style={styles.chartContainer}>
                  <Text style={styles.chartTitle}>Grafik Pendapatan</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                    {chartData.map((data, index) => {
                      const barHeight = (data.value / maxChartValue) * 100;
                      return (
                        <View key={index} style={styles.barCol}>
                          <Text style={styles.barValueText}>{formatRupiah(data.value).replace("Rp", "")}</Text>
                          <View style={[styles.barFill, { height: `${barHeight}%` }]} />
                          <Text style={styles.barLabel}>{data.label}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* FIX: Render Produk Terlaris di sini */}
              {topProducts.length > 0 && (
                <View style={styles.topProductsContainer}>
                  <Text style={styles.chartTitle}>🏆 Produk Terlaris</Text>
                  {topProducts.map(([name, qty], index) => (
                    <View key={name} style={styles.topProductRow}>
                      <Text style={styles.topProductRank}>#{index + 1}</Text>
                      <Text style={styles.topProductName} numberOfLines={1}>{name}</Text>
                      <Text style={styles.topProductQty}>{qty} unit</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.sectionTitle}>Detail Transaksi</Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>Belum ada pesanan selesai pada rentang ini.</Text>}
          renderItem={({ item }) => {
            const itemCount = item.items?.reduce((acc, curr) => acc + (curr.quantity || 1), 0) || 0;
            return (
              <View style={styles.orderCard}>
                <View style={styles.orderRow}>
                  <Text style={styles.orderCode}>{item.order_code}</Text>
                  <Text style={styles.orderTotal}>{formatRupiah(item.total_price)}</Text>
                </View>
                <Text style={styles.orderDate}>
                  {new Date(item.createdAt || item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </Text>
                <Text style={styles.orderItems}>{itemCount} unit produk</Text>
              </View>
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
                <Text style={[styles.timeOptionText, timeFilter === opt.value && styles.timeOptionTextActive]}>{opt.label}</Text>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: SPACING.lg, paddingBottom: SPACING.md },
  title: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
  subtitle: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  timeFilterButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingVertical: 8, paddingHorizontal: 12, maxWidth: 160 },
  timeFilterButtonText: { color: COLORS.text, fontSize: 11, fontWeight: "600" },
  errorText: { color: COLORS.primary, textAlign: "center", marginTop: 40 },
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center", marginTop: 20 },
  
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: SPACING.sm, marginBottom: SPACING.lg },
  summaryCard: { width: "48%", backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, ...CARD_SHADOW },
  summaryValue: { color: COLORS.text, fontSize: 15, fontWeight: "700", marginTop: 6 },
  summaryLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  
  chartContainer: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.lg, ...CARD_SHADOW },
  chartTitle: { color: COLORS.text, fontSize: 14, fontWeight: "700", marginBottom: SPACING.md },
  chartScroll: { flexDirection: "row", alignItems: "flex-end", height: 160, gap: 16, paddingBottom: 20 },
  barCol: { alignItems: "center", justifyContent: "flex-end", height: "100%", width: 44 },
  barValueText: { color: COLORS.textMuted, fontSize: 9, marginBottom: 4 },
  barFill: { width: 28, backgroundColor: `${COLORS.primary}80`, borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 4 },
  barLabel: { position: "absolute", bottom: -20, fontSize: 10, color: COLORS.text, fontWeight: "600" },
  
  // FIX: Styling untuk Produk Terlaris
  topProductsContainer: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.lg, ...CARD_SHADOW },
  topProductRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  topProductRank: { color: COLORS.primary, fontWeight: "700", fontSize: 13, width: 24 },
  topProductName: { flex: 1, color: COLORS.text, fontSize: 13 },
  topProductQty: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },

  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginBottom: SPACING.sm },
  orderCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, ...CARD_SHADOW },
  orderRow: { flexDirection: "row", justifyContent: "space-between" },
  orderCode: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  orderTotal: { color: COLORS.primary, fontWeight: "700", fontSize: 13 },
  orderDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  orderItems: { color: COLORS.textFaint, fontSize: 10, marginTop: 2 },

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