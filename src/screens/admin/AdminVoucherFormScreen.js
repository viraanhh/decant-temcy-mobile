import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, Alert, ScrollView, KeyboardAvoidingView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
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

function Chip({ label, active, onPress, customColor = COLORS.primary, iconName }) {
  return (
    <Pressable 
      style={[
        styles.chip, 
        active && { backgroundColor: `${customColor}18`, borderColor: customColor }
      ]} 
      onPress={onPress}
    >
      {iconName && <Ionicons name={iconName} size={15} color={active ? customColor : COLORS.textMuted} />}
      <Text style={[styles.chipText, active && { color: customColor, fontWeight: "750" }]}>{label}</Text>
    </Pressable>
  );
}

export default function AdminVoucherFormScreen({ route, navigation }) {
  const existing = route?.params?.voucher;
  const isEdit = !!existing;

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
      setError("Kode dan nilai diskon voucher wajib diisi!");
      return;
    }

    let formattedExpiredAt = null;
    if (expiredAt && expiredAt.length === 10) {
      const [day, month, year] = expiredAt.split("/");
      formattedExpiredAt = `${year}-${month}-${day}`;
    }

    setIsSaving(true);
    try {
      const fields = {
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        min_purchase: Number(minPurchase) || 0,
        max_discount: maxDiscount ? Number(maxDiscount) : null,
        quota: Number(quota) || 1,
        expired_at: formattedExpiredAt,
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
    Alert.alert(
      "Hapus Voucher", 
      `Yakin ingin menghapus voucher "${existing.code}" secara permanen?`, 
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus", style: "destructive",
          onPress: async () => {
            await deleteAdminVoucher(existing.voucher_id);
            navigation.goBack();
          },
        },
      ]
    );
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
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: 60 }}
        >
          {/* KARTU KODE & STATUS VOUCHER */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Identitas & Status Voucher</Text>
            
            <Text style={styles.label}>Kode Voucher <Text style={{ color: "#EF4444" }}>*</Text></Text>
            <AppTextInput 
              style={styles.input} 
              value={code} 
              onChangeText={(v) => setCode(v.toUpperCase())} 
              placeholder="Contoh: PROMOLEBARAN" 
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters" 
              editable={!isEdit} 
            />
            {isEdit ? (
              <Text style={styles.hint}>Kode voucher tidak dapat diubah setelah dibuat.</Text>
            ) : (
              <Text style={styles.hint}>Gunakan huruf kapital tanpa spasi agar mudah diketik customer.</Text>
            )}

            <Text style={styles.label}>Status Voucher</Text>
            <View style={styles.chipRow}>
              <Chip 
                label="Aktif" 
                iconName="checkmark-circle-outline"
                active={isActive} 
                onPress={() => setIsActive(true)} 
                customColor="#10B981" 
              />
              <Chip 
                label="Nonaktif" 
                iconName="close-circle-outline"
                active={!isActive} 
                onPress={() => setIsActive(false)} 
                customColor="#EF4444" 
              />
            </View>
          </View>

          {/* KARTU PENGATURAN NILAI DISKON */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Pengaturan Diskon</Text>

            <Text style={styles.label}>Tipe Diskon</Text>
            <View style={styles.chipRow}>
              <Chip 
                label="Persentase (%)" 
                iconName="pie-chart-outline"
                active={type === "percentage"} 
                onPress={() => setType("percentage")} 
                customColor={COLORS.primary} 
              />
              <Chip 
                label="Nominal Tetap (Rp)" 
                iconName="cash-outline"
                active={type === "fixed"} 
                onPress={() => setType("fixed")} 
                customColor={COLORS.primary} 
              />
            </View>

            <Text style={styles.label}>
              {type === "percentage" ? "Nilai Diskon (%)" : "Nominal Potongan (Rp)"} <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <AppTextInput 
              style={styles.input} 
              value={type === "percentage" ? value : formatRibuan(value)} 
              onChangeText={(text) => {
                const rawValue = type === "percentage" ? text.replace(/[^0-9]/g, "") : text.replace(/[^0-9]/g, "");
                setValue(rawValue);
              }} 
              placeholder={type === "percentage" ? "Contoh: 10" : "Contoh: 20.000"} 
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad" 
            />

            {type === "percentage" && (
              <>
                <Text style={styles.label}>Maksimal Potongan Diskon (Rp, Opsional)</Text>
                <AppTextInput 
                  style={styles.input} 
                  value={formatRibuan(maxDiscount)} 
                  onChangeText={(text) => setMaxDiscount(text.replace(/[^0-9]/g, ""))} 
                  placeholder="Kosongkan jika tidak ada batas maksimal" 
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad" 
                />
              </>
            )}
          </View>

          {/* KARTU KETENTUAN & KUOTA */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Ketentuan Penggunaan & Masa Aktif</Text>

            <Text style={styles.label}>Minimal Belanja (Rp)</Text>
            <AppTextInput 
              style={styles.input} 
              value={formatRibuan(minPurchase)} 
              onChangeText={(text) => setMinPurchase(text.replace(/[^0-9]/g, ""))} 
              placeholder="0 (Tanpa minimal belanja)" 
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad" 
            />

            <Text style={styles.label}>Kuota Total Penggunaan</Text>
            <AppTextInput 
              style={styles.input} 
              value={quota} 
              onChangeText={(v) => setQuota(v.replace(/[^0-9]/g, ""))} 
              placeholder="100" 
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad" 
            />

            <Text style={styles.label}>Tanggal Kedaluwarsa (DD/MM/YYYY, Opsional)</Text>
            <AppTextInput 
              style={styles.input} 
              value={expiredAt} 
              onChangeText={(text) => setExpiredAt(formatDateInput(text))} 
              placeholder="DD/MM/YYYY (Cth: 31/12/2026)" 
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* TOMBOL AKSI */}
          <Pressable 
            style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.8 }]} 
            onPress={handleSave} 
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <>
                <Ionicons name={isEdit ? "checkmark-circle-outline" : "add-circle-outline"} size={20} color={COLORS.surface} />
                <Text style={styles.saveButtonText}>{isEdit ? "Simpan Perubahan" : "Buat Voucher Baru"}</Text>
              </>
            )}
          </Pressable>

          {isEdit && (
            <Pressable 
              style={({ pressed }) => [styles.deleteButton, pressed && { backgroundColor: "rgba(239, 68, 68, 0.08)" }]} 
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={styles.deleteButtonText}>Hapus Voucher Ini</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  cardSectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },

  label: { color: COLORS.textMuted, fontSize: 12, marginTop: 10, marginBottom: 4, fontWeight: "600" },
  hint: { color: COLORS.textMuted, fontSize: 11, marginTop: 4, fontStyle: "italic" },
  
  input: { 
    backgroundColor: COLORS.background, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: RADIUS.sm, 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    color: COLORS.text,
    fontSize: 14
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  chip: { 
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.background, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: RADIUS.sm, 
    paddingVertical: 9, 
    paddingHorizontal: 16,
    flexGrow: 1,
    justifyContent: "center"
  },
  chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  errorText: { color: "#EF4444", fontSize: 12, fontWeight: "600", flex: 1 },

  saveButton: { 
    backgroundColor: COLORS.primary, 
    borderRadius: RADIUS.md, 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: SPACING.md, 
    marginTop: SPACING.sm, 
    ...CARD_SHADOW
  },
  saveButtonText: { color: COLORS.surface, fontWeight: "800", fontSize: 15 },
  
  deleteButton: { 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1, 
    borderColor: "#EF4444", 
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    borderRadius: RADIUS.md, 
    padding: SPACING.md, 
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl 
  },
  deleteButtonText: { color: "#EF4444", fontWeight: "750", fontSize: 14 },
});