import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS } from "../constants/colors";
import { getOrderById, ORDER_STATUS_LABEL } from "../services/orderService";
import { getTracking } from "../services/trackingService";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

const DELIVERY_LABEL = {
  pickup: "Ambil di Toko",
  delivery: "Dikirim ke Alamat",
};

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getOrderById(orderId),
      getTracking(orderId).catch(() => null), // tracking opsional, jangan sampai gagalkan seluruh halaman
    ])
      .then(([orderData, trackingData]) => {
        setOrder(orderData);
        setTracking(trackingData);
      })
      .catch(() => setError("Gagal memuat detail pesanan"));
  }, [orderId]);

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: COLORS.textMuted }}>{error}</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const status = ORDER_STATUS_LABEL[order.status] || { text: order.status, color: "textMuted" };
  const statusColor = COLORS[status.color] || COLORS.textMuted;

  const shippingLabel =
    order.deliveryMethod === "pickup"
      ? "Ambil di Toko"
      : order.courier === "cod"
      ? "Diantar Langsung (COD)"
      : `${(order.courier || "").toUpperCase()} ${order.courierService || ""}`.trim();

  return (
    <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <Text style={[styles.statusBadge, { color: statusColor, borderColor: statusColor }]}>
            {status.text}
          </Text>
        </View>
        <Text style={styles.textMuted}>{new Date(order.createdAt).toLocaleString("id-ID")}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Penerimaan</Text>
        <Text style={styles.text}>{DELIVERY_LABEL[order.deliveryMethod] || order.deliveryMethod}</Text>
        {order.deliveryMethod === "delivery" && (
          <>
            <Text style={styles.textMuted}>{order.shippingName} · {order.shippingPhone}</Text>
            <Text style={styles.textMuted}>{order.shippingAddress}, {order.shippingCity}</Text>
          </>
        )}
        {!!order.shippingNotes && <Text style={styles.textMuted}>Catatan: {order.shippingNotes}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pengiriman</Text>
        <Text style={styles.text}>{shippingLabel}</Text>
        <Text style={styles.textMuted}>Ongkir: {order.shippingCost > 0 ? formatRupiah(order.shippingCost) : "Gratis"}</Text>
      </View>

      {tracking && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lacak Pengiriman</Text>
          <Text style={styles.text}>{tracking.status}</Text>
          {!!tracking.tracking_number && <Text style={styles.textMuted}>No. Resi: {tracking.tracking_number}</Text>}
          {!!tracking.description && <Text style={styles.textMuted}>{tracking.description}</Text>}
          {!!tracking.location && <Text style={styles.textMuted}>Lokasi terakhir: {tracking.location}</Text>}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Produk</Text>
        {order.items.map((item, index) => (
          <View key={`${item.productId}-${item.sizeMl}-${index}`} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.text}>
                {item.productName} · {item.sizeMl}ml ×{item.quantity}
              </Text>
              {order.status !== "pending" && (
                <Pressable
                  onPress={() => navigation.navigate("WriteReview", {
                    productId: item.productId,
                    productName: item.productName,
                  })}
                >
                  <Text style={styles.reviewLink}>✍️ Tulis Ulasan</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.text}>{formatRupiah(item.price * item.quantity)}</Text>
          </View>
        ))}

        <View style={[styles.itemRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 }]}>
          <Text style={styles.textMuted}>Ongkir</Text>
          <Text style={styles.text}>{formatRupiah(order.shippingCost)}</Text>
        </View>
        {order.discountAmount > 0 && (
          <View style={styles.itemRow}>
            <Text style={styles.textMuted}>Diskon {order.voucherCode ? `(${order.voucherCode})` : ""}</Text>
            <Text style={[styles.text, { color: COLORS.success }]}>-{formatRupiah(order.discountAmount)}</Text>
          </View>
        )}
        <View style={[styles.itemRow, { marginTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 }]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatRupiah(order.total)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" },
  section: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: COLORS.textMuted, fontSize: 12, textTransform: "uppercase", marginBottom: 6 },
  orderNumber: { color: COLORS.text, fontSize: 16, fontWeight: "700" },
  statusBadge: { fontSize: 10, borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  text: { color: COLORS.text, fontSize: 13 },
  textMuted: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  totalLabel: { color: COLORS.text, fontWeight: "700" },
  totalValue: { color: COLORS.primary, fontWeight: "700" },
  reviewLink: { color: COLORS.primary, fontSize: 11, marginTop: 4 },
});