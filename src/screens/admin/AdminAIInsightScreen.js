import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getDashboardStats, getSalesReport, getAdminInventory } from "../../services/adminService";

const SIZES = [1, 2, 3, 5];
const STOCK_MIN_TOTAL = 10;
const LOW_MARGIN_PCT = 20;
const DAY = 24 * 60 * 60 * 1000;

const num = (v) => Number(v) || 0;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num(n));
const stockTotal = (p) => SIZES.reduce((sum, s) => sum + num(p[`stock_${s}ml`]), 0);
const nameList = (list, max = 3) =>
  list.slice(0, max).map((p) => p.product_name || p.name).join(", ") +
  (list.length > max ? ` dan ${list.length - max} lainnya` : "");

const SECTION_META = {
  summary: { title: "RINGKASAN PERFORMA", color: "#3B82F6", icon: "trending-up-outline", badgeBg: "rgba(59, 130, 246, 0.1)" },
  insight: { title: "INSIGHT UTAMA", color: "#8B5CF6", icon: "sparkles-outline", badgeBg: "rgba(139, 92, 246, 0.1)" },
  action: { title: "REKOMENDASI AKSI", color: "#10B981", icon: "bulb-outline", badgeBg: "rgba(16, 185, 129, 0.1)" },
  warning: { title: "PERINGATAN", color: "#F59E0B", icon: "warning-outline", badgeBg: "rgba(245, 158, 11, 0.1)" },
};

