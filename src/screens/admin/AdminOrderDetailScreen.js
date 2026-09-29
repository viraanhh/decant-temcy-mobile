import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Modal, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { updateOrderStatus, updateTracking } from "../../services/adminService";
import AppTextInput from "../../components/AppTextInput";
import useKeyboardHeight from "../../hooks/useKeyboardHeight";
import * as Haptics from "expo-haptics"; // <-- IMPORT HAPTICS

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount || 0);
}

const STATUS_FLOW = [
  { value: "pending", label: "Menunggu" },
  { value: "paid", label: "Dibayar" },
  { value: "processing", label: "Diproses" },
  { value: "shipped", label: "Dikirim" },
  { value: "delivered", label: "Selesai" },
];

export default function AdminOrderDetailScreen({ route, navigation }) {
  const [order, setOrder] = useState(route.params.order);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(order.status);

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // <-- TAMBAHKAN GETARAN SUKSES

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

    if (selectedStatus === "shipped") {
      setPendingStatus(selectedStatus);
      setTrackingModalVisible(true);
      return;
    }

    const label = STATUS_FLOW.find((s) => s.value === selectedStatus)?.label;
    showConfirmModal(
      "status",
      "Perbarui Status",
      `Apakah Anda yakin ingin mengubah pesanan ini menjadi "${label}"? Customer akan menerima notifikasi otomatis.`,
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
      `Yakin ingin membatalkan pesanan ${order.order_code}? Customer akan menerima notifikasi pembatalan dan dana (jika ada) harus dikembalikan.`,
      () => executeStatusUpdate("cancelled")
    );
  };

  const currentIndex = STATUS_FLOW.findIndex((s) => s.value === order.status);
  const itemsList = order.items || order.order_items || [];
  const totalItems = itemsList.reduce((acc, curr) => acc + (curr.quantity || 1), 0);

  const customerName = order.user?.full_name || "Customer";
  const customerEmail = order.user?.email || "-";

  return (
    <View style={styles.container}> 
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Text style={styles.orderCode}>{order.order_code}</Text>
            <View style={styles.currentStatusBadge}>
              <Text style={styles.currentStatusText}>{order.status}</Text>
            </View>
          </View>
          <Text style={styles.total}>{formatRupiah(order.total_price)}</Text>
          
          {order.paid_at && (
            <Text style={styles.paidInfo}>
              Dibayar via {order.payment_method || "Midtrans"} · {new Date(order.paid_at).toLocaleString("id-ID")}
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Pelanggan</Text>
        <View style={styles.section}>
          <View style={styles.customerRow}>
            <Ionicons name="person-circle-outline" size={32} color={COLORS.textMuted} />
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.customerEmail}>{customerEmail}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Produk ({totalItems})</Text>
        <View style={styles.section}>
          {itemsList.map((item, i) => (
            <View key={item.order_item_id ?? item.id ?? i} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.product_name || item.product?.product_name || "Produk"} · {item.size_ml}ml ×{item.quantity}
              </Text>
              <Text style={styles.itemPrice}>{formatRupiah(item.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Ubah Status Pesanan</Text>
        <View style={styles.section}>
          <View style={styles.statusStepList}>
            {STATUS_FLOW.map((s, i) => {
              const isSelected = s.value === selectedStatus;
              const isCompletedStep = (currentIndex >= 0 && i < currentIndex) || order.status === "delivered";
              const isCurrentStep = s.value === order.status && (!isCompletedStep || order.status === "delivered");

              let IconComponent;
              if (isCompletedStep && (!isSelected || order.status === "delivered")) {
                 IconComponent = <Ionicons name="checkmark-circle" size={20} color="#3DBA6C" />;
              } else if (isSelected) {
                IconComponent = <Ionicons name="radio-button-on" size={20} color={COLORS.text} />;
              } else {
                IconComponent = <Ionicons name="radio-button-off" size={20} color={COLORS.border} />;
              }

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
                  disabled={isUpdating || order.status === "cancelled"}
                >
                  <View style={styles.statusStepIconContainer}>
                    {IconComponent}
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

          {selectedStatus !== order.status && order.status !== "cancelled" && (
            <Pressable
              style={styles.updateStatusButton}
              onPress={handleConfirmUpdateStatus}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color={COLORS.text} size="small" />
              ) : (
                <Text style={styles.updateStatusButtonText}>Simpan & Perbarui Status</Text>
              )}
            </Pressable>
          )}
        </View>

        {isUpdating && <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.md }} />}

        {order.status !== "cancelled" && order.status !== "delivered" && (
          <Pressable style={styles.cancelButton} onPress={handleCancel} disabled={isUpdating}>
            <Text style={styles.cancelButtonText}>Batalkan Pesanan</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={confirmConfig.visible} animationType="fade" transparent>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.confirmModalContent}>
            <View style={[styles.confirmIconContainer, confirmConfig.type === "cancel" && styles.confirmDangerIconBg, confirmConfig.type === "error" && styles.confirmWarningIconBg]}>
              <Ionicons
                name={confirmConfig.type === "cancel" ? "trash-outline" : confirmConfig.type === "error" ? "warning-outline" : "help-outline"}
                size={32}
                color={confirmConfig.type === "cancel" ? "#FF4B4B" : confirmConfig.type === "error" ? "#E8A33D" : COLORS.primary}
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

      <Modal visible={isTrackingModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlayTracking}>
          <View style={[styles.trackingModalContent, { paddingBottom: modalBottomPadding }]}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalTitle}>Masukkan Detail Pengiriman</Text>

            <ScrollView bounces={false} contentContainerStyle={{ gap: SPACING.md }}>
              <View>
                <Text style={styles.modalLabel}>Kurir / Ekspedisi</Text>
                <AppTextInput
                  style={styles.modalInput}
                  value={trackingData.courier}
                  onChangeText={(v) => setTrackingData({ ...trackingData, courier: v })}
                  placeholder="Misal: JNE, J&T, GoSend"
                />
              </View>

              <View>
                <Text style={styles.modalLabel}>Nomor Resi</Text>
                <AppTextInput
                  style={styles.modalInput}
                  value={trackingData.tracking_number}
                  onChangeText={(v) => setTrackingData({ ...trackingData, tracking_number: v })}
                  placeholder="Masukkan nomor resi..."
                  autoCapitalize="characters"
                />
              </View>

              <View>
                <Text style={styles.modalLabel}>Lokasi Asal / Saat Ini</Text>
                <AppTextInput
                  style={styles.modalInput}
                  value={trackingData.location}
                  onChangeText={(v) => setTrackingData({ ...trackingData, location: v })}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
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
                {isUpdating ? <ActivityIndicator color={COLORS.text} size="small" /> : <Text style={styles.modalSubmitText}>Kirim Paket</Text>}
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
  section: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.md, ...CARD_SHADOW },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderCode: { color: COLORS.text, fontSize: 16, fontWeight: "700" },
  currentStatusBadge: { backgroundColor: `${COLORS.primary}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  currentStatusText: { color: COLORS.primary, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  total: { color: COLORS.text, fontSize: 20, fontWeight: "700", marginTop: 8 },
  
  paidInfo: { color: "#3DBA6C", fontSize: 11, marginTop: 6 }, 
  
  sectionTitle: { color: COLORS.textMuted, fontSize: 12, textTransform: "uppercase", marginBottom: SPACING.sm },

  customerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  customerInfo: { flex: 1 },
  customerName: { color: COLORS.text, fontSize: 14, fontWeight: "600" },
  customerEmail: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, gap: 8 },
  itemName: { color: COLORS.text, fontSize: 13, flex: 1 },
  itemPrice: { color: COLORS.textMuted, fontSize: 12 },

  statusStepList: { flexDirection: "column", gap: 8 },
  statusStepButton: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: 14 },
  statusStepIconContainer: { marginRight: 12, alignItems: "center", justifyContent: "center" },

  statusStepButtonCurrent: { borderColor: COLORS.primary },
  statusStepButtonSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusStepButtonPast: { borderColor: "#3DBA6C55", backgroundColor: "#3DBA6C10" },

  statusStepText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "500" },
  statusStepTextCurrent: { color: COLORS.text, fontWeight: "700" },
  statusStepTextSelected: { color: COLORS.text, fontWeight: "700" },
  statusStepTextPast: { color: "#3DBA6C", fontWeight: "600" },

  updateStatusButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: 12, alignItems: "center", marginTop: SPACING.md },
  updateStatusButtonText: { color: COLORS.text, fontWeight: "600", fontSize: 13 },
  cancelButton: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14, alignItems: "center", marginTop: SPACING.md },
  cancelButtonText: { color: COLORS.primary, fontWeight: "600" },

  modalOverlayCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: SPACING.xl },
  confirmModalContent: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.xl, width: "100%", alignItems: "center", ...CARD_SHADOW },
  confirmIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${COLORS.primary}15`, alignItems: "center", justifyContent: "center", marginBottom: SPACING.md },
  confirmDangerIconBg: { backgroundColor: "#FF4B4B15" },
  confirmWarningIconBg: { backgroundColor: "#E8A33D15" },
  confirmTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  confirmMessage: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", marginBottom: SPACING.xl, lineHeight: 20 },
  confirmDangerButton: { backgroundColor: "#FF4B4B" },

  modalOverlayTracking: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  trackingModalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: SPACING.lg, maxHeight: "90%" },
  modalIndicator: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: "center", marginBottom: SPACING.md },
  modalTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginBottom: SPACING.sm },
  modalLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6, fontWeight: "500" },
  modalInput: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 12, color: COLORS.text },

  modalActions: { flexDirection: "row", gap: SPACING.sm, width: "100%" },
  modalButton: { flex: 1, padding: 14, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center" },
  modalCancel: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  modalSubmit: { backgroundColor: COLORS.primary },
  modalCancelText: { color: COLORS.text, fontWeight: "600" },
  modalSubmitText: { color: COLORS.text, fontWeight: "600" },
});