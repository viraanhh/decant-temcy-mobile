import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/theme";
import { getPublicContacts, updateAdminContacts } from "../../services/adminService";

function formatPhoneInput(text) {
  if (!text) return "";
  const cleaned = text.replace(/[^0-9]/g, "");
  if (cleaned.length <= 4) return cleaned;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 13)}`;
}

export default function AdminContactsScreen() {
  const [contacts, setContacts] = useState({ whatsapp: "", instagram: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // State untuk Custom Status Modal (Sukses / Error)
  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: "success", // "success" | "error"
    title: "",
    message: "",
  });

  const showModal = (type, title, message) => {
    setStatusModal({ visible: true, type, title, message });
  };

  const closeModal = () => {
    setStatusModal((prev) => ({ ...prev, visible: false }));
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      getPublicContacts()
        .then((res) => {
          setContacts({
            whatsapp: formatPhoneInput(res?.whatsapp || ""),
            instagram: res?.instagram || "",
          });
        })
        .catch(() => {
          showModal("error", "Gagal Memuat", "Tidak dapat memuat data kontak dari server.");
        })
        .finally(() => setIsLoading(false));
    }, [])
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAdminContacts(contacts);
      showModal("success", "Berhasil Disimpan", "Kontak dan Sosial Media toko berhasil diperbarui.");
    } catch (err) {
      showModal(
        "error",
        "Gagal Menyimpan",
        err?.response?.data?.message || "Tidak dapat menyimpan perubahan kontak."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isSuccess = statusModal.type === "success";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }} keyboardShouldPersistTaps="handled">
        <View style={styles.headerInfo}>
          <Ionicons name="call-outline" size={32} color={COLORS.primary} />
          <Text style={styles.title}>Kontak & Sosial Media</Text>
          <Text style={styles.description}>
            Nomor WhatsApp dan username Instagram yang akan ditampilkan untuk membantu pelanggan menghubungi toko.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
        ) : (
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nomor WhatsApp</Text>
              <TextInput
                style={styles.input}
                value={contacts.whatsapp}
                onChangeText={(t) =>
                  setContacts({ ...contacts, whatsapp: formatPhoneInput(t) })
                }
                placeholder="misal: 0812-3456-7890"
                keyboardType="phone-pad"
                maxLength={15}
                placeholderTextColor={COLORS.textFaint}
              />
              <Text style={styles.hint}>Kosongkan jika tidak ingin menampilkannya.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username / Link Instagram</Text>
              <TextInput
                style={styles.input}
                value={contacts.instagram}
                onChangeText={(t) => setContacts({ ...contacts, instagram: t })}
                placeholder="misal: @decant_temcy"
                placeholderTextColor={COLORS.textFaint}
                autoCapitalize="none"
              />
              <Text style={styles.hint}>Bisa diisi dengan username atau link lengkap profil.</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.85 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={COLORS.onPrimary} />
              ) : (
                <Text style={styles.saveButtonText}>Simpan Perubahan</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* CUSTOM MODAL SUKSES / ERROR */}
      <Modal
        visible={statusModal.visible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIcon,
                {
                  backgroundColor: isSuccess
                    ? "rgba(16, 185, 129, 0.12)"
                    : "rgba(239, 68, 68, 0.12)",
                },
              ]}
            >
              <Ionicons
                name={isSuccess ? "checkmark-circle-outline" : "close-circle-outline"}
                size={36}
                color={isSuccess ? "#10B981" : "#EF4444"}
              />
            </View>

            <Text style={styles.modalTitle}>{statusModal.title}</Text>
            <Text style={styles.modalText}>{statusModal.message}</Text>

            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                { backgroundColor: isSuccess ? COLORS.primary : "#EF4444" },
                pressed && { opacity: 0.85 },
              ]}
              onPress={closeModal}
            >
              <Text
                style={[
                  styles.modalButtonText,
                  { color: isSuccess ? COLORS.onPrimary : "#FFFFFF" },
                ]}
              >
                OK
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerInfo: { alignItems: "center", marginBottom: SPACING.lg, paddingHorizontal: SPACING.sm },
  title: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  description: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },
  formCard: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  inputGroup: { marginBottom: 16 },
  label: { color: COLORS.text, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text, fontSize: 14 },
  hint: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  saveButtonText: { color: COLORS.onPrimary, fontWeight: "600", fontSize: 14 },

  // Custom Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 8,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  modalText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 21,
  },
  modalButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
});