import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getDashboardStats } from "../../services/adminService";
import { getAllProducts } from "../../services/productService";
import { SafeAreaView } from "react-native-safe-area-context";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount || 0);
}

const STAT_CARDS = [
  { key: "totalUsers", label: "Pelanggan", icon: "people-outline" },
  { key: "totalProducts", label: "Produk Aktif", icon: "cube-outline" },
  { key: "totalOrders", label: "Total Pesanan", icon: "receipt-outline" },
  { key: "totalRevenue", label: "Pendapatan", icon: "cash-outline", isCurrency: true },
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
  pending: "#E8A33D",
  paid: "#4A90D9",
  processing: "#4A90D9",
  shipped: "#8B5CF6",
  delivered: "#3DBA6C",
  cancelled: COLORS.primary,
};

const LOW_STOCK_THRESHOLD = 20;

export default function AdminDashboardScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allProducts, setAllProducts] = useState([]);
  const [isAlertVisible, setIsAlertVisible] = useState(true);
  
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    }, [])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    setIsAlertVisible(true); 
    try {
      const [statsData, productsData] = await Promise.all([
        getDashboardStats(),
        getAllProducts()
      ]);
      
      setData(statsData);
      setAllProducts(productsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const lowStockProducts = allProducts.filter((p) => {
    const currentStock = p.stock_ml !== undefined ? p.stock_ml : p.stock; 
    if (currentStock === undefined || currentStock === null) return false;
    return currentStock <= LOW_STOCK_THRESHOLD;
  });

  const urgentRestock = lowStockProducts.filter((p) => p.sold_count > 10).sort((a, b) => b.sold_count - a.sold_count).slice(0, 3);
  const slowMovingProducts = allProducts.filter((p) => p.sold_count === 0);

  const handleAlertClick = () => {
    if (lowStockProducts.length === 1) {
      navigation.navigate("Produk", { 
        screen: "AdminProductForm", 
        params: { product: lowStockProducts[0] } 
      });
    } else {
      navigation.navigate("Produk");
    }
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
        {lowStockProducts.length > 0 && isAlertVisible && (
          <Pressable 
            style={({ pressed }) => [styles.alertBanner, pressed && { opacity: 0.8 }]} 
            onPress={handleAlertClick}
          >
            <Ionicons name="warning" size={20} color={COLORS.warning} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{lowStockProducts.length} produk stok menipis</Text>
              <Text style={styles.alertText} numberOfLines={2}>
                {lowStockProducts.map((p) => p.product_name).join(", ")}
              </Text>
            </View>
            <Pressable 
              onPress={() => setIsAlertVisible(false)} 
              style={styles.closeAlertBtn}
              hitSlop={15}
            >
              <Ionicons name="close" size={20} color={COLORS.warning} />
            </Pressable>
          </Pressable>
        )}

        <Text style={styles.title}>Dashboard Admin</Text>

        <View style={styles.statGrid}>
          {STAT_CARDS.map((card) => (
            <View key={card.key} style={styles.statCard}>
              <Ionicons name={card.icon} size={20} color={COLORS.primary} />
              <Text style={styles.statValue}>
                {card.isCurrency ? formatRupiah(data.stats[card.key]) : data.stats[card.key]}
              </Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Status Pesanan</Text>
        <View style={styles.statusRow}>
          {data.ordersByStatus.map((s) => {
            const label = STATUS_LABELS[s.status] || s.status;
            const color = STATUS_COLORS[s.status] || COLORS.textMuted;
            return (
              <View key={s.status} style={[styles.statusChip, { borderColor: `${color}40` }]}>
                <Text style={[styles.statusChipCount, { color }]}>{s.count}</Text>
                <Text style={styles.statusChipLabel}>{label}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Pesanan Terbaru</Text>
        {Array.from(new Map(data.recentOrders.map((o) => [o.order_id, o])).values()).map((order, index) => {
          const statusLabel = STATUS_LABELS[order.status] || order.status;
          const statusColor = STATUS_COLORS[order.status] || COLORS.textMuted;

          return (
            <View key={`order-${order.order_id}-${index}`} style={styles.orderCard}>
              <View style={styles.orderRow}>
                <Text style={styles.orderCode}>{order.order_code}</Text>
                <Text style={styles.orderTotal}>{formatRupiah(order.total_price)}</Text>
              </View>
              <Text style={styles.orderCustomer}>{order.user?.full_name} · {order.user?.email}</Text>
              <View style={styles.orderBottomRow}>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {(urgentRestock.length > 0 || slowMovingProducts.length > 0) && (
          <>
            <Text style={styles.sectionTitle}>💡 Rekomendasi Bisnis</Text>

            {urgentRestock.map((p) => (
              <View key={`restock-${p.id}`} style={styles.recommendationCard}>
                <Ionicons name="trending-up" size={18} color={COLORS.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recommendationTitle}>Segera Restock: {p.product_name}</Text>
                  <Text style={styles.recommendationText}>
                    Terjual {p.sold_count}x tapi stok tersisa {p.stock_ml}ml — produk laris, berisiko kehabisan.
                  </Text>
                </View>
              </View>
            ))}

            {slowMovingProducts.length > 0 && (
              <View style={styles.recommendationCard}>
                <Ionicons name="trending-down" size={18} color={COLORS.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recommendationTitle}>{slowMovingProducts.length} Produk Belum Pernah Terjual</Text>
                  <Text style={styles.recommendationText} numberOfLines={3}>
                    {slowMovingProducts.map((p) => p.product_name).join(", ")} — pertimbangkan promo/diskon atau evaluasi harga.
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
  
  alertBanner: { 
    flexDirection: "row", 
    alignItems: "flex-start",
    gap: 12, 
    backgroundColor: `${COLORS.warning}15`, 
    borderWidth: 1, 
    borderColor: COLORS.warning, 
    borderRadius: RADIUS.md, 
    padding: SPACING.md, 
    marginBottom: SPACING.lg 
  },
  alertTitle: { color: COLORS.warning, fontWeight: "700", fontSize: 13 },
  alertText: { color: COLORS.textMuted, fontSize: 11, marginTop: 4, lineHeight: 16 },
  closeAlertBtn: { padding: 2, marginLeft: 4 },
  
  title: { color: COLORS.text, fontSize: 22, fontWeight: "700", marginBottom: SPACING.lg },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  statCard: { width: "47%", backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, ...CARD_SHADOW },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginTop: 8 },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 12, textTransform: "uppercase", marginTop: SPACING.xl, marginBottom: SPACING.md },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: { backgroundColor: COLORS.surface, borderWidth: 1, borderRadius: RADIUS.md, paddingVertical: 8, paddingHorizontal: 12, alignItems: "center", minWidth: 75 },
  statusChipCount: { fontWeight: "700", fontSize: 14 },
  statusChipLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2, textTransform: "uppercase" },
  orderCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm, ...CARD_SHADOW },
  orderRow: { flexDirection: "row", justifyContent: "space-between" },
  orderCode: { color: COLORS.text, fontWeight: "600", fontSize: 13 },
  orderTotal: { color: COLORS.primary, fontWeight: "700", fontSize: 13 },
  orderCustomer: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  orderBottomRow: { flexDirection: "row", marginTop: 6 },
  statusBadge: { borderRadius: RADIUS.full, height: 20, paddingHorizontal: 8, justifyContent: "center", alignItems: "center" },
  statusBadgeText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  
  recommendationCard: { flexDirection: "row", gap: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm, ...CARD_SHADOW },
  recommendationTitle: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  recommendationText: { color: COLORS.textMuted, fontSize: 11, marginTop: 3, lineHeight: 15 },
});