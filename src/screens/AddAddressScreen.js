import { useState, useEffect } from "react";
import { View, Text, FlatList, Pressable, Modal, StyleSheet, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView } from "react-native";
import { COLORS } from "../constants/colors";
import { useAddress } from "../context/AddressContext";
import { getProvinces, getCities } from "../services/shippingService";
import AppTextInput from "../components/AppTextInput";

function PickerModal({ visible, title, items, labelKey, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = items.filter((item) => item[labelKey].toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>{title}</Text>
        <AppTextInput style={styles.modalSearch} value={search} onChangeText={setSearch} placeholder="Cari..." />
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => String(item.province_id ?? item.city_id ?? i)}
          renderItem={({ item }) => (
            <Pressable style={styles.modalItem} onPress={() => onSelect(item)}>
              <Text style={styles.modalItemText}>{item[labelKey]}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.modalCloseButton} onPress={onClose}>
          <Text style={styles.modalCloseText}>Tutup</Text>
        </Pressable>
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
  const [district, setDistrict] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [detail, setDetail] = useState("");

  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [provinceModalOpen, setProvinceModalOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { getProvinces().then(setProvinces); }, []);

  const handlePickProvince = async (province) => {
    setSelectedProvince(province);
    setSelectedCity(null);
    setProvinceModalOpen(false);
    const cityList = await getCities(province.province_id);
    setCities(cityList);
  };

  const handleSave = async () => {
    setError("");
    if (!recipientName || !phone || !selectedProvince || !selectedCity || !detail) {
      setError("Semua kolom wajib diisi kecuali Kecamatan & Kode Pos");
      return;
    }
    setIsSaving(true);
    try {
      const created = await addAddress({
        label: label || "Alamat",
        recipientName, phone,
        province: selectedProvince.province,
        provinceId: selectedProvince.province_id,
        city: selectedCity.city_name,
        cityId: selectedCity.city_id,
        district,
        postalCode: postalCode || selectedCity.postal_code,
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

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 20 }}
        >
          <AppTextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="Label (Rumah, Kos, dll)" />
          <AppTextInput style={styles.input} value={recipientName} onChangeText={setRecipientName} placeholder="Nama Penerima" />
          <AppTextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="No. Telepon" keyboardType="phone-pad" />

          <Pressable style={styles.selectInput} onPress={() => setProvinceModalOpen(true)}>
            <Text style={selectedProvince ? styles.selectInputText : styles.selectInputPlaceholder}>
              {selectedProvince?.province || "Pilih Provinsi"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.selectInput, !selectedProvince && { opacity: 0.5 }]}
            onPress={() => selectedProvince && setCityModalOpen(true)}
            disabled={!selectedProvince}
          >
            <Text style={selectedCity ? styles.selectInputText : styles.selectInputPlaceholder}>
              {selectedCity?.city_name || "Pilih Kota/Kabupaten"}
            </Text>
          </Pressable>

          <AppTextInput style={styles.input} value={district} onChangeText={setDistrict} placeholder="Kecamatan (opsional)" />
          <AppTextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} placeholder="Kode Pos (opsional)" keyboardType="number-pad" />
          <AppTextInput style={[styles.input, { height: 70 }]} value={detail} onChangeText={setDetail} placeholder="Alamat Lengkap (jalan, no rumah, RT/RW)" multiline />

          {!!error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.saveButtonText}>Simpan Alamat</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <PickerModal visible={provinceModalOpen} title="Pilih Provinsi" items={provinces} labelKey="province" onSelect={handlePickProvince} onClose={() => setProvinceModalOpen(false)} />
      <PickerModal visible={cityModalOpen} title="Pilih Kota/Kabupaten" items={cities} labelKey="city_name" onSelect={(city) => { setSelectedCity(city); setCityModalOpen(false); }} onClose={() => setCityModalOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text },
  selectInput: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12 },
  selectInputText: { color: COLORS.text },
  selectInputPlaceholder: { color: COLORS.textFaint },
  errorText: { color: COLORS.primary, fontSize: 12 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center" },
  saveButtonText: { color: COLORS.text, fontWeight: "600" },
  modalContainer: { flex: 1, backgroundColor: COLORS.background, padding: 16, paddingTop: 50 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  modalSearch: { marginBottom: 12 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalItemText: { color: COLORS.text, fontSize: 14 },
  modalCloseButton: { backgroundColor: COLORS.surface, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 12 },
  modalCloseText: { color: COLORS.primary, fontWeight: "600" },
});