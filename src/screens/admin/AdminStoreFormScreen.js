// AdminStoreFormScreen.js
import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS } from "../../constants/theme";
import { createAdminStore, updateAdminStore } from "../../services/adminService";
import AppTextInput from "../../components/AppTextInput";

export default function AdminStoreFormScreen({ route, navigation }) {
  const existing = route?.params?.store;
  const isEdit = !!existing;

  const [initialForm] = useState({
    name: existing?.name || "",
    city: existing?.city || "",
    address: existing?.address || "",
    phone: existing?.phone || "",
    maps_url: existing?.maps_url || "",
  });
  const [form, setForm] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const isSavedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);
      if (!dirty || isSavedRef.current) return;

      e.preventDefault();
      setPendingAction(e.data.action);
      setShowExitModal(true);
    });
    return unsubscribe;
  }, [navigation, form, initialForm]);

  const handleConfirmExit = () => {
    setShowExitModal(false);
    if (pendingAction) {
      navigation.dispatch(pendingAction);
    }
  };
  
  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.city.trim() || !form.address.trim()) {
      showError("Nama store, kota, dan alamat lengkap wajib diisi.");
      return;
    }
    const maps = form.maps_url.trim();
    if (maps && !/^https?:\/\//i.test(maps)) {
      showError("Link Maps harus diawali dengan http:// atau https://.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        maps_url: maps,
      };
      if (isEdit) await updateAdminStore(existing.store_id, payload);
      else await createAdminStore(payload);

      isSavedRef.current = true;
      setSuccessMessage(`"${payload.name}" sudah tersimpan.`);
      setShowSuccessModal(true);
    } catch (err) {
      showError(err.message || "Gagal menyimpan data cabang toko. Periksa koneksi Anda.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: SPACING.lg, gap: 10, paddingBottom: 40 }}
        >
          <Text style={styles.label}>Nama Store *</Text>
          <AppTextInput style={styles.input} value={form.name} onChangeText={(v) => setField("name", v)} placeholder="Decant Temcy Semarang" />

          <Text style={styles.label}>Kota *</Text>
          <AppTextInput style={styles.input} value={form.city} onChangeText={(v) => setField("city", v)} placeholder="Semarang" />

          <Text style={styles.label}>Alamat Lengkap *</Text>
          <AppTextInput
            style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
            value={form.address}
            onChangeText={(v) => setField("address", v)}
            placeholder="Jl. ... No. ..., Kecamatan, Kota"
            multiline
          />

          <Text style={styles.label}>No. Telepon / WhatsApp</Text>
          <AppTextInput style={styles.input} value={form.phone} onChangeText={(v) => setField("phone", v)} placeholder="08xxxxxxxxxx" keyboardType="phone-pad" />

          <Text style={styles.label}>Link Google Maps (opsional)</Text>
          <AppTextInput
            style={styles.input}
            value={form.maps_url}
            onChangeText={(v) => setField("maps_url", v)}
            placeholder="https://maps.app.goo.gl/..."
            keyboardType="url"
            autoCapitalize="none"
          />

          <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.saveButtonText}>{isEdit ? "Simpan Perubahan" : "Tambah Store"}</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Exit Modal */}
      <Modal visible={showExitModal} transparent animationType="fade" onRequestClose={() => setShowExitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="document-text-outline" size={32} color="#f59e0b" />
            </View>
            <Text style={styles.modalTitle}>Perubahan Belum Disimpan</Text>
            <Text style={styles.modalText}>
              Data yang sudah kamu isi akan hilang kalau kamu keluar sekarang.
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowExitModal(false)}>
                <Text style={styles.modalButtonCancelText}>Lanjut Edit</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalButtonConfirm]} onPress={handleConfirmExit}>
                <Text style={styles.modalButtonConfirmText}>Keluar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={showErrorModal} transparent animationType="fade" onRequestClose={() => setShowErrorModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconContainer, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
              <Ionicons name="close-circle-outline" size={32} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Peringatan</Text>
            <Text style={styles.modalText}>{errorMessage}</Text>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.modalButtonConfirm, { flex: 0, width: "100%" }]} onPress={() => setShowErrorModal(false)}>
                <Text style={styles.modalButtonConfirmText}>Mengerti</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={handleSuccessClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconContainer, { backgroundColor: "rgba(61, 186, 108, 0.1)" }]}>
              <Ionicons name="checkmark-circle-outline" size={32} color="#3DBA6C" />
            </View>
            <Text style={styles.modalTitle}>{isEdit ? "Store Berhasil Diperbarui" : "Store Berhasil Ditambahkan"}</Text>
            <Text style={styles.modalText}>{successMessage}</Text>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, { backgroundColor: "#3DBA6C", flex: 0, width: "100%" }]} onPress={handleSuccessClose}>
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Oke</Text>
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
  label: { color: COLORS.textMuted, fontSize: 12, marginTop: 6 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 20 },
  saveButtonText: { color: COLORS.text, fontWeight: "600" },
  
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