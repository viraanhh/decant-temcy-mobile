import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getDashboardStats, getAdminInventory } from "../../services/adminService";
import { getAllProducts } from "../../services/productService";
import { SafeAreaView } from "react-native-safe-area-context";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount || 0);
}

const STAT_CONFIGS = [
  { key: "totalUsers", label: "Pelanggan", icon: "people", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" },
  { key: "totalProducts", label: "Produk Aktif", icon: "cube", color: "#10B981", bg: "rgba(16, 185, 129, 0.1)" },
  { key: "totalOrders", label: "Total Pesanan", icon: "receipt", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" },
  { key: "totalRevenue", label: "Pendapatan", icon: "wallet", color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.1)", isCurrency: true },
];

const STATUS_LABELS = {
  pending: "Menunggu",
  paid: "Dibayar",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_COLORS = {
  pending: "#F59E0B",
  paid: "#3B82F6",
  processing: "#3B82F6",
  shipped: "#8B5CF6",
  delivered: "#10B981",
  cancelled: "#EF4444",
};

const SIZES = [1, 2, 3, 5];
const totalStock = (p) => SIZES.reduce((sum, s) => sum + (Number(p[`stock_${s}ml`]) || 0), 0);
const EMPTY_STOCK = { products: [], summary: { habis: 0, menipis: 0, aman: 0 } };

export default function AdminDashboardScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allProducts, setAllProducts] = useState([]);
  const [stock, setStock] = useState(EMPTY_STOCK);
  const [isAlertVisible, setIsAlertVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStock = () =>
    getAdminInventory({ stock: "restock", limit: 500 })
      .then((res) => setStock({ products: res.products || [], summary: res.summary || EMPTY_STOCK.summary }))
      .catch((err) => console.error("Gagal mengambil data stok:", err));

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      setIsAlertVisible(true);

      getDashboardStats()
        .then(setData)
        .finally(() => setIsLoading(false));

      getAllProducts()
        .then(setAllProducts)
        .catch((err) => {
          console.error("Gagal mengambil data produk:", err);
        });

      loadStock();
    }, [])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    setIsAlertVisible(true);
    try {
      const [statsData, productsData] = await Promise.all([
        getDashboardStats(),
        getAllProducts(),
        loadStock(),
      ]);
      setData(statsData);
      setAllProducts(productsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const restockProducts = stock.products;
  const { habis, menipis } = stock.summary;
  const urgentRestock = restockProducts.filter((p) => p.sold_count > 10).sort((a, b) => b.sold_count - a.sold_count).slice(0, 3);
  const slowMovingProducts = allProducts.filter((p) => p.sold_count === 0);

  const handleAlertClick = () => {
    navigation.navigate("Lainnya", { screen: "AdminInventory", initial: false });
  };

  if (isLoading || !data) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView 
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      >
        {/* HEADER / WELCOME SECTION */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.welcomeSubtitle}>Panel Kontrol Admin</Text>
            <Text style={styles.welcomeTitle}>Decant Temcy</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </View>

        {/* ALERT BANNER */}
        {habis + menipis > 0 && isAlertVisible && (
          <Pressable
            style={({ pressed }) => [styles.alertBanner, pressed && { opacity: 0.8 }]}
            onPress={handleAlertClick}
          >
            <View style={styles.alertIconBox}>
              <Ionicons name="warning" size={22} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>
                {[habis > 0 && `${habis} produk habis`, menipis > 0 && `${menipis} produk menipis`].filter(Boolean).join(" · ")}
              </Text>
              <Text style={styles.alertText} numberOfLines={2}>
                {restockProducts.slice(0, 4).map((p) => p.product_name).join(", ")}
                {restockProducts.length > 4 ? ` dan ${restockProducts.length - 4} lainnya` : ""} — Ketuk untuk kelola inventori.
              </Text>
            </View>
            <Pressable onPress={() => setIsAlertVisible(false)} style={styles.closeAlertBtn} hitSlop={15}>
              <Ionicons name="close" size={18} color={COLORS.textMuted} />
            </Pressable>
          </Pressable>
        )}

        {/* STATS GRID */}
        <Text style={styles.sectionHeaderTitle}>Ringkasan Performa</Text>
        <View style={styles.statGrid}>
          {STAT_CONFIGS.map((card) => (
            <View key={card.key} style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: card.bg }]}>
                <Ionicons name={card.icon} size={20} color={card.color} />
              </View>
              <Text style={styles.statValue}>
                {card.isCurrency ? formatRupiah(data.stats[card.key]) : data.stats[card.key]}
              </Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* STATUS PESANAN */}
        <Text style={styles.sectionHeaderTitle}>Status Pesanan Aktif</Text>
        <View style={styles.statusRow}>
          {data.ordersByStatus.map((s) => {
            const label = STATUS_LABELS[s.status] || s.status;
            const color = STATUS_COLORS[s.status] || COLORS.textMuted;
            return (
              <View key={s.status} style={[styles.statusChip, { borderColor: `${color}40`, backgroundColor: `${color}08` }]}>
                <Text style={[styles.statusChipCount, { color }]}>{s.count}</Text>
                <Text style={styles.statusChipLabel}>{label}</Text>
              </View>
            );
          })}
        </View>

        {/* PESANAN TERBARU */}
        <Text style={styles.sectionHeaderTitle}>Pesanan Terbaru</Text>
        {Array.from(new Map(data.recentOrders.map((o) => [o.order_id, o])).values()).slice(0, 5).map((order, index) => {
          const statusLabel = STATUS_LABELS[order.status] || order.status;
          const statusColor = STATUS_COLORS[order.status] || COLORS.textMuted;

          return (
            <View key={`order-${order.order_id}-${index}`} style={styles.orderCard}>
              <View style={styles.orderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="receipt-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.orderCode}>{order.order_code}</Text>
                </View>
                <Text style={styles.orderTotal}>{formatRupiah(order.total_price)}</Text>
              </View>
              <Text style={styles.orderCustomer}>
                <Ionicons name="person-outline" size={12} color={COLORS.textMuted} /> {order.user?.full_name || "Pelanggan"} · {order.user?.email}
              </Text>
              <View style={styles.orderBottomRow}>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* REKOMENDASI BISNIS */}
        {(urgentRestock.length > 0 || slowMovingProducts.length > 0) && (
          <>
            <Text style={styles.sectionHeaderTitle}>Rekomendasi Bisnis & Stok</Text>

            {urgentRestock.map((p) => (
              <View key={`restock-${p.product_id}`} style={[styles.recommendationCard, { borderLeftColor: "#10B981" }]}>
                <View style={[styles.recIconBox, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                  <Ionicons name="trending-up" size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recommendationTitle}>Segera Restock: {p.product_name}</Text>
                  <Text style={styles.recommendationText}>
                    Terjual <Text style={{ fontWeight: "700", color: COLORS.text }}>{p.sold_count}x</Text> namun stok tersisa <Text style={{ fontWeight: "700", color: "#EF4444" }}>{totalStock(p)} vial</Text> — produk sangat laris, berisiko kehabisan.
                  </Text>
                </View>
              </View>
            ))}

            {slowMovingProducts.length > 0 && (
              <View style={[styles.recommendationCard, { borderLeftColor: "#F59E0B" }]}>
                <View style={[styles.recIconBox, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
                  <Ionicons name="alert-circle" size={18} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recommendationTitle}>{slowMovingProducts.length} Produk Belum Pernah Terjual</Text>
                  <Text style={styles.recommendationText} numberOfLines={3}>
                    {slowMovingProducts.map((p) => p.product_name).join(", ")} — Pertimbangkan untuk membuat promo bundling, diskon khusus, atau evaluasi harga.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" },
  
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  welcomeSubtitle: { color: COLORS.textMuted, fontSize: 13, fontWeight: "500" },
  welcomeTitle: { color: COLORS.text, fontSize: 22, fontWeight: "800", marginTop: 2 },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  adminBadgeText: { color: COLORS.primary, fontSize: 11, fontWeight: "700" },

  alertBanner: { 
    flexDirection: "row", 
    alignItems: "center",
    gap: 12, 
    backgroundColor: "rgba(245, 158, 11, 0.08)", 
    borderWidth: 1, 
    borderColor: "rgba(245, 158, 11, 0.3)", 
    borderRadius: RADIUS.md, 
    padding: SPACING.md, 
    marginBottom: SPACING.lg 
  },
  alertIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: { color: "#D97706", fontWeight: "700", fontSize: 13 },
  alertText: { color: COLORS.textMuted, fontSize: 11, marginTop: 2, lineHeight: 15 },
  closeAlertBtn: { padding: 4 },
  
  sectionHeaderTitle: { 
    color: COLORS.text, 
    fontSize: 13, 
    fontWeight: "700",
    textTransform: "uppercase", 
    letterSpacing: 0.5,
    marginTop: SPACING.lg, 
    marginBottom: SPACING.sm 
  },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  statCard: { 
    width: "48%", 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    padding: SPACING.md, 
    ...CARD_SHADOW 
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: "800", marginTop: 2 },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2, fontWeight: "500" },

  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: { 
    borderWidth: 1, 
    borderRadius: RADIUS.md, 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    alignItems: "center", 
    minWidth: 80,
    flexGrow: 1,
  },
  statusChipCount: { fontWeight: "800", fontSize: 15 },
  statusChipLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2, textTransform: "uppercase", fontWeight: "600" },

  orderCard: { 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    padding: SPACING.md, 
    marginBottom: SPACING.sm, 
    ...CARD_SHADOW 
  },
  orderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderCode: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  orderTotal: { color: COLORS.primary, fontWeight: "800", fontSize: 13 },
  orderCustomer: { color: COLORS.textMuted, fontSize: 11, marginTop: 6, fontWeight: "500" },
  orderBottomRow: { flexDirection: "row", marginTop: 10, alignItems: "center" },
  
  statusBadge: { 
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.full, 
    height: 22, 
    paddingHorizontal: 10, 
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  
  recommendationCard: { 
    flexDirection: "row", 
    alignItems: "center",
    gap: 12, 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderLeftWidth: 4,
    padding: SPACING.md, 
    marginBottom: SPACING.sm, 
    ...CARD_SHADOW 
  },
  recIconBox: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendationTitle: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  recommendationText: { color: COLORS.textMuted, fontSize: 11, marginTop: 3, lineHeight: 15 },
});