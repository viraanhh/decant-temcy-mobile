import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, Alert, ScrollView, KeyboardAvoidingView } from "react-native";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS } from "../../constants/theme";
import { createAdminVoucher, updateAdminVoucher, deleteAdminVoucher } from "../../services/adminService";
import AppTextInput from "../../components/AppTextInput";

const formatRibuan = (angka) => {
  if (!angka) return "";
  const rawNumber = angka.toString().replace(/[^0-9]/g, "");
  return rawNumber.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Fungsi untuk Auto-Format Tanggal DD/MM/YYYY
const formatDateInput = (text) => {
  const cleaned = text.replace(/[^0-9]/g, "");
  let formatted = cleaned;
  if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  if (cleaned.length > 4) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  return formatted;
};

// Tambahkan prop customColor untuk Chip aktif (Hijau/Merah)
function Chip({ label, active, onPress, customColor = COLORS.primary }) {
  return (
    <Pressable 
      style={[styles.chip, active && { backgroundColor: customColor, borderColor: customColor }]} 
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function AdminVoucherFormScreen({ route, navigation }) {
  const existing = route?.params?.voucher;
  const isEdit = !!existing;

  // Jika mengedit, ubah format YYYY-MM-DD dari backend menjadi DD/MM/YYYY untuk ditampilkan
  let initialDate = "";
  if (existing?.expired_at) {
    const parts = existing.expired_at.split("T")[0].split("-");
    if (parts.length === 3) initialDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  const [code, setCode] = useState(existing?.code || "");
  const [type, setType] = useState(existing?.type || "percentage");
  const [value, setValue] = useState(existing?.value ? String(existing.value) : "");
  const [minPurchase, setMinPurchase] = useState(existing?.min_purchase ? String(existing.min_purchase) : "0");
  const [maxDiscount, setMaxDiscount] = useState(existing?.max_discount ? String(existing.max_discount) : "");
  
  const [quota, setQuota] = useState(existing?.quota ? String(existing.quota) : "1");
  const [expiredAt, setExpiredAt] = useState(initialDate);
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    if (!code || !value) {
      setError("Kode dan nilai voucher wajib diisi");
      return;
    }

    // Ubah format DD/MM/YYYY kembali menjadi YYYY-MM-DD untuk API
    let formattedExpiredAt = null;
    if (expiredAt && expiredAt.length === 10) {
      const [day, month, year] = expiredAt.split("/");
      formattedExpiredAt = `${year}-${month}-${day}`;
    }

    setIsSaving(true);
    try {
      const fields = {
        code,
        type,
        value: Number(value),
        min_purchase: Number(minPurchase) || 0,
        max_discount: maxDiscount ? Number(maxDiscount) : null,
        quota: Number(quota) || 1,
        expired_at: formattedExpiredAt, // Gunakan format backend
        is_active: isActive,
      };

      if (isEdit) {
        await updateAdminVoucher(existing.voucher_id, fields);
      } else {
        await createAdminVoucher(fields);
      }
      navigation.goBack();
    } catch (err) {
      setError(err?.response?.data?.message || "Gagal menyimpan voucher");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Hapus Voucher", `Hapus voucher "${existing.code}" secara permanen?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus", style: "destructive",
        onPress: async () => {
          await deleteAdminVoucher(existing.voucher_id);
          navigation.goBack();
        },
      },
    ]);
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
          contentContainerStyle={{ padding: SPACING.lg, gap: 10, paddingBottom: 40 }}
        >
          <Text style={styles.label}>Kode Voucher</Text>
          <AppTextInput style={styles.input} value={code} onChangeText={setCode} placeholder="Contoh: DISKON10" autoCapitalize="characters" editable={!isEdit} />
          {isEdit && <Text style={styles.hint}>Kode tidak bisa diubah setelah dibuat</Text>}

          <Text style={styles.label}>Tipe Diskon</Text>
          <View style={styles.chipRow}>
            <Chip label="Persentase (%)" active={type === "percentage"} onPress={() => setType("percentage")} />
            <Chip label="Nominal Tetap (Rp)" active={type === "fixed"} onPress={() => setType("fixed")} />
          </View>

          <Text style={styles.label}>{type === "percentage" ? "Nilai Diskon (%)" : "Nilai Diskon (Rp)"}</Text>
          <AppTextInput 
            style={styles.input} 
            value={type === "percentage" ? value : formatRibuan(value)} 
            onChangeText={(text) => {
              const rawValue = type === "percentage" ? text : text.replace(/[^0-9]/g, "");
              setValue(rawValue);
            }} 
            placeholder={type === "percentage" ? "10" : "5.000"} 
            keyboardType="number-pad" 
          />

          {type === "percentage" && (
            <>
              <Text style={styles.label}>Maksimal Potongan (Rp, opsional)</Text>
              <AppTextInput 
                style={styles.input} 
                value={formatRibuan(maxDiscount)} 
                onChangeText={(text) => setMaxDiscount(text.replace(/[^0-9]/g, ""))} 
                placeholder="Kosongkan jika tidak dibatasi" 
                keyboardType="number-pad" 
              />
            </>
          )}

          <Text style={styles.label}>Minimal Belanja (Rp)</Text>
          <AppTextInput 
            style={styles.input} 
            value={formatRibuan(minPurchase)} 
            onChangeText={(text) => setMinPurchase(text.replace(/[^0-9]/g, ""))} 
            placeholder="0" 
            keyboardType="number-pad" 
          />

          <Text style={styles.label}>Kuota Penggunaan</Text>
          <AppTextInput style={styles.input} value={quota} onChangeText={setQuota} placeholder="1" keyboardType="number-pad" />

          <Text style={styles.label}>Tanggal Kedaluwarsa (DD/MM/YYYY, opsional)</Text>
          <AppTextInput 
            style={styles.input} 
            value={expiredAt} 
            onChangeText={(text) => setExpiredAt(formatDateInput(text))} 
            placeholder="DD/MM/YYYY" 
            keyboardType="number-pad"
            maxLength={10}
          />

          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {/* Warna Hijau untuk Aktif, Merah untuk Nonaktif */}
            <Chip label="Aktif" active={isActive} onPress={() => setIsActive(true)} customColor="#4CAF50" />
            <Chip label="Nonaktif" active={!isActive} onPress={() => setIsActive(false)} customColor="#F44336" />
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.saveButtonText}>{isEdit ? "Simpan Perubahan" : "Buat Voucher"}</Text>}
          </Pressable>

          {isEdit && (
            <Pressable style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Hapus Voucher</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  label: { color: COLORS.textMuted, fontSize: 12, marginTop: 6 },
  hint: { color: COLORS.textFaint, fontSize: 10, marginTop: -6 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  
  chipText: { color: COLORS.textMuted, fontSize: 12 },
  chipTextActive: { color: COLORS.text, fontWeight: "600" },
  errorText: { color: COLORS.primary, fontSize: 12 },
  
  // Memperbaiki jarak antar tombol
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24, marginBottom: 0 },
  saveButtonText: { color: COLORS.text, fontWeight: "600" },
  deleteButton: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 12 },
  deleteButtonText: { color: COLORS.primary, fontWeight: "600" },
});