function buildInsights({ dashboard, report, products }) {
  const stats = dashboard?.stats || {};
  const byStatus = dashboard?.ordersByStatus || [];
  const countOf = (st) => num(byStatus.find((x) => x.status === st)?.count);

  const totalOrdersAll = num(stats.totalOrders);
  const cancelled = countOf("cancelled");
  const pending = countOf("pending");
  const cancelRate = pct(cancelled, totalOrdersAll);

  const orders = report?.orders || [];
  let revenue = 0;
  let hpp = 0;
  const productMap = {};
  orders.forEach((order) => {
    revenue += num(order.total_price);
    (order.items || []).forEach((it) => {
      const qty = num(it.quantity);
      const cost = num(it.product?.cost_price_per_ml) * num(it.size_ml) * qty;
      hpp += cost;
      const key = it.product_name;
      if (!productMap[key]) productMap[key] = { name: key, qty: 0, revenue: 0, hpp: 0 };
      productMap[key].qty += qty;
      productMap[key].revenue += num(it.price) * qty;
      productMap[key].hpp += cost;
    });
  });

  const delivered = orders.length;
  const laba = revenue - hpp;
  const margin = revenue > 0 ? Math.round((laba / revenue) * 1000) / 10 : 0;
  const aov = delivered > 0 ? Math.floor(revenue / delivered) : 0;

  const ranked = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);
  const productRevenueTotal = ranked.reduce((s, p) => s + p.revenue, 0);
  const topProduct = ranked[0];
  const topShare = topProduct ? pct(topProduct.revenue, productRevenueTotal) : 0;

  const now = Date.now();
  let cur = 0;
  let prev = 0;
  orders.forEach((o) => {
    const age = now - new Date(o.createdAt || o.created_at).getTime();
    if (age <= 30 * DAY) cur += num(o.total_price);
    else if (age <= 60 * DAY) prev += num(o.total_price);
  });
  const growth = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

  const stocked = (products || [])
    .filter((p) => p.is_active !== false)
    .map((p) => ({ ...p, _stock: stockTotal(p), _sold: num(p.sold_count) }));
  const habis = stocked.filter((p) => p._stock <= 0);
  const menipis = stocked.filter((p) => p._stock > 0 && p._stock <= STOCK_MIN_TOTAL);
  const aman = stocked.filter((p) => p._stock > STOCK_MIN_TOTAL);
  const criticalSellers = stocked
    .filter((p) => p._stock <= STOCK_MIN_TOTAL && p._sold > 0)
    .sort((a, b) => b._sold - a._sold);
  const slowMoving = aman.filter((p) => p._sold === 0);
  const noCost = stocked.filter((p) => p._sold > 0 && !num(p.cost_price_per_ml));
  const lowMargin = ranked
    .filter((p) => p.hpp > 0 && p.revenue > 0 && ((p.revenue - p.hpp) / p.revenue) * 100 < LOW_MARGIN_PCT)
    .slice(0, 2);

  const summary = [];
  if (delivered > 0) {
    summary.push(
      `Dari total ${delivered} pesanan selesai, pendapatan bersih mencapai ${rupiah(revenue)} dengan estimasi laba kotor ${rupiah(laba)} (margin ${margin}%). Rata-rata nilai per transaksi adalah ${rupiah(aov)}.`
    );
  } else {
    summary.push("Belum ada pesanan selesai. Ringkasan keuangan akan muncul secara otomatis setelah ada transaksi berstatus selesai.");
  }
  summary.push(`Terdapat ${num(stats.totalUsers)} pelanggan terdaftar dan ${num(stats.totalProducts)} produk aktif dalam sistem.`);

  const insight = [];
  if (topProduct) {
    insight.push(
      `${topProduct.name} menjadi produk unggulan berdasarkan revenue, menyumbang ${topShare}% dari total penjualan produk (${topProduct.qty} unit terjual).`
    );
  }
  if (growth !== null) {
    insight.push(
      `Pendapatan 30 hari terakhir sebesar ${rupiah(cur)}, ${growth >= 0 ? "meningkat" : "menurun"} ${Math.abs(growth)}% dibandingkan 30 hari sebelumnya.`
    );
  } else if (cur > 0) {
    insight.push(`Pendapatan 30 hari terakhir tercatat ${rupiah(cur)}. Belum ada periode sebelumnya sebagai pembanding tren.`);
  }
  if (totalOrdersAll > 0) {
    insight.push(
      `Tingkat pembatalan pesanan berada di angka ${cancelRate}% (${cancelled} dari ${totalOrdersAll} total pesanan)${cancelRate > 20 ? ", tergolong tinggi dan perlu perhatian" : ", dalam batas aman dan wajar"}.`
    );
  }
  if (stocked.length > 0) {
    insight.push(
      `Distribusi inventori: ${aman.length} produk aman, ${menipis.length} menipis, dan ${habis.length} habis dari total ${stocked.length} produk.`
    );
  }
  if (insight.length === 0) insight.push("Belum cukup data historis untuk menghasilkan insight mendalam.");

  const action = [];
  criticalSellers.slice(0, 3).forEach((p) => {
    action.push(`Segera lakukan restock "${p.product_name}": sudah terjual ${p._sold}x, sisa stok tinggal ${p._stock} vial.`);
  });
  if (pending > 0) {
    action.push(`Terdapat ${pending} pesanan tertunda menunggu pembayaran. Kirim pengingat kepada pelanggan untuk mengamankan transaksi.`);
  }
  if (growth !== null && growth < 0) {
    action.push(`Pendapatan turun ${Math.abs(growth)}% dari periode lalu. Pertimbangkan peluncuran voucher diskon atau bundling produk.`);
  }
  lowMargin.forEach((p) => {
    const m = Math.round(((p.revenue - p.hpp) / p.revenue) * 100);
    action.push(`Margin profit "${p.name}" tipis (${m}%). Disarankan meninjau ulang harga jual atau HPP.`);
  });
  if (noCost.length > 0) {
    action.push(`${noCost.length} produk laris belum memiliki data HPP (${nameList(noCost)}), mengakibatkan perhitungan laba belum akurat.`);
  }
  if (slowMoving.length > 0) {
    action.push(
      `${slowMoving.length} produk berstatus aman namun belum pernah terjual (${nameList(slowMoving)}). Evaluasi daya Tarik atau berikan promo khusus.`
    );
  }
  if (action.length === 0) {
    action.push("Belum ada tindakan darurat. Pertahankan ketersediaan stok produk terlaris dan pantau pesanan masuk secara berkala.");
  }

  const warning = [];
  if (habis.length > 0) {
    warning.push(`${habis.length} produk mengalami habis stok dan tidak dapat dibeli pelanggan (${nameList(habis)}).`);
  }
  if (totalOrdersAll >= 5 && cancelRate > 20) {
    warning.push(`Tingkat pembatalan mencapai ${cancelRate}%. Periksa kendala pada metode pembayaran atau respons konfirmasi.`);
  }
  if (delivered > 0 && laba < 0) {
    warning.push("Peringatan Finansial: Laba kotor bernilai negatif, HPP modal lebih besar daripada pendapatan pada periode ini.");
  }
  if (warning.length === 0) warning.push("Semua indikator operasional utama berada dalam kondisi stabil dan sehat.");

  return {
    cards: [
      { label: "Total Pendapatan", value: rupiah(revenue), color: "#10B981", icon: "cash-outline" },
      { label: "Laba Kotor", value: rupiah(laba), color: laba >= 0 ? "#3B82F6" : "#EF4444", icon: "trending-up-outline" },
      { label: "Margin Profit", value: `${margin}%`, color: "#8B5CF6", icon: "pie-chart-outline" },
      { label: "Pesanan Selesai", value: `${delivered} Order`, color: "#F59E0B", icon: "receipt-outline" },
    ],
    sections: [
      { ...SECTION_META.summary, points: summary },
      { ...SECTION_META.insight, points: insight },
      { ...SECTION_META.action, points: action },
      { ...SECTION_META.warning, points: warning },
    ],
  };
}

