import { useState } from "react";
import { View, Text, ScrollView, Pressable, Image, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS } from "../../constants/theme";
import { createAdminProduct, updateAdminProduct } from "../../services/adminService";
import { getProductImageUrl } from "../../constants/api";
import AppTextInput from "../../components/AppTextInput";

const GENDER_OPTIONS = ["Male", "Female", "Unisex"];
const CONCENTRATION_OPTIONS = ["EDP", "EDT", "Extrait"];

function formatNumberWithDots(value) {
  if (!value) return "";
  const numbersOnly = value.toString().replace(/\D/g, "");
  return numbersOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseFormattedNumber(value) {
  if (!value) return "";
  return value.toString().replace(/\./g, "");
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function AdminProductFormScreen({ route, navigation }) {
  const existing = route?.params?.product;
  const isEdit = !!existing;

  const [form, setForm] = useState({
    brand: existing?.brand || "",
    product_name: existing?.product_name || "",
    inspirator: existing?.inspirator || "",
    concentration: existing?.concentration || "EDP",
    gender: existing?.gender || "Unisex",
    main_accords: existing?.main_accords || "",
    top_notes: existing?.top_notes || "",
    middle_notes: existing?.middle_notes || "",
    base_notes: existing?.base_notes || "",
    description: existing?.description || "",
    pros: existing?.pros || "",
    cons: existing?.cons || "",
    price_1ml: existing?.price_1ml ? formatNumberWithDots(existing.price_1ml) : "",
    price_2ml: existing?.variants?.find((v) => v.size_ml === 2)?.price ? formatNumberWithDots(existing.variants.find((v) => v.size_ml === 2).price) : "",
    price_3ml: existing?.variants?.find((v) => v.size_ml === 3)?.price ? formatNumberWithDots(existing.variants.find((v) => v.size_ml === 3).price) : "",
    price_5ml: existing?.variants?.find((v) => v.size_ml === 5)?.price ? formatNumberWithDots(existing.variants.find((v) => v.size_ml === 5).price) : "",
    stock_ml: existing?.stock_ml ? String(existing.stock_ml) : "",
  });
  const [imageUri, setImageUri] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    setError("");
    if (!form.brand || !form.product_name || !form.price_1ml) {
      setError("Brand, nama produk, dan harga 1ml wajib diisi");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        price_1ml: parseFormattedNumber(form.price_1ml),
        price_2ml: parseFormattedNumber(form.price_2ml),
        price_3ml: parseFormattedNumber(form.price_3ml),
        price_5ml: parseFormattedNumber(form.price_5ml),
      };

      const productId = existing?.product_id || existing?.id;
      if (isEdit) {
        await updateAdminProduct(productId, payload, imageUri);
      } else {
        await createAdminProduct(payload, imageUri);
      }
      navigation.goBack();
    } catch (err) {
      setError(err?.response?.data?.message || "Gagal menyimpan produk");
    } finally {
      setIsSaving(false);
    }
  };

  const previewUri = imageUri || getProductImageUrl(existing?.image_filename);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: SPACING.lg, gap: 10 }} keyboardDismissMode="on-drag">
        <Pressable style={styles.imagePicker} onPress={pickImage}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={28} color={COLORS.textFaint} />
              <Text style={styles.imagePickerText}>Pilih Foto Produk</Text>
            </>
          )}
        </Pressable>

        <Pressable style={styles.changeImageButton} onPress={pickImage}>
          <Ionicons name="image-outline" size={16} color={COLORS.primary} />
          <Text style={styles.changeImageText}>{previewUri ? "Ganti Foto Produk" : "Unggah Foto"}</Text>
        </Pressable>

        <Text style={styles.label}>Merek/Brand Parfum</Text>
        <AppTextInput style={styles.input} value={form.brand} onChangeText={(v) => setField("brand", v)} placeholder="Contoh: HMNS, Afnan" />

        <Text style={styles.label}>Nama Produk</Text>
        <AppTextInput style={styles.input} value={form.product_name} onChangeText={(v) => setField("product_name", v)} placeholder="Contoh: Above The Cloud" />

        <Text style={styles.label}>Terinspirasi Dari (Opsional)</Text>
        <AppTextInput style={styles.input} value={form.inspirator} onChangeText={(v) => setField("inspirator", v)} placeholder="Contoh: Creed Aventus" />

        <Text style={styles.label}>Konsentrasi</Text>
        <View style={styles.chipRow}>
          {CONCENTRATION_OPTIONS.map((c) => (
            <Chip key={c} label={c} active={form.concentration === c} onPress={() => setField("concentration", c)} />
          ))}
        </View>

        <Text style={styles.label}>Gender</Text>
        <View style={styles.chipRow}>
          {GENDER_OPTIONS.map((g) => (
            <Chip key={g} label={g} active={form.gender === g} onPress={() => setField("gender", g)} />
          ))}
        </View>

        <Text style={styles.label}>Main Accords (Aroma Utama)</Text>
        <AppTextInput style={styles.input} value={form.main_accords} onChangeText={(v) => setField("main_accords", v)} placeholder="Pisahkan dengan koma, contoh: Woody, Oud, Amber" />

        <Text style={styles.label}>Top Notes (Aroma Awal, Tercium Pertama)</Text>
        <AppTextInput style={styles.input} value={form.top_notes} onChangeText={(v) => setField("top_notes", v)} placeholder="Contoh: Bergamot, Lemon" />

        <Text style={styles.label}>Middle Notes (Aroma Inti/Jantung)</Text>
        <AppTextInput style={styles.input} value={form.middle_notes} onChangeText={(v) => setField("middle_notes", v)} placeholder="Contoh: Rose, Jasmine" />

        <Text style={styles.label}>Base Notes (Aroma Dasar, Bertahan Lama)</Text>
        <AppTextInput style={styles.input} value={form.base_notes} onChangeText={(v) => setField("base_notes", v)} placeholder="Contoh: Musk, Sandalwood" />

        <Text style={styles.label}>Deskripsi Produk</Text>
        <AppTextInput style={[styles.input, styles.textArea]} value={form.description} onChangeText={(v) => setField("description", v)} placeholder="Ceritakan karakter & kesan parfum ini..." multiline textAlignVertical="top" />

        <Text style={styles.label}>Kelebihan / Keunggulan (Opsional)</Text>
        <AppTextInput style={[styles.input, styles.textArea]} value={form.pros} onChangeText={(v) => setField("pros", v)} placeholder="Contoh: Aroma sangat awet seharian, cocok untuk cuaca panas..." multiline textAlignVertical="top" />

        <Text style={styles.label}>Kekurangan (Opsional)</Text>
        <AppTextInput style={[styles.input, styles.textArea]} value={form.cons} onChangeText={(v) => setField("cons", v)} placeholder="Contoh: Wangi semprotan pertama sedikit tajam..." multiline textAlignVertical="top" />

        <Text style={styles.label}>Harga per Ukuran (Rp)</Text>
        <View style={styles.priceRow}>
          <AppTextInput style={[styles.input, styles.priceInput]} value={form.price_1ml} onChangeText={(v) => setField("price_1ml", formatNumberWithDots(v))} placeholder="1ml" keyboardType="number-pad" />
          <AppTextInput style={[styles.input, styles.priceInput]} value={form.price_2ml} onChangeText={(v) => setField("price_2ml", formatNumberWithDots(v))} placeholder="2ml" keyboardType="number-pad" />
          <AppTextInput style={[styles.input, styles.priceInput]} value={form.price_3ml} onChangeText={(v) => setField("price_3ml", formatNumberWithDots(v))} placeholder="3ml" keyboardType="number-pad" />
          <AppTextInput style={[styles.input, styles.priceInput]} value={form.price_5ml} onChangeText={(v) => setField("price_5ml", formatNumberWithDots(v))} placeholder="5ml" keyboardType="number-pad" />
        </View>

        <Text style={styles.label}>Stok Total (dalam ml, dipakai bersama semua ukuran)</Text>
        <View style={styles.inputWithSuffixContainer}>
          <AppTextInput 
            style={[styles.input, styles.inputWithoutBorder]} 
            value={form.stock_ml} 
            onChangeText={(v) => setField("stock_ml", v)} 
            placeholder="Contoh: 150" 
            keyboardType="number-pad" 
          />
          <Text style={styles.inlineSuffix}>ml</Text>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.saveButtonText}>{isEdit ? "Simpan Perubahan" : "Tambah Produk"}</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  imagePicker: { height: 140, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  previewImage: { width: "100%", height: "100%" },
  imagePickerText: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
  changeImageButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10 },
  changeImageText: { color: COLORS.primary, fontSize: 12, fontWeight: "600" },
  label: { color: COLORS.textMuted, fontSize: 12, marginTop: 6 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text },
  textArea: { height: 140, paddingTop: 12 },
  
  inputWithSuffixContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingRight: 14,
  },
  inputWithoutBorder: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  inlineSuffix: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 12 },
  chipTextActive: { color: COLORS.text, fontWeight: "600" },
  priceRow: { flexDirection: "row", gap: 8 },
  priceInput: { flex: 1 },
  errorText: { color: COLORS.primary, fontSize: 12 },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 10, marginBottom: 20 },
  saveButtonText: { color: COLORS.text, fontWeight: "600" },
});