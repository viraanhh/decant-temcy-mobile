import { useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getSalesReport } from "../../services/adminService";
import { buildReport, formatRupiah, exportSalesReportExcel, exportSalesReportPdf } from "../../utils/salesReportExport";
import AppTextInput from "../../components/AppTextInput";

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

const TONES = {
  danger: { color: "#EF4444", icon: "close-circle-outline" },
  warning: { color: "#F59E0B", icon: "alert-circle-outline" },
};

export default function AdminSalesReportScreen() {
  const [allOrders, setAllOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [timeFilter, setTimeFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [isTimeModalVisible, setTimeModalVisible] = useState(false);

  const [exporting, setExporting] = useState(null);
  const [dialog, setDialog] = useState({ visible: false, tone: "warning", title: "", message: "" });

  const loadReport = useCallback(() => {
    setIsLoading(true);
    setError("");
    getSalesReport({})
      .then((data) => {
        const deliveredOrders = (data.orders || []).filter((o) => o.status === "delivered");
        setAllOrders(deliveredOrders);
      })
      .catch(() => setError("Gagal memuat laporan penjualan"))
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

  const report = useMemo(() => buildReport(filteredOrders), [filteredOrders]);
  const { totalRevenue, totalHPP, totalUnits, laba, marginPct, avg, topProducts, totalOrders } = report;

  const chartDataMap = {};
  filteredOrders.forEach((o) => {
    const dateObj = new Date(o.createdAt || o.created_at);
    const key = dateObj.toISOString().split("T")[0];
    chartDataMap[key] = (chartDataMap[key] || 0) + (o.total_price || 0);
  });
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
      ? `${customStart} - ${customEnd}`
      : TIME_FILTERS.find((t) => t.value === timeFilter)?.label || "Waktu";

  const showDialog = (tone, title, message) => setDialog({ visible: true, tone, title, message });

  const handleExport = async (type) => {
    if (filteredOrders.length === 0) {
      showDialog("warning", "Belum Ada Data", "Tidak ada pesanan selesai pada rentang waktu ini untuk diekspor.");
      return;
    }
    setExporting(type);
    try {
      if (type === "excel") await exportSalesReportExcel(report, activeTimeLabel);
      else await exportSalesReportPdf(report, activeTimeLabel);
    } catch (err) {
      showDialog("danger", "Ekspor Belum Berhasil", err?.message || "Terjadi kesalahan saat memproses file. Silakan coba lagi.");
    } finally {
      setExporting(null);
    }
  };

  const tone = TONES[dialog.tone] || TONES.warning;
  const topMax = topProducts[0]?.revenue || 1;

  return (
    <View style={styles.container}>
      {/* HEADER UTAMA */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Laporan Penjualan</Text>
          <Text style={styles.subtitle}>Berdasarkan data pesanan berstatus "Selesai"</Text>
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

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.order_id)}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ gap: SPACING.md }}>
              
              {/* TOMBOL EKSPOR LAPORAN */}
              <View style={styles.exportRow}>
                <Pressable
                  style={({ pressed }) => [styles.exportButton, styles.exportExcel, pressed && { opacity: 0.8 }]}
                  onPress={() => handleExport("excel")}
                  disabled={!!exporting}
                >
                  {exporting === "excel" ? (
                    <ActivityIndicator size="small" color="#10B981" />
                  ) : (
                    <>
                      <Ionicons name="grid-outline" size={18} color="#10B981" />
                      <Text style={[styles.exportText, { color: "#10B981" }]}>Ekspor Excel</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.exportButton, styles.exportPdf, pressed && { opacity: 0.8 }]}
                  onPress={() => handleExport("pdf")}
                  disabled={!!exporting}
                >
                  {exporting === "pdf" ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <>
                      <Ionicons name="document-text-outline" size={18} color="#EF4444" />
                      <Text style={[styles.exportText, { color: "#EF4444" }]}>Ekspor PDF</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* KARTU RINGKASAN STATISTIK KEUANGAN */}
              <View style={styles.summaryGrid}>
                
                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIconBox, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                    <Ionicons name="cash-outline" size={20} color="#10B981" />
                  </View>
                  <Text style={styles.summaryValue}>{formatRupiah(totalRevenue)}</Text>
                  <Text style={styles.summaryLabel}>Total Pendapatan</Text>
                </View>

                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIconBox, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
                    <Ionicons name="pricetags-outline" size={20} color="#F59E0B" />
                  </View>
                  <Text style={styles.summaryValue}>{formatRupiah(totalHPP)}</Text>
                  <Text style={styles.summaryLabel}>Total HPP Modal</Text>
                </View>

                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIconBox, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
                    <Ionicons name="trending-up-outline" size={20} color="#3B82F6" />
                  </View>
                  <Text style={[styles.summaryValue, { color: laba >= 0 ? "#3B82F6" : "#EF4444" }]}>{formatRupiah(laba)}</Text>
                  <Text style={styles.summaryLabel}>Laba Kotor</Text>
                </View>

                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIconBox, { backgroundColor: "rgba(139, 92, 246, 0.1)" }]}>
                    <Ionicons name="pie-chart-outline" size={20} color="#8B5CF6" />
                  </View>
                  <Text style={styles.summaryValue}>{marginPct}%</Text>
                  <Text style={styles.summaryLabel}>Margin Laba</Text>
                </View>

                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIconBox, { backgroundColor: "rgba(6, 182, 212, 0.1)" }]}>
                    <Ionicons name="receipt-outline" size={20} color="#06B6D4" />
                  </View>
                  <Text style={styles.summaryValue}>{totalOrders}</Text>
                  <Text style={styles.summaryLabel}>Pesanan Selesai</Text>
                </View>

                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIconBox, { backgroundColor: `${COLORS.primary}15` }]}>
                    <Ionicons name="cube-outline" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.summaryValue}>{totalUnits}</Text>
                  <Text style={styles.summaryLabel}>Total Unit Terjual</Text>
                </View>

                <View style={[styles.summaryCard, styles.summaryCardWide]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={[styles.summaryIconBox, { backgroundColor: "rgba(234, 163, 61, 0.1)" }]}>
                      <Ionicons name="calculator-outline" size={20} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.summaryValue}>{formatRupiah(avg)}</Text>
                      <Text style={styles.summaryLabel}>Rata-Rata Nilai Transaksi per Pesanan</Text>
                    </View>
                  </View>
                </View>

              </View>

              {/* GRAFIK PENDAPATAN HARIAN */}
              {chartData.length > 0 && (
                <View style={styles.chartContainer}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: SPACING.md }}>
                    <Ionicons name="stats-chart" size={18} color={COLORS.primary} />
                    <Text style={styles.chartTitle}>Grafik Pendapatan Harian</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                    {chartData.map((data, index) => {
                      const barHeight = Math.max((data.value / maxChartValue) * 110, 12);
                      return (
                        <View key={index} style={styles.barCol}>
                          <Text style={styles.barValueText}>{formatRupiah(data.value).replace("Rp", "").trim()}</Text>
                          <View style={[styles.barFill, { height: barHeight }]} />
                          <Text style={styles.barLabel}>{data.label}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* PRODUK TERLARIS */}
              {topProducts.length > 0 && (
                <View style={styles.topProductsContainer}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: SPACING.md }}>
                    <Ionicons name="flame" size={18} color="#F59E0B" />
                    <Text style={styles.chartTitle}>Produk Terlaris & Profitabilitas</Text>
                  </View>
                  
                  {topProducts.map((p, index) => (
                    <View key={p.name} style={styles.topProductItem}>
                      <View style={styles.topProductTop}>
                        <View style={[styles.rankBadge, index < 3 && styles.rankBadgeTop]}>
                          <Text style={[styles.rankText, index < 3 && { color: "#FFFFFF" }]}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.topProductName} numberOfLines={1}>{p.name}</Text>
                          <Text style={styles.topProductBrand}>{p.brand} · <Text style={{ color: COLORS.primary, fontWeight: "750" }}>{p.qty} terjual</Text></Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.topRevenue}>{formatRupiah(p.revenue)}</Text>
                          <Text style={styles.topLaba}>Laba: {formatRupiah(p.revenue - p.hpp)}</Text>
                        </View>
                      </View>
                      <View style={styles.topBarTrack}>
                        <View style={[styles.topBarFill, { width: `${(p.revenue / topMax) * 100}%` }, index >= 3 && { backgroundColor: COLORS.border }]} />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.sectionTitle}>Riwayat Transaksi Selesai</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Tidak Ada Data Laporan</Text>
              <Text style={styles.emptyText}>Belum ada pesanan dengan status "Selesai" pada filter waktu ini.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const itemCount = item.items?.reduce((acc, curr) => acc + (curr.quantity || 1), 0) || 0;
            const disc = Number(item.discount_amount) || 0;
            return (
              <View style={styles.orderCard}>
                <View style={styles.orderRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="receipt-outline" size={15} color={COLORS.primary} />
                    <Text style={styles.orderCode}>{item.order_code}</Text>
                  </View>
                  <Text style={styles.orderTotal}>{formatRupiah(item.total_price)}</Text>
                </View>

                <View style={styles.orderDivider} />

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.orderDate}>
                    {new Date(item.createdAt || item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    {disc > 0 ? ` · Diskon ${formatRupiah(disc)}` : ""}
                  </Text>
                  <View style={styles.itemCountBadge}>
                    <Ionicons name="cube-outline" size={11} color={COLORS.textMuted} />
                    <Text style={styles.orderItems}>{itemCount} Unit</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* MODAL FILTER WAKTU */}
      <Modal visible={isTimeModalVisible} animationType="fade" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setTimeModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Waktu Laporan</Text>
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

      {/* DIALOG / MODAL PESAN */}
      <Modal visible={dialog.visible} transparent animationType="fade" onRequestClose={() => setDialog((d) => ({ ...d, visible: false }))}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View style={[styles.dialogIcon, { backgroundColor: `${tone.color}15` }]}>
              <Ionicons name={tone.icon} size={32} color={tone.color} />
            </View>
            <Text style={styles.dialogTitle}>{dialog.title}</Text>
            <Text style={styles.dialogText}>{dialog.message}</Text>
            <Pressable style={[styles.dialogButton, { backgroundColor: COLORS.primary }]} onPress={() => setDialog((d) => ({ ...d, visible: false }))}>
              <Text style={styles.dialogButtonText}>Mengerti</Text>
            </Pressable>
          </View>
        </View>
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
  
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: "#EF4444", fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: SPACING.sm },

  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40, paddingHorizontal: 20 },
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

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: SPACING.sm },
  summaryCard: { 
    width: "48%", 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    padding: SPACING.md, 
    ...CARD_SHADOW 
  },
  summaryCardWide: { width: "100%" },
  summaryIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  summaryValue: { color: COLORS.text, fontSize: 16, fontWeight: "800", marginTop: 2 },
  summaryLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 4, fontWeight: "500" },

  exportRow: { flexDirection: "row", gap: SPACING.sm },
  exportButton: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 8, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    ...CARD_SHADOW
  },
  exportExcel: { borderColor: "rgba(16, 185, 129, 0.3)" },
  exportPdf: { borderColor: "rgba(239, 68, 68, 0.3)" },
  exportText: { fontSize: 13, fontWeight: "750" },

  chartContainer: { 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    padding: SPACING.md, 
    ...CARD_SHADOW 
  },
  chartTitle: { color: COLORS.text, fontSize: 15, fontWeight: "800" },
  chartScroll: { flexDirection: "row", alignItems: "flex-end", height: 170, gap: 16, paddingBottom: 24, paddingTop: 10 },
  barCol: { alignItems: "center", justifyContent: "flex-end", height: "100%", width: 48 },
  barValueText: { color: COLORS.textMuted, fontSize: 9, marginBottom: 6, fontWeight: "600" },
  barFill: { width: 28, backgroundColor: COLORS.primary, borderTopLeftRadius: 6, borderTopRightRadius: 6, minHeight: 4 },
  barLabel: { position: "absolute", bottom: -4, fontSize: 10, color: COLORS.text, fontWeight: "700" },

  topProductsContainer: { 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    padding: SPACING.md, 
    ...CARD_SHADOW 
  },
  topProductItem: { marginBottom: 14 },
  topProductTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  rankBadge: { width: 24, height: 24, borderRadius: RADIUS.xs, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  rankBadgeTop: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rankText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "800" },
  topProductName: { color: COLORS.text, fontSize: 13, fontWeight: "750" },
  topProductBrand: { color: COLORS.textMuted, fontSize: 10, fontWeight: "600", marginTop: 2, textTransform: "uppercase" },
  topRevenue: { color: "#10B981", fontSize: 12, fontWeight: "800" },
  topLaba: { color: "#3B82F6", fontSize: 10, fontWeight: "700", marginTop: 2 },
  topBarTrack: { height: 4, backgroundColor: COLORS.background, borderRadius: 2, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
  topBarFill: { height: "100%", backgroundColor: COLORS.primary, borderRadius: 2 },

  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: "800", marginTop: SPACING.sm, marginBottom: 2, letterSpacing: 0.5 },
  
  orderCard: { 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    padding: SPACING.md, 
    ...CARD_SHADOW 
  },
  orderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderCode: { color: COLORS.text, fontWeight: "750", fontSize: 13 },
  orderTotal: { color: COLORS.primary, fontWeight: "800", fontSize: 14 },
  orderDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  orderDate: { color: COLORS.textMuted, fontSize: 11, fontWeight: "500" },
  itemCountBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  orderItems: { color: COLORS.textMuted, fontSize: 11, fontWeight: "600" },

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

  dialogOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: SPACING.lg },
  dialogCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.xl, width: "100%", maxWidth: 340, alignItems: "center", borderWidth: 1, borderColor: COLORS.border, ...CARD_SHADOW },
  dialogIcon: { width: 64, height: 64, borderRadius: RADIUS.full, justifyContent: "center", alignItems: "center", marginBottom: SPACING.md },
  dialogTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  dialogText: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", marginBottom: SPACING.xl, lineHeight: 20 },
  dialogButton: { width: "100%", paddingVertical: 14, borderRadius: RADIUS.md, alignItems: "center", ...CARD_SHADOW },
  dialogButtonText: { color: COLORS.surface, fontWeight: "800", fontSize: 14 },
});