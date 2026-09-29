import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS } from "../../constants/theme";
import { createAdminVoucher, updateAdminVoucher, deleteAdminVoucher } from "../../services/adminService";
import AppTextInput from "../../components/AppTextInput";

// Helper function untuk menambahkan titik pemisah ribuan
const formatRibuan = (angka) => {
  if (!angka) return "";
  const rawNumber = angka.toString().replace(/[^0-9]/g, "");
  return rawNumber.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

function Chip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function AdminVoucherFormScreen({ route, navigation }) {
  const existing = route?.params?.voucher;
  const isEdit = !!existing;

  const [code, setCode] = useState(existing?.code || "");
  const [type, setType] = useState(existing?.type || "percentage");
  
  // Nilai-nilai nominal tetap disimpan sebagai string murni di state
  const [value, setValue] = useState(existing?.value ? String(existing.value) : "");
  const [minPurchase, setMinPurchase] = useState(existing?.min_purchase ? String(existing.min_purchase) : "0");
  const [maxDiscount, setMaxDiscount] = useState(existing?.max_discount ? String(existing.max_discount) : "");
  
  const [quota, setQuota] = useState(existing?.quota ? String(existing.quota) : "1");
  const [expiredAt, setExpiredAt] = useState(existing?.expired_at ? existing.expired_at.split("T")[0] : "");
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    if (!code || !value) {
      setError("Kode dan nilai voucher wajib diisi");
      return;
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
        expired_at: expiredAt || null,
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: SPACING.lg, gap: 10 }} keyboardDismissMode="on-drag">
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

        <Text style={styles.label}>Tanggal Kedaluwarsa (YYYY-MM-DD, opsional)</Text>
        <AppTextInput style={styles.input} value={expiredAt} onChangeText={setExpiredAt} placeholder="Kosongkan jika tidak ada batas" />

        <Text style={styles.label}>Status</Text>
        <View style={styles.chipRow}>
          <Chip label="Aktif" active={isActive} onPress={() => setIsActive(true)} />
          <Chip label="Nonaktif" active={!isActive} onPress={() => setIsActive(false)} />
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  label: { color: COLORS.textMuted, fontSize: 12, marginTop: 6 },
  hint: { color: COLORS.textFaint, fontSize: 10, marginTop: -6 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 12 },
  chipTextActive: { color: COLORS.text, fontWeight: "600" },
  errorText: { color: COLORS.primary, fontSize: 12 },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 10 },
  saveButtonText: { color: COLORS.text, fontWeight: "600" },
  deleteButton: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 10 },
  deleteButtonText: { color: COLORS.primary, fontWeight: "600" },
});