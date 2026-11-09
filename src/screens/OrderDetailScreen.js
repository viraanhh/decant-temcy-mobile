import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Linking, Modal, Animated } from "react-native";
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { getOrderById, getOrderStatusLabel, cancelOrder } from "../services/orderService";
import { getTracking } from "../services/trackingService";
import { getCanReview } from "../services/reviewService";

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

  // State untuk Custom Toast Alert
  const [toastVisible, setToastVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Status ulasan per produk
  const [reviewState, setReviewState] = useState({});

  const loadReviewState = useCallback(async (o) => {
    if (!o || o.status !== "delivered") return;
    const ids = [...new Set((o.items || []).map((i) => i.productId))];
    const entries = await Promise.all(
      ids.map((id) => getCanReview(id).then((r) => [id, r]).catch(() => [id, null]))
    );
    setReviewState(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    Promise.all([
      getOrderById(orderId),
      getTracking(orderId).catch(() => null),
    ])
      .then(([orderData, trackingData]) => {
        setOrder(orderData);
        setTracking(trackingData);
      })
      .catch(() => setError("Gagal memuat detail pesanan"));
  }, [orderId]);

  useEffect(() => {
    loadReviewState(order);
    const unsubscribe = navigation.addListener("focus", () => loadReviewState(order));
    return unsubscribe;
  }, [order, navigation, loadReviewState]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      getOrderById(orderId).then(setOrder).catch(() => {});
    });
    return unsubscribe;
  }, [navigation, orderId]);

  const [showCancel, setShowCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Fungsi Custom Toast Alert yang otomatis hilang setelah 2 detik
  const showToast = () => {
    setToastVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setToastVisible(false));
      }, 2000);
    });
  };

  const handleCopyResi = async (resiText) => {
    await Clipboard.setStringAsync(resiText);
    showToast();
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    setCancelError("");
    try {
      await cancelOrder(orderId);
      const fresh = await getOrderById(orderId);
      setOrder(fresh);
      setShowCancel(false);
    } catch (err) {
      setCancelError(err?.message || "Pesanan belum bisa dibatalkan, coba lagi.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Memuat pesanan...</Text>
      </View>
    );
  }

  const status = getOrderStatusLabel(order);
  const statusColor = COLORS[status.color] || COLORS.textMuted;
  const isPickup = order.deliveryMethod === "pickup";

  const shippingLabel = isPickup
    ? "Diambil Sendiri"
    : order.courier === "cod"
    ? "Diantar Langsung (COD)"
    : `${(order.courier || "").toUpperCase()} ${order.courierService || ""}`.trim();

  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={styles.scrollContent}>
        
        {/* 1. KARTU HEADER & STATUS */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.orderLabel}>Nomor Pesanan</Text>
              <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{status.text}</Text>
            </View>
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.dateText}>
              {new Date(order.createdAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
            </Text>
          </View>
        </View>

        {/* 2. KARTU PENERIMAAN / ALAMAT */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name={isPickup ? "storefront" : "location"} size={22} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{DELIVERY_LABEL[order.deliveryMethod] || order.deliveryMethod}</Text>
          </View>

          {isPickup ? (
            <View style={styles.infoBlock}>
              <Text style={styles.textBold16}>{order.pickupStore?.name || "Store pickup"}</Text>
              <Text style={styles.textRegular}>
                {order.pickupStore ? `${order.pickupStore.address}, ${order.pickupStore.city}` : order.shippingAddress}
              </Text>
              
              {!!order.pickupStore?.phone && (
                <View style={styles.iconTextRow}>
                  <Ionicons name="call-outline" size={16} color={COLORS.textMuted} />
                  <Text style={styles.textRegular}>{order.pickupStore.phone}</Text>
                </View>
              )}

              {!!order.pickupStore?.maps_url && (
                <Pressable style={styles.mapsButton} onPress={() => Linking.openURL(order.pickupStore.maps_url).catch(() => {})}>
                  <Ionicons name="map-outline" size={18} color="#fff" />
                  <Text style={styles.mapsButtonText}>Buka di Google Maps</Text>
                </Pressable>
              )}

              <View style={styles.hintBox}>
                <Ionicons name="information-circle" size={20} color={COLORS.primary} />
                <Text style={styles.pickupHint}>
                  {order.status === "shipped"
                    ? "Pesananmu sudah siap diambil. Tunjukkan nomor pesanan ini ke staf toko."
                    : "Hubungi admin toko untuk konfirmasi waktu pengambilan pesananmu."}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.infoBlock}>
              <Text style={styles.textBold16}>{order.shippingName}</Text>
              <Text style={styles.textRegular}>{order.shippingPhone}</Text>
              <Text style={[styles.textRegular, { marginTop: 6, lineHeight: 22 }]}>
                {order.shippingAddress}, {order.shippingCity}
              </Text>
            </View>
          )}

          {!!order.shippingNotes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>Catatan Pembeli:</Text>
              <Text style={styles.textRegular}>{order.shippingNotes}</Text>
            </View>
          )}
        </View>

        {/* 3. KARTU PENGIRIMAN & LACAK RESI */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cube" size={22} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Detail Pengiriman</Text>
          </View>
          
          <View style={styles.rowBetween}>
            <Text style={styles.textMuted}>Kurir</Text>
            <Text style={styles.textBold14}>{shippingLabel}</Text>
          </View>

          {tracking && (
            <View style={styles.trackingBox}>
              <View style={styles.rowBetween}>
                <Text style={styles.textMuted}>Status Kurir</Text>
                <Text style={[styles.textBold14, { color: COLORS.primary }]}>{tracking.status}</Text>
              </View>
              
              {!!tracking.tracking_number && (
                <Pressable 
                  style={styles.rowBetween} 
                  onPress={() => handleCopyResi(tracking.tracking_number)}
                >
                  <Text style={styles.textMuted}>No. Resi (Ketuk untuk salin)</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.textBold14, { color: COLORS.primary }]}>{tracking.tracking_number}</Text>
                    <Ionicons name="copy-outline" size={14} color={COLORS.primary} />
                  </View>
                </Pressable>
              )}
              
              {!!tracking.description && (
                <Text style={styles.trackingDesc}>{tracking.description}</Text>
              )}
              
              {!!tracking.location && (
                <View style={styles.iconTextRow}>
                  <Ionicons name="location-outline" size={16} color={COLORS.textMuted} />
                  <Text style={styles.textMuted}>{tracking.location}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 4. KARTU RINCIAN PRODUK & PEMBAYARAN */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt" size={22} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Rincian Pesanan</Text>
          </View>

          {order.items.map((item, index) => (
            <View key={`${item.productId}-${item.sizeMl}-${index}`} style={styles.productItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.textBold14} numberOfLines={2}>{item.productName}</Text>
                <Text style={styles.productVariant}>{item.sizeMl}ml × {item.quantity}</Text>
                
                {order.status === "delivered" && (
                  reviewState[item.productId]?.has_reviewed ? (
                    <Text style={styles.reviewDone}>✓ Sudah diulas</Text>
                  ) : (
                    <Pressable
                      style={styles.reviewButton}
                      onPress={() => navigation.navigate("WriteReview", {
                        productId: item.productId,
                        productName: item.productName,
                      })}
                    >
                      <Ionicons name="star" size={14} color={COLORS.primary} />
                      <Text style={styles.reviewButtonText}>Tulis Ulasan</Text>
                    </Pressable>
                  )
                )}
              </View>
              <Text style={styles.textBold14}>{formatRupiah(item.price * item.quantity)}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.textRegular}>Total Harga Produk</Text>
            <Text style={styles.textBold14}>{formatRupiah(subtotal)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.textRegular}>Ongkos Kirim</Text>
            <Text style={styles.textBold14}>{order.shippingCost > 0 ? formatRupiah(order.shippingCost) : "Gratis"}</Text>
          </View>
          
          {order.discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.textRegular}>Diskon {order.voucherCode ? `(${order.voucherCode})` : ""}</Text>
              <Text style={[styles.textBold14, { color: COLORS.success }]}>-{formatRupiah(order.discountAmount)}</Text>
            </View>
          )}

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Belanja</Text>
            <Text style={styles.totalValue}>{formatRupiah(order.total)}</Text>
          </View>
        </View>

        {/* 5. TOMBOL AKSI PADA PESANAN PENDING */}
        {order.status === "pending" && (
          <View style={{ gap: 12 }}>
            <Pressable
              style={styles.payButton}
              onPress={() => navigation.navigate("Payment", { orderId, fromOrder: true })}
            >
              <Ionicons name="qr-code-outline" size={18} color={COLORS.text} />
              <Text style={styles.payButtonText}>Lanjutkan Pembayaran</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={() => { setCancelError(""); setShowCancel(true); }}>
              <Text style={styles.cancelButtonText}>Batalkan Pesanan</Text>
            </Pressable>
          </View>
        )}

        <Modal visible={showCancel} transparent animationType="fade" onRequestClose={() => setShowCancel(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIcon}>
                <Ionicons name="close-circle-outline" size={32} color="#ef4444" />
              </View>
              <Text style={styles.modalTitle}>Batalkan pesanan?</Text>
              <Text style={styles.modalText}>
                Pesanan {order.orderNumber} akan dibatalkan dan tidak bisa dikembalikan. Stok produk dikembalikan otomatis.
              </Text>
              {!!cancelError && <Text style={styles.modalError}>{cancelError}</Text>}
              <View style={styles.modalActions}>
                <Pressable style={[styles.modalButton, styles.modalCancel]} onPress={() => setShowCancel(false)} disabled={isCancelling}>
                  <Text style={styles.modalCancelText}>Kembali</Text>
                </Pressable>
                <Pressable style={[styles.modalButton, styles.modalConfirm]} onPress={handleCancel} disabled={isCancelling}>
                  {isCancelling ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Ya, Batalkan</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* CUSTOM TOAST / POPUP ALERT BERHASIL DISALIN */}
      {toastVisible && (
        <Animated.View style={[styles.toastContainer, { opacity: fadeAnim }]}>
          <View style={styles.toastContent}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.toastText}>Nomor resi berhasil disalin!</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { 
    flex: 1, 
    backgroundColor: COLORS.background, 
    alignItems: "center", 
    justifyContent: "center",
    padding: 20
  },
  scrollContent: { 
    padding: 16, 
    gap: 16,
    paddingBottom: 40 
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 16,
    marginTop: 12,
    textAlign: "center"
  },
  loadingText: {
    color: COLORS.primary,
    fontSize: 16,
    marginTop: 12,
    fontWeight: "600"
  },

  card: { 
    backgroundColor: COLORS.surface, 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },

  headerRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "flex-start" 
  },
  orderLabel: { 
    color: COLORS.textMuted, 
    fontSize: 13, 
    marginBottom: 4 
  },
  orderNumber: { 
    color: COLORS.text, 
    fontSize: 18, 
    fontWeight: "800" 
  },
  statusBadge: { 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 6 
  },
  statusBadgeText: { 
    fontSize: 13, 
    fontWeight: "700" 
  },
  dateRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6, 
    marginTop: 12 
  },
  dateText: { 
    color: COLORS.textMuted, 
    fontSize: 14 
  },

  sectionHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8, 
    marginBottom: 16 
  },
  sectionTitle: { 
    color: COLORS.text, 
    fontSize: 16, 
    fontWeight: "700" 
  },

  textRegular: { color: COLORS.text, fontSize: 15 },
  textBold14: { color: COLORS.text, fontSize: 15, fontWeight: "600" },
  textBold16: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  textMuted: { color: COLORS.textMuted, fontSize: 14 },
  
  infoBlock: { gap: 4 },
  iconTextRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },

  mapsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
    gap: 6
  },
  mapsButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  hintBox: { 
    flexDirection: "row", 
    backgroundColor: `${COLORS.primary}15`, 
    padding: 12, 
    borderRadius: 8, 
    marginTop: 14, 
    gap: 8 
  },
  pickupHint: { color: COLORS.primary, fontSize: 13, flex: 1, lineHeight: 20 },

  notesBox: { backgroundColor: COLORS.background, padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: COLORS.border },
  notesTitle: { color: COLORS.text, fontSize: 13, fontWeight: "700", marginBottom: 4 },

  trackingBox: { backgroundColor: COLORS.background, padding: 12, borderRadius: 10, marginTop: 10, gap: 8, borderWidth: 1, borderColor: COLORS.border },
  trackingDesc: { color: COLORS.text, fontSize: 14, fontStyle: "italic", marginTop: 4 },

  productItem: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  productVariant: { color: COLORS.textMuted, fontSize: 14, marginTop: 4 },
  
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 10,
    gap: 4
  },
  reviewButtonText: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },
  reviewDone: { color: COLORS.success, fontSize: 11, marginTop: 4 },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  
  totalBox: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    backgroundColor: `${COLORS.primary}10`,
    padding: 14,
    borderRadius: 10,
    marginTop: 10
  },
  totalLabel: { color: COLORS.text, fontSize: 16, fontWeight: "700" },
  totalValue: { color: COLORS.primary, fontSize: 18, fontWeight: "800" },

  payButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.primary, borderRadius: 10, padding: 14 },
  payButtonText: { color: COLORS.text, fontWeight: "700" },

  cancelButton: { borderWidth: 1, borderColor: "#ef4444", borderRadius: 10, padding: 14, alignItems: "center" },
  cancelButtonText: { color: "#ef4444", fontWeight: "600" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center", elevation: 8 },
  modalIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(239,68,68,0.1)", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  modalText: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: 16, lineHeight: 22 },
  modalError: { color: "#ef4444", fontSize: 12, textAlign: "center", marginBottom: 12 },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalCancel: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  modalCancelText: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  modalConfirm: { backgroundColor: "#ef4444" },
  modalConfirmText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  // STYLING CUSTOM TOAST NOTIFICATION
  toastContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999,
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f2937", // Warna gelap elegan
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    gap: 8,
  },
  toastText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
});