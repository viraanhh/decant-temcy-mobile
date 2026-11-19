import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useAddress } from "../context/AddressContext";
import { searchDestinations } from "../services/shippingService";
import AppTextInput from "../components/AppTextInput";

function DestinationPickerModal({ visible, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const keyword = search.trim();
    if (keyword.length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const list = await searchDestinations(keyword);
        setResults(list);
      } catch (err) {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Cari Wilayah Tujuan</Text>
          <Pressable onPress={onClose} style={styles.modalCloseIcon}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </Pressable>
        </View>

        <View style={styles.modalSearchBox}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <AppTextInput
            style={styles.modalSearchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Ketik kecamatan, kota, atau kode pos (min. 3 huruf)..."
            placeholderTextColor={COLORS.textFaint}
            autoFocus
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </Pressable>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={COLORS.primary} />
        ) : (
          <FlatList
            data={results}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item, i) => String(item.id ?? item.destination_id ?? i)}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <Text style={styles.modalEmptyText}>
                {search.trim().length < 3
                  ? "Masukkan minimal 3 huruf nama kecamatan/kota."
                  : "Wilayah tidak ditemukan."}
              </Text>
            }
            renderItem={({ item }) => {
              const title = item.label || [item.subdistrict_name, item.district_name, item.city_name, item.province_name].filter(Boolean).join(", ");
              return (
                <Pressable
                  style={({ pressed }) => [styles.modalItem, pressed && { backgroundColor: COLORS.surfaceLight }]}
                  onPress={() => onSelect(item)}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.modalItemText}>{title}</Text>
                    {!!item.zip_code && (
                      <Text style={styles.modalItemSub}>Kode Pos: {item.zip_code}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textFaint} />
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

export default function AddAddressScreen({ navigation, route }) {
  const selectMode = route?.params?.selectMode ?? false;
  const { addAddress, selectAddress } = useAddress();

  const [label, setLabel] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [district, setDistrict] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [detail, setDetail] = useState("");

  const [destinationModalOpen, setDestinationModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handlePickDestination = (item) => {
    setSelectedDestination(item);
    setDistrict(item.district_name || item.subdistrict_name || "");
    setPostalCode(item.zip_code || item.postal_code || "");
    setDestinationModalOpen(false);
  };

  const formatPhoneInput = (text) => {
    if (!text) return "";
    const cleaned = text.replace(/[^0-9]/g, "");
    let formatted = cleaned;
    if (cleaned.length > 4 && cleaned.length <= 8) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    } else if (cleaned.length > 8) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 13)}`;
    }
    return formatted;
  };

  const handleSave = async () => {
    setError("");
    if (!recipientName || !phone || !selectedDestination || !detail) {
      setError("Mohon lengkapi kolom Nama, No. Telepon, Wilayah Tujuan, dan Alamat Lengkap");
      return;
    }

    const provinceName = selectedDestination.province_name || selectedDestination.province || "";
    const cityName = selectedDestination.city_name || selectedDestination.city || "";
    const destId = String(selectedDestination.id ?? selectedDestination.destination_id ?? selectedDestination.city_id ?? "");

    setIsSaving(true);
    try {
      const created = await addAddress({
        label: label || "Alamat",
        recipientName,
        phone,
        province: provinceName || cityName,
        provinceId: String(selectedDestination.province_id ?? ""),
        city: cityName || selectedDestination.label,
        cityId: destId,
        district,
        postalCode,
        detail,
      });
      if (selectMode) selectAddress(created.id);
      navigation.goBack();
    } catch (err) {
      setError(err?.response?.data?.message || "Gagal menyimpan alamat");
    } finally {
      setIsSaving(false);
    }
  };

  const destinationDisplay = selectedDestination
    ? selectedDestination.label ||
      [selectedDestination.district_name, selectedDestination.city_name, selectedDestination.province_name]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section: Info Label & Kontak */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Informasi Penerima</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Label Alamat</Text>
              <View style={styles.inputBox}>
                <Ionicons name="bookmark-outline" size={18} color={COLORS.textMuted} />
                <AppTextInput
                  style={styles.inputField}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="Contoh: Rumah, Kantor, Kos"
                  placeholderTextColor={COLORS.textFaint}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama Penerima</Text>
              <View style={styles.inputBox}>
                <Ionicons name="person-outline" size={18} color={COLORS.textMuted} />
                <AppTextInput
                  style={styles.inputField}
                  value={recipientName}
                  onChangeText={setRecipientName}
                  placeholder="Nama lengkap penerima"
                  placeholderTextColor={COLORS.textFaint}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>No. Telepon</Text>
              <View style={styles.inputBox}>
                <Ionicons name="call-outline" size={18} color={COLORS.textMuted} />
                <AppTextInput
                  style={styles.inputField}
                  value={phone}
                  onChangeText={(v) => setPhone(formatPhoneInput(v))}
                  placeholder="0812-3456-7890"
                  placeholderTextColor={COLORS.textFaint}
                  keyboardType="phone-pad"
                  maxLength={14}
                />
              </View>
            </View>
          </View>

          {/* Section: Lokasi Wilayah */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Lokasi Pengiriman</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kota / Kecamatan / Kode Pos</Text>
              <Pressable style={styles.selectInput} onPress={() => setDestinationModalOpen(true)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, paddingRight: 8 }}>
                  <Ionicons name="map-outline" size={18} color={COLORS.textMuted} />
                  <Text
                    style={destinationDisplay ? styles.selectInputText : styles.selectInputPlaceholder}
                    numberOfLines={2}
                  >
                    {destinationDisplay || "Cari Kecamatan / Kota / Kode Pos"}
                  </Text>
                </View>
                <Ionicons name="search" size={16} color={COLORS.textMuted} />
              </Pressable>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>
                  Kecamatan <Text style={styles.optionalText}>(Otomatis/Edit)</Text>
                </Text>
                <View style={styles.inputBox}>
                  <AppTextInput
                    style={[styles.inputField, { paddingHorizontal: 4 }]}
                    value={district}
                    onChangeText={setDistrict}
                    placeholder="Kecamatan"
                    placeholderTextColor={COLORS.textFaint}
                  />
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>
                  Kode Pos <Text style={styles.optionalText}>(Otomatis/Edit)</Text>
                </Text>
                <View style={styles.inputBox}>
                  <AppTextInput
                    style={[styles.inputField, { paddingHorizontal: 4 }]}
                    value={postalCode}
                    onChangeText={setPostalCode}
                    placeholder="Kode Pos"
                    placeholderTextColor={COLORS.textFaint}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Alamat Lengkap</Text>
              <AppTextInput
                style={[styles.inputBoxArea, { height: 90, alignItems: "flex-start", paddingTop: 10 }]}
                value={detail}
                onChangeText={setDetail}
                placeholder="Nama jalan, nomor rumah, blok, RT/RW..."
                placeholderTextColor={COLORS.textFaint}
                multiline
              />
            </View>
          </View>

          {/* Error Banner */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={COLORS.primary} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Sticky Footer */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.onPrimary} />
            ) : (
              <Text style={styles.saveButtonText}>Simpan Alamat</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Modal Pencarian Destinasi */}
      <DestinationPickerModal
        visible={destinationModalOpen}
        onSelect={handlePickDestination}
        onClose={() => setDestinationModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16, paddingBottom: 30 },

  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 14,
  },

  inputGroup: { marginBottom: 12 },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  optionalText: { color: COLORS.textFaint, fontWeight: "400", fontSize: 11 },

  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputBoxArea: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputField: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: COLORS.text,
    fontSize: 14,
  },

  rowInputs: { flexDirection: "row", gap: 12 },

  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  selectInputText: { color: COLORS.text, fontSize: 14, fontWeight: "500", flex: 1 },
  selectInputPlaceholder: { color: COLORS.textFaint, fontSize: 14 },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  errorText: { color: COLORS.primary, fontSize: 13, fontWeight: "600", flex: 1 },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: { color: COLORS.onPrimary, fontWeight: "700", fontSize: 15 },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 16, paddingTop: 20 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700" },
  modalCloseIcon: { padding: 4 },

  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  modalEmptyText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 24,
    fontSize: 13,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemText: { color: COLORS.text, fontSize: 14, fontWeight: "500" },
  modalItemSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
});