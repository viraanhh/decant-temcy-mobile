import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Modal, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { updateOrderStatus, updateTracking } from "../../services/adminService";
import AppTextInput from "../../components/AppTextInput";
import useKeyboardHeight from "../../hooks/useKeyboardHeight";
import * as Haptics from "expo-haptics";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount || 0);
}

const STATUS_FLOW = [
  { value: "pending", label: "Menunggu", icon: "time-outline" },
  { value: "paid", label: "Dibayar", icon: "card-outline" },
  { value: "processing", label: "Diproses", icon: "sync-outline" },
  { value: "shipped", label: "Dikirim", icon: "car-outline" },
  { value: "delivered", label: "Selesai", icon: "checkmark-done-circle-outline" },
];

const STATUS_COLORS = {
  pending: "#F59E0B",
  paid: "#3B82F6",
  processing: "#3B82F6",
  shipped: "#8B5CF6",
  delivered: "#10B981",
  cancelled: "#EF4444",
};

export default function AdminOrderDetailScreen({ route, navigation }) {
  const [order, setOrder] = useState(route.params.order);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(order.status);
  
  const isPickup = order.delivery_method === "pickup";
  const statusFlow = STATUS_FLOW.map((s) => (s.value === "shipped" && isPickup ? { ...s, label: "Siap Diambil", icon: "storefront-outline" } : s));

  const keyboardHeight = useKeyboardHeight();
  const modalBottomPadding = Platform.OS === "ios" ? Math.max(SPACING.xl, keyboardHeight) : SPACING.xl;

  const [confirmConfig, setConfirmConfig] = useState({ visible: false, type: "status", title: "", message: "", onConfirm: null });

  const [isTrackingModalVisible, setTrackingModalVisible] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [trackingData, setTrackingData] = useState({
    courier: order.courier || "",
    tracking_number: "",
    status: "Dikirim",
    location: "Semarang",
    description: "Paket diserahkan ke kurir oleh admin",
  });

  const showConfirmModal = (type, title, message, onConfirm) => {
    setConfirmConfig({ visible: true, type, title, message, onConfirm });
  };

  const closeConfirmModal = () => {
    setConfirmConfig((prev) => ({ ...prev, visible: false }));
  };

  const executeStatusUpdate = async (newStatus) => {
    setIsUpdating(true);
    try {
      const result = await updateOrderStatus(order.order_id, newStatus);
      const apiUpdatedOrder = result.order || result;
      
      const fullyMergedOrder = {
        ...order,         
        ...apiUpdatedOrder, 
        status: newStatus,  
        paid_at: (order.status === "pending" && newStatus === "paid" && !apiUpdatedOrder.paid_at) 
               ? new Date().toISOString() 
               : (apiUpdatedOrder.paid_at || order.paid_at)
      };

      setOrder(fullyMergedOrder);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setSelectedStatus(fullyMergedOrder.status);
      navigation.setParams({ order: fullyMergedOrder });
    } catch (err) {
      showConfirmModal("error", "Gagal", err?.response?.data?.message || "Gagal mengubah status pesanan.", null);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmUpdateStatus = () => {
    if (selectedStatus === order.status) return;

    if (selectedStatus === "shipped" && !isPickup) {
      setPendingStatus(selectedStatus);
      setTrackingModalVisible(true);
      return;
    }

    const label = statusFlow.find((s) => s.value === selectedStatus)?.label;
    showConfirmModal(
      "status",
      "Perbarui Status Pesanan",
      `Apakah Anda yakin ingin mengubah status pesanan ini menjadi "${label}"? Customer akan menerima pemberitahuan otomatis.`,
      () => executeStatusUpdate(selectedStatus)
    );
  };

  const handleSaveTracking = async () => {
    if (!trackingData.courier.trim() || !trackingData.tracking_number.trim()) {
      showConfirmModal("error", "Data Tidak Lengkap", "Kurir dan Nomor Resi wajib diisi sebelum menyimpan.", null);
      return;
    }

    setIsUpdating(true);
    try {
      await updateTracking({
        order_id: order.order_id,
        courier: trackingData.courier,
        tracking_number: trackingData.tracking_number,
        status: trackingData.status,
        description: trackingData.description,
        location: trackingData.location,
      });

      await executeStatusUpdate(pendingStatus);

      setTrackingModalVisible(false);
      setPendingStatus(null);
      setTrackingData((prev) => ({ ...prev, tracking_number: "" }));
    } catch (err) {
      showConfirmModal("error", "Gagal Menyimpan", err?.response?.data?.message || "Gagal menyimpan detail resi.", null);
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    showConfirmModal(
      "cancel",
      "Batalkan Pesanan",
      `Yakin ingin membatalkan pesanan ${order.order_code}? Stok produk akan dikembalikan otomatis, customer menerima notifikasi pembatalan.`,
      () => executeStatusUpdate("cancelled")
    );
  };

  const currentIndex = statusFlow.findIndex((s) => s.value === order.status);
  const itemsList = order.items || order.order_items || [];
  const totalItems = itemsList.reduce((acc, curr) => acc + (curr.quantity || 1), 0);

  const customerName = order.user?.full_name || order.user?.name || "Pelanggan";
  const customerEmail = order.user?.email || "-";
  const currentStatusColor = STATUS_COLORS[order.status] || COLORS.primary;

  return (
    <View style={styles.container}> 
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 50, gap: SPACING.md }}>
        
        {/* KARTU HEADER UTAMA */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="receipt-outline" size={20} color={COLORS.primary} />
              <Text style={styles.orderCode}>{order.order_code}</Text>
            </View>
            <View style={[styles.currentStatusBadge, { backgroundColor: `${currentStatusColor}18` }]}>
              <View style={[styles.statusDot, { backgroundColor: currentStatusColor }]} />
              <Text style={[styles.currentStatusText, { color: currentStatusColor }]}>
                {order.status === "cancelled" ? "Dibatalkan" : (statusFlow.find(s => s.value === order.status)?.label || order.status)}
              </Text>
            </View>
          </View>

          <Text style={styles.total}>{formatRupiah(order.total_price)}</Text>
          
          {order.paid_at && (
            <View style={styles.paidInfoBox}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.paidInfoText}>
                Dibayar via {order.payment_method || "Midtrans"} · {new Date(order.paid_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
              </Text>
            </View>
          )}
        </View>

        {/* KARTU PELANGGAN */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informasi Pelanggan</Text>
          <View style={styles.customerRow}>
            <View style={styles.avatarBox}>
              <Ionicons name="person" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.customerEmail}>{customerEmail}</Text>
            </View>
          </View>
        </View>

        {/* KARTU PENERIMAAN / PENGIRIMAN */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Metode Penerimaan</Text>
          <View style={styles.receiveBadgeRow}>
            <Ionicons
              name={isPickup ? "storefront" : "cube"}
              size={16}
              color={isPickup ? "#10B981" : COLORS.primary}
            />
            <Text style={[styles.receiveBadge, { color: isPickup ? "#10B981" : COLORS.primary }]}>
              {isPickup ? "AMBIL DI TOKO" : "DIKIRIM KE ALAMAT"}
            </Text>
          </View>

          <View style={styles.receiveDetailBox}>
            <Text style={styles.receiveName}>
              {order.shipping_name || customerName} {order.shipping_phone ? `· ${order.shipping_phone}` : ""}
            </Text>
            <Text style={styles.receiveAddress}>
              {order.shipping_address}{!isPickup && order.shipping_city ? `, ${order.shipping_city}` : ""}
            </Text>

            {!isPickup && !!order.courier && (
              <View style={styles.metaRow}>
                <Ionicons name="car-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.receiveMeta}>Kurir: <Text style={{ fontWeight: "700", color: COLORS.text }}>{String(order.courier).toUpperCase()} {order.courier_service || ""}</Text></Text>
              </View>
            )}

            {!isPickup && !!order.tracking_number && (
              <View style={styles.metaRow}>
                <Ionicons name="barcode-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.receiveMeta}>No. Resi: <Text style={{ fontWeight: "700", color: COLORS.primary }}>{order.tracking_number}</Text></Text>
              </View>
            )}

            {!!order.shipping_notes && (
              <View style={styles.notesBox}>
                <Ionicons name="chatbox-outline" size={13} color={COLORS.textMuted} style={{ marginTop: 2 }} />
                <Text style={styles.notesText}><Text style={{ fontWeight: "700" }}>Catatan:</Text> {order.shipping_notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* KARTU PRODUK */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm }}>
            <Text style={styles.sectionTitle}>Daftar Produk</Text>
            <View style={styles.itemBadgeCount}>
              <Text style={styles.itemBadgeCountText}>{totalItems} Item</Text>
            </View>
          </View>

          <View style={{ gap: 8 }}>
            {itemsList.map((item, i) => (
              <View key={item.order_item_id ?? item.id ?? i} style={styles.itemRow}>
                <View style={styles.itemIconBox}>
                  <Ionicons name="cube-outline" size={16} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.product_name || item.product?.product_name || "Produk"}
                  </Text>
                  <Text style={styles.itemVariant}>{item.size_ml}ml · Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>{formatRupiah(item.price * item.quantity)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* KARTU UBAH STATUS */}
        {order.status !== "cancelled" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Perbarui Status Pesanan</Text>
            <View style={styles.statusStepList}>
              {statusFlow.map((s, i) => {
                const isSelected = s.value === selectedStatus;
                const isCompletedStep = (currentIndex >= 0 && i < currentIndex) || order.status === "delivered";
                const isCurrentStep = s.value === order.status && (!isCompletedStep || order.status === "delivered");

                return (
                  <Pressable
                    key={s.value}
                    style={[
                      styles.statusStepButton,
                      isCurrentStep && order.status !== "delivered" && styles.statusStepButtonCurrent,
                      isSelected && order.status !== "delivered" && styles.statusStepButtonSelected,
                      isCompletedStep && (!isSelected || order.status === "delivered") && styles.statusStepButtonPast,
                    ]}
                    onPress={() => setSelectedStatus(s.value)}
                    disabled={isUpdating}
                  >
                    <View style={styles.statusStepIconContainer}>
                      {isCompletedStep && (!isSelected || order.status === "delivered") ? (
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      ) : isSelected ? (
                        <Ionicons name="radio-button-on" size={20} color={COLORS.primary} />
                      ) : (
                        <Ionicons name="radio-button-off" size={20} color={COLORS.border} />
                      )}
                    </View>
                    <Text style={[
                      styles.statusStepText,
                      isCurrentStep && order.status !== "delivered" && styles.statusStepTextCurrent,
                      isSelected && order.status !== "delivered" && styles.statusStepTextSelected,
                      isCompletedStep && (!isSelected || order.status === "delivered") && styles.statusStepTextPast
                    ]}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {selectedStatus !== order.status && (
              <Pressable
                style={({ pressed }) => [styles.updateStatusButton, pressed && { opacity: 0.8 }]}
                onPress={handleConfirmUpdateStatus}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color={COLORS.surface} size="small" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color={COLORS.surface} />
                    <Text style={styles.updateStatusButtonText}>Simpan & Perbarui Status</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}

        {isUpdating && <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.md }} />}

        {/* TOMBOL BATALKAN PESANAN */}
        {order.status !== "cancelled" && order.status !== "delivered" && (
          <Pressable style={({ pressed }) => [styles.cancelButton, pressed && { backgroundColor: "rgba(239, 68, 68, 0.08)" }]} onPress={handleCancel} disabled={isUpdating}>
            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
            <Text style={styles.cancelButtonText}>Batalkan Pesanan Ini</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* MODAL KONFIRMASI */}
      <Modal visible={confirmConfig.visible} animationType="fade" transparent>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.confirmModalContent}>
            <View style={[styles.confirmIconContainer, confirmConfig.type === "cancel" && styles.confirmDangerIconBg, confirmConfig.type === "error" && styles.confirmWarningIconBg]}>
              <Ionicons
                name={confirmConfig.type === "cancel" ? "trash-outline" : confirmConfig.type === "error" ? "warning-outline" : "help-outline"}
                size={32}
                color={confirmConfig.type === "cancel" ? "#EF4444" : confirmConfig.type === "error" ? "#F59E0B" : COLORS.primary}
              />
            </View>
            <Text style={styles.confirmTitle}>{confirmConfig.title}</Text>
            <Text style={styles.confirmMessage}>{confirmConfig.message}</Text>

            <View style={styles.modalActions}>
              {confirmConfig.onConfirm && (
                <Pressable style={[styles.modalButton, styles.modalCancel]} onPress={closeConfirmModal}>
                  <Text style={styles.modalCancelText}>Kembali</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.modalButton, confirmConfig.type === "cancel" ? styles.confirmDangerButton : styles.modalSubmit]}
                onPress={() => {
                  closeConfirmModal();
                  if (confirmConfig.onConfirm) confirmConfig.onConfirm();
                }}
              >
                <Text style={styles.modalSubmitText}>{confirmConfig.onConfirm ? "Ya, Lanjutkan" : "Tutup"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL INPUT TRACKING / RESI */}
      <Modal visible={isTrackingModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlayTracking}>
          <View style={[styles.trackingModalContent, { paddingBottom: modalBottomPadding }]}>
            <View style={styles.modalIndicator} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md }}>
              <Text style={styles.modalTitle}>Detail Pengiriman Kurir</Text>
              <Pressable onPress={() => setTrackingModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </Pressable>
            </View>

            <ScrollView bounces={false} contentContainerStyle={{ gap: SPACING.md }}>
              <View>
                <Text style={styles.modalLabel}>Kurir / Ekspedisi <Text style={{ color: "#EF4444" }}>*</Text></Text>
                <AppTextInput
                  style={styles.modalInput}
                  value={trackingData.courier}
                  onChangeText={(v) => setTrackingData({ ...trackingData, courier: v })}
                  placeholder="Misal: JNE, J&T, SiCepat"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View>
                <Text style={styles.modalLabel}>Nomor Resi <Text style={{ color: "#EF4444" }}>*</Text></Text>
                <AppTextInput
                  style={styles.modalInput}
                  value={trackingData.tracking_number}
                  onChangeText={(v) => setTrackingData({ ...trackingData, tracking_number: v })}
                  placeholder="Masukkan nomor resi pengiriman..."
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                />
              </View>

              <View>
                <Text style={styles.modalLabel}>Lokasi Asal / Saat Ini</Text>
                <AppTextInput
                  style={styles.modalInput}
                  value={trackingData.location}
                  onChangeText={(v) => setTrackingData({ ...trackingData, location: v })}
                  placeholder="Contoh: Semarang"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { marginTop: SPACING.lg }]}>
              <Pressable
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => {
                  setTrackingModalVisible(false);
                  setPendingStatus(null);
                }}
                disabled={isUpdating}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalSubmit]} onPress={handleSaveTracking} disabled={isUpdating}>
                {isUpdating ? <ActivityIndicator color={COLORS.surface} size="small" /> : <Text style={styles.modalSubmitText}>Kirim Paket</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  card: { 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    padding: SPACING.md, 
    ...CARD_SHADOW 
  },
  
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderCode: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  
  currentStatusBadge: { 
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: RADIUS.full 
  },
  statusDot: { width: 6, height: 6, borderRadius: RADIUS.full },
  currentStatusText: { fontSize: 11, fontWeight: "750", textTransform: "uppercase" },
  
  total: { color: COLORS.text, fontSize: 22, fontWeight: "800", marginTop: 10 },
  
  paidInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)"
  },
  paidInfoText: { color: "#10B981", fontSize: 12, fontWeight: "600" }, 
  
  sectionTitle: { color: COLORS.text, fontSize: 13, fontWeight: "750", textTransform: "uppercase", marginBottom: SPACING.sm, letterSpacing: 0.5 },

  customerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`
  },
  customerInfo: { flex: 1 },
  customerName: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  customerEmail: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  receiveBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  receiveBadge: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  
  receiveDetailBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4
  },
  receiveName: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  receiveAddress: { color: COLORS.textMuted, fontSize: 12, marginTop: 2, lineHeight: 18 },
  
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  receiveMeta: { color: COLORS.textMuted, fontSize: 12 },

  notesBox: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    backgroundColor: COLORS.surface,
    padding: SPACING.xs,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  notesText: { color: COLORS.textMuted, fontSize: 11, flex: 1, lineHeight: 16 },

  itemBadgeCount: {
    backgroundColor: `${COLORS.primary}12`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  itemBadgeCountText: { color: COLORS.primary, fontSize: 11, fontWeight: "700" },

  itemRow: { 
    flexDirection: "row", 
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    gap: 10,
    marginBottom: 4
  },
  itemIconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.xs,
    backgroundColor: `${COLORS.primary}10`,
    alignItems: "center",
    justifyContent: "center"
  },
  itemName: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  itemVariant: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  itemPrice: { color: COLORS.text, fontSize: 13, fontWeight: "800" },

  statusStepList: { flexDirection: "column", gap: 8 },
  statusStepButton: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingVertical: 12, paddingHorizontal: 14 },
  statusStepIconContainer: { marginRight: 12, alignItems: "center", justifyContent: "center" },

  statusStepButtonCurrent: { borderColor: COLORS.primary },
  statusStepButtonSelected: { backgroundColor: `${COLORS.primary}15`, borderColor: COLORS.primary },
  statusStepButtonPast: { borderColor: "rgba(16, 185, 129, 0.3)", backgroundColor: "rgba(16, 185, 129, 0.05)" },

  statusStepText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  statusStepTextCurrent: { color: COLORS.text, fontWeight: "750" },
  statusStepTextSelected: { color: COLORS.primary, fontWeight: "750" },
  statusStepTextPast: { color: "#10B981", fontWeight: "700" },

  updateStatusButton: { 
    backgroundColor: COLORS.primary, 
    borderRadius: RADIUS.sm, 
    padding: SPACING.md, 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: SPACING.md,
    ...CARD_SHADOW
  },
  updateStatusButtonText: { color: COLORS.surface, fontWeight: "800", fontSize: 14 },
  
  cancelButton: { 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1, 
    borderColor: "#EF4444", 
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    borderRadius: RADIUS.md, 
    padding: SPACING.md, 
  },
  cancelButtonText: { color: "#EF4444", fontWeight: "750", fontSize: 14 },

  modalOverlayCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: SPACING.xl },
  confirmModalContent: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.xl, width: "100%", alignItems: "center", borderWidth: 1, borderColor: COLORS.border, ...CARD_SHADOW },
  confirmIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${COLORS.primary}15`, alignItems: "center", justifyContent: "center", marginBottom: SPACING.md },
  confirmDangerIconBg: { backgroundColor: "rgba(239, 68, 68, 0.12)" },
  confirmWarningIconBg: { backgroundColor: "rgba(245, 158, 11, 0.12)" },
  confirmTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  confirmMessage: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", marginBottom: SPACING.xl, lineHeight: 20 },
  confirmDangerButton: { backgroundColor: "#EF4444" },

  modalOverlayTracking: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  trackingModalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: SPACING.lg, maxHeight: "90%", borderWidth: 1, borderColor: COLORS.border },
  modalIndicator: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: "center", marginBottom: SPACING.md },
  modalTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  modalLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6, fontWeight: "600" },
  modalInput: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 12, color: COLORS.text, fontSize: 14 },

  modalActions: { flexDirection: "row", gap: SPACING.sm, width: "100%" },
  modalButton: { flex: 1, padding: 14, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center" },
  modalCancel: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  modalSubmit: { backgroundColor: COLORS.primary },
  modalCancelText: { color: COLORS.text, fontWeight: "700" },
  modalSubmitText: { color: COLORS.surface, fontWeight: "800" },
});