export default function AdminAIInsightScreen() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [dashboard, report, inventory] = await Promise.all([
        getDashboardStats(),
        getSalesReport({}),
        getAdminInventory({ limit: 500 }),
      ]);
      setResult(buildInsights({ dashboard, report, products: inventory.products }));
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err.message || "Gagal memuat data untuk analisis");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading && !result) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Menganalisis data performa bisnis…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
    >
      {/* HEADER */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.tagBadge}>
            <Ionicons name="flash" size={12} color={COLORS.primary} />
            <Text style={styles.tag}>ANALITIK & RANGKUMAN</Text>
          </View>
          <Text style={styles.title}>Insight Bisnis</Text>
          {!!updatedAt && (
            <Text style={styles.subtitle}>
              Diperbarui {updatedAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} · {updatedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
        </View>
        <Pressable 
          style={({ pressed }) => [styles.refreshButton, pressed && { opacity: 0.8 }]} 
          onPress={onRefresh} 
          disabled={refreshing} 
          hitSlop={8}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />
          )}
        </Pressable>
      </View>

      {/* ERROR BOX */}
      {!!error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={onRefresh}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </Pressable>
        </View>
      )}

      {result && (
        <>
          {/* STATS KARTU UTAMA (2x2 Grid) */}
          <View style={styles.statsGrid}>
            {result.cards.map((c) => (
              <View key={c.label} style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statIcon, { backgroundColor: `${c.color}15` }]}>
                    <Ionicons name={c.icon} size={16} color={c.color} />
                  </View>
                  <Text style={styles.statLabel}>{c.label}</Text>
                </View>
                <Text style={[styles.statValue, { color: c.color }]} numberOfLines={1} adjustsFontSizeToFit>
                  {c.value}
                </Text>
              </View>
            ))}
          </View>

          {/* KARTU SECTION BERDASARKAN KATEGORI */}
          {result.sections.map((section) => (
            <View key={section.title} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: section.badgeBg }]}>
                  <Ionicons name={section.icon} size={16} color={section.color} />
                </View>
                <Text style={[styles.sectionTitle, { color: section.color }]}>{section.title}</Text>
              </View>

              <View style={styles.pointList}>
                {section.points.map((point, i) => (
                  <View key={i} style={styles.pointRow}>
                    <View style={[styles.bullet, { backgroundColor: section.color }]} />
                    <Text style={styles.pointText}>{point}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          <Text style={styles.hint}>
            Laporan dihitung secara instan berdasarkan data penjualan, HPP, dan inventori sistem secara real-time.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background, gap: 12 },
  loadingText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  tagBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  tag: { color: COLORS.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: "800" },
  subtitle: { color: COLORS.textMuted, fontSize: 11, marginTop: 2, fontWeight: "500" },
  
  refreshButton: { 
    width: 40, 
    height: 40, 
    borderRadius: RADIUS.full, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    backgroundColor: COLORS.surface, 
    alignItems: "center", 
    justifyContent: "center",
    ...CARD_SHADOW
  },
  
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.3)" },
  errorText: { color: "#EF4444", fontSize: 12, fontWeight: "600", flex: 1 },
  retryText: { color: COLORS.primary, fontWeight: "750", fontSize: 12 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: SPACING.sm },
  statCard: { 
    width: "48%", 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    padding: SPACING.md, 
    justifyContent: "space-between",
    minHeight: 90,
    ...CARD_SHADOW 
  },
  statCardTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  statIcon: { width: 28, height: 28, borderRadius: RADIUS.xs, alignItems: "center", justifyContent: "center" },
  statLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", flex: 1 },
  statValue: { fontSize: 16, fontWeight: "800" },

  sectionCard: { 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    padding: SPACING.md, 
    ...CARD_SHADOW 
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 12, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sectionIcon: { width: 30, height: 30, borderRadius: RADIUS.xs, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  
  pointList: { gap: 10 },
  pointRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 2 },
  bullet: { width: 6, height: 6, borderRadius: RADIUS.full, marginTop: 6 },
  pointText: { flex: 1, color: COLORS.textMuted, fontSize: 13, lineHeight: 20, fontWeight: "500" },
  
  hint: { color: COLORS.textMuted, fontSize: 11, textAlign: "center", lineHeight: 16, marginTop: SPACING.sm },
});