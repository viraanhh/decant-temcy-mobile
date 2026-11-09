import { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert, Linking, Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getAdminStores, toggleAdminStore } from "../../services/adminService";

export default function AdminStoreListScreen({ navigation }) {
  const [stores, setStores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [modalStoreData, setModalStoreData] = useState(null);
  
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(() => {
    setIsLoading(true);
    getAdminStores()
      .then(setStores)
      .catch((err) => {
        setErrorMessage(err.message || "Gagal memuat daftar store. Periksa koneksi internet.");
        setShowErrorModal(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(load);

  const activeCount = stores.filter((s) => s.is_active).length;

  const confirmToggle = (store) => {
    if (store.is_active && activeCount <= 1) {
      setErrorMessage("Toko ini adalah satu-satunya toko yang aktif. Harus ada minimal 1 toko aktif untuk melayani pesanan.");
      setShowErrorModal(true);
      return;
    }
    setModalStoreData(store);
    setShowToggleModal(true);
  };

  const doToggle = async () => {
    if (!modalStoreData) return;
    const storeId = modalStoreData.store_id;
    setShowToggleModal(false);
    setTogglingId(storeId);
    
    try {
      const res = await toggleAdminStore(storeId);
      setStores((prev) => prev.map((s) => (s.store_id === storeId ? res.store : s)));
    } catch (err) {
      setErrorMessage(err.message || "Gagal mengubah status toko. Silakan coba lagi.");
      setShowErrorModal(true);
    } finally {
      setTogglingId(null);
      setModalStoreData(null);
    }
  };

  const openMaps = async (url) => {
    try {
      await Linking.openURL(url);
    } catch {
      setErrorMessage("Tidak dapat membuka link Maps. Periksa kembali link lokasi store ini lewat menu Edit.");
      setShowErrorModal(true);
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => String(item.store_id)}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 100 }}
          ListHeaderComponent={
            <View style={{ marginBottom: SPACING.sm }}>
              <Text style={styles.title}>Cabang Toko</Text>
              <Text style={styles.subtitle}>
                {activeCount} aktif dari {stores.length} · lokasi pilihan pickup customer
              </Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>Belum ada store. Ketuk + untuk menambah.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.card, !item.is_active && { opacity: 0.65 }]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.city}>{item.city}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: item.is_active ? "#3DBA6C18" : "#FF4B4B18" }]}>
                  <Text style={[styles.badgeText, { color: item.is_active ? "#3DBA6C" : "#FF4B4B" }]}>
                    {item.is_active ? "AKTIF" : "NONAKTIF"}
                  </Text>
                </View>
              </View>

              <View style={styles.row}>
                <Ionicons name="location-outline" size={15} color={COLORS.textMuted} />
                <Text style={styles.rowText}>{item.address}</Text>
              </View>
              {!!item.phone && (
                <View style={styles.row}>
                  <Ionicons name="call-outline" size={15} color={COLORS.textMuted} />
                  <Text style={styles.rowText}>{item.phone}</Text>
                </View>
              )}
              {!!item.maps_url && (
                <Pressable style={styles.row} onPress={() => openMaps(item.maps_url)}>
                  <Ionicons name="map-outline" size={15} color="#3b82f6" />
                  <Text style={[styles.rowText, { color: "#3b82f6" }]}>Lihat di Maps</Text>
                </Pressable>
              )}

              <View style={styles.actions}>
                <Pressable style={[styles.actionBtn, styles.editBtn]} onPress={() => navigation.navigate("AdminStoreForm", { store: item })}>
                  <Ionicons name="create-outline" size={14} color="#3b82f6" />
                  <Text style={[styles.actionText, { color: "#3b82f6" }]}>Edit</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, item.is_active ? styles.offBtn : styles.onBtn]}
                  onPress={() => confirmToggle(item)}
                  disabled={togglingId === item.store_id}
                >
                  {togglingId === item.store_id ? (
                    <ActivityIndicator size="small" color={COLORS.text} />
                  ) : (
                    <>
                      <Ionicons name="power-outline" size={14} color={item.is_active ? "#FF4B4B" : "#3DBA6C"} />
                      <Text style={[styles.actionText, { color: item.is_active ? "#FF4B4B" : "#3DBA6C" }]}>
                        {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => navigation.navigate("AdminStoreForm")}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      <Modal visible={showToggleModal} transparent animationType="fade" onRequestClose={() => setShowToggleModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconContainer, { backgroundColor: modalStoreData?.is_active ? "rgba(239, 68, 68, 0.1)" : "rgba(61, 186, 108, 0.1)" }]}>
              <Ionicons name="power-outline" size={32} color={modalStoreData?.is_active ? "#ef4444" : "#3DBA6C"} />
            </View>
            <Text style={styles.modalTitle}>{modalStoreData?.is_active ? "Nonaktifkan Toko?" : "Aktifkan Toko?"}</Text>
            <Text style={styles.modalText}>
              {modalStoreData?.is_active 
                ? `Apakah Anda yakin ingin menonaktifkan "${modalStoreData?.name}"? Toko yang dinonaktifkan tidak dapat dipilih oleh pelanggan untuk metode pickup.`
                : `Apakah Anda yakin ingin mengaktifkan kembali "${modalStoreData?.name}"?`
              }
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowToggleModal(false)}>
                <Text style={styles.modalButtonCancelText}>Batal</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, modalStoreData?.is_active ? styles.modalButtonConfirm : { backgroundColor: "#3DBA6C" }]} onPress={doToggle}>
                <Text style={styles.modalButtonConfirmText}>{modalStoreData?.is_active ? "Nonaktifkan" : "Aktifkan"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showErrorModal} transparent animationType="fade" onRequestClose={() => setShowErrorModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="alert-circle-outline" size={32} color="#f59e0b" />
            </View>
            <Text style={styles.modalTitle}>Peringatan</Text>
            <Text style={styles.modalText}>{errorMessage}</Text>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, { backgroundColor: COLORS.primary, flex: 0, width: "100%" }]} onPress={() => setShowErrorModal(false)}>
                <Text style={styles.modalButtonConfirmText}>Mengerti</Text>
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
  title: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
  subtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center", marginTop: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: 8, ...CARD_SHADOW },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  name: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  city: { color: COLORS.primary, fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 2 },
  badge: { borderRadius: RADIUS.full, paddingVertical: 3, paddingHorizontal: 10 },
  badgeText: { fontSize: 10, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  rowText: { flex: 1, color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, borderStyle: "dashed" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, borderWidth: 1, paddingVertical: 7, paddingHorizontal: 12 },
  actionText: { fontSize: 11, fontWeight: "700" },
  editBtn: { borderColor: "#3b82f640", backgroundColor: "#3b82f610" },
  offBtn: { borderColor: "#FF4B4B40", backgroundColor: "#FF4B4B10" },
  onBtn: { borderColor: "#3DBA6C40", backgroundColor: "#3DBA6C10" },
  fab: { position: "absolute", right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", elevation: 8, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: SPACING.lg },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  modalIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(245, 158, 11, 0.1)", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  modalText: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalButtonCancel: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  modalButtonCancelText: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  modalButtonConfirm: { backgroundColor: "#ef4444" },
  modalButtonConfirmText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});