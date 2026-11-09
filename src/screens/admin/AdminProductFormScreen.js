import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, Image, StyleSheet, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
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

  const [initialForm] = useState({
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
  });

  const [form, setForm] = useState(initialForm);
  const [imageUri, setImageUri] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const isSavedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(initialForm) || imageUri !== null;

      if (!hasUnsavedChanges || isSavedRef.current) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Perubahan Belum Disimpan',
        'Anda memiliki perubahan yang belum disimpan. Yakin ingin kembali dan membuang perubahan?',
        [
          { text: 'Batal', style: 'cancel', onPress: () => {} },
          {
            text: 'Tetap Kembali',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, form, initialForm, imageUri]);

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
      setError("Brand, nama produk, dan harga 1ml wajib diisi!");
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

      isSavedRef.current = true;
      navigation.goBack();
    } catch (err) {
      setError(err?.response?.data?.message || "Gagal menyimpan produk");
    } finally {
      setIsSaving(false);
    }
  };

  const previewUri = imageUri || getProductImageUrl(existing?.image_filename);

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
          {/* KARTU FOTO PRODUK */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Foto Produk</Text>
            <View style={styles.imagePickerWrapper}>
              <Pressable style={styles.imagePicker} onPress={pickImage}>
                {previewUri ? (
                  <Image source={{ uri: previewUri }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholderContent}>
                    <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
                    <Text style={styles.imagePickerText}>Ketuk untuk unggah foto</Text>
                  </View>
                )}
              </Pressable>
              <Pressable style={styles.changeImageButton} onPress={pickImage}>
                <Ionicons name="image-outline" size={16} color={COLORS.primary} />
                <Text style={styles.changeImageText}>{previewUri ? "Ganti Foto" : "Pilih dari Galeri"}</Text>
              </Pressable>
            </View>
          </View>

          {/* KARTU INFORMASI UTAMA */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Informasi Utama</Text>
            
            <Text style={styles.label}>Merek / Brand Parfum <Text style={{ color: "#EF4444" }}>*</Text></Text>
            <AppTextInput style={styles.input} value={form.brand} onChangeText={(v) => setField("brand", v)} placeholder="Contoh: HMNS, Afnan" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Nama Produk <Text style={{ color: "#EF4444" }}>*</Text></Text>
            <AppTextInput style={styles.input} value={form.product_name} onChangeText={(v) => setField("product_name", v)} placeholder="Contoh: Above The Cloud" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Terinspirasi Dari (Opsional)</Text>
            <AppTextInput style={styles.input} value={form.inspirator} onChangeText={(v) => setField("inspirator", v)} placeholder="Contoh: Creed Aventus" placeholderTextColor={COLORS.textMuted} />

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
          </View>

          {/* KARTU AROMA & NOTES */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Komposisi & Aroma</Text>

            <Text style={styles.label}>Main Accords (Aroma Utama)</Text>
            <AppTextInput style={styles.input} value={form.main_accords} onChangeText={(v) => setField("main_accords", v)} placeholder="Pisahkan koma, cth: Woody, Oud, Amber" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Top Notes (Aroma Awal)</Text>
            <AppTextInput style={styles.input} value={form.top_notes} onChangeText={(v) => setField("top_notes", v)} placeholder="Contoh: Bergamot, Lemon" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Middle Notes (Aroma Tengah)</Text>
            <AppTextInput style={styles.input} value={form.middle_notes} onChangeText={(v) => setField("middle_notes", v)} placeholder="Contoh: Rose, Jasmine" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Base Notes (Aroma Dasar)</Text>
            <AppTextInput style={styles.input} value={form.base_notes} onChangeText={(v) => setField("base_notes", v)} placeholder="Contoh: Musk, Sandalwood" placeholderTextColor={COLORS.textMuted} />
          </View>

          {/* KARTU DESKRIPSI & ULASAN (Semua Menggunakan textAreaLong / Diperpanjang) */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Deskripsi</Text>

            <Text style={styles.label}>Deskripsi Produk</Text>
            <AppTextInput 
              style={[styles.input, styles.textAreaLong]} 
              value={form.description} 
              onChangeText={(v) => setField("description", v)} 
              placeholder="Ceritakan karakter, latar belakang, & kesan mendalam dari parfum ini..." 
              placeholderTextColor={COLORS.textMuted} 
              multiline 
              textAlignVertical="top" 
            />

            <Text style={styles.label}>Kelebihan / Keunggulan (Opsional)</Text>
            <AppTextInput 
              style={[styles.input, styles.textAreaLong]} 
              value={form.pros} 
              onChangeText={(v) => setField("pros", v)} 
              placeholder="Contoh: Aroma sangat awet seharian, proyeksi kuat, cocok untuk cuaca panas..." 
              placeholderTextColor={COLORS.textMuted} 
              multiline 
              textAlignVertical="top" 
            />

            <Text style={styles.label}>Kekurangan (Opsional)</Text>
            <AppTextInput 
              style={[styles.input, styles.textAreaLong]} 
              value={form.cons} 
              onChangeText={(v) => setField("cons", v)} 
              placeholder="Contoh: Semprotan pertama sedikit tajam, butuh waktu 10 menit untuk dry down yang sempurna..." 
              placeholderTextColor={COLORS.textMuted} 
              multiline 
              textAlignVertical="top" 
            />
          </View>

          {/* KARTU HARGA */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Pengaturan Harga per Ukuran (Rp)</Text>

            <View style={styles.priceGrid}>
              <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>1 ml <Text style={{ color: "#EF4444" }}>*</Text></Text>
                <AppTextInput style={styles.input} value={form.price_1ml} onChangeText={(v) => setField("price_1ml", formatNumberWithDots(v))} placeholder="0" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
              </View>
              <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>2 ml <Text style={{ color: "#EF4444" }}>*</Text></Text>
                <AppTextInput style={styles.input} value={form.price_2ml} onChangeText={(v) => setField("price_2ml", formatNumberWithDots(v))} placeholder="0" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
              </View>
              <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>3 ml <Text style={{ color: "#EF4444" }}>*</Text></Text>
                <AppTextInput style={styles.input} value={form.price_3ml} onChangeText={(v) => setField("price_3ml", formatNumberWithDots(v))} placeholder="0" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
              </View>
              <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>5 ml <Text style={{ color: "#EF4444" }}>*</Text></Text>
                <AppTextInput style={styles.input} value={form.price_5ml} onChangeText={(v) => setField("price_5ml", formatNumberWithDots(v))} placeholder="0" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
              </View>
            </View>

            <View style={styles.stockNote}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.stockNoteText}>Stok fisik per ukuran (1, 2, 3, dan 5 ml) diatur terpisah melalui menu Lainnya → Inventori.</Text>
            </View>
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable 
            style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.8 }]} 
            onPress={handleSave} 
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <>
                <Ionicons name={isEdit ? "checkmark-circle-outline" : "add-circle-outline"} size={20} color={COLORS.surface} />
                <Text style={styles.saveButtonText}>{isEdit ? "Simpan Perubahan" : "Tambahkan Produk"}</Text>
              </>
            )}
          </Pressable>
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

  imagePickerWrapper: { alignItems: "center", gap: 10, marginVertical: 4 },
  imagePicker: { 
    width: 110, 
    height: 110, 
    backgroundColor: COLORS.background, 
    borderWidth: 1.5, 
    borderColor: COLORS.border, 
    borderStyle: "dashed",
    borderRadius: RADIUS.md, 
    alignItems: "center", 
    justifyContent: "center", 
    overflow: "hidden" 
  },
  previewImage: { width: "100%", height: "100%" },
  imagePlaceholderContent: { alignItems: "center", justifyContent: "center", gap: 4 },
  imagePickerText: { color: COLORS.textMuted, fontSize: 10, textAlign: "center", fontWeight: "600" },
  
  changeImageButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 6, 
    backgroundColor: `${COLORS.primary}12`, 
    borderWidth: 1, 
    borderColor: `${COLORS.primary}30`, 
    borderRadius: RADIUS.full, 
    paddingVertical: 6,
    paddingHorizontal: 14 
  },
  changeImageText: { color: COLORS.primary, fontSize: 12, fontWeight: "700" },

  label: { color: COLORS.textMuted, fontSize: 12, marginTop: 10, marginBottom: 4, fontWeight: "600" },
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
  // KETIGA TEXTAREA MENGGUNAKAN UKURAN PANJANG YANG SAMA (180px)
  textAreaLong: { height: 180, paddingTop: 12 },
  
  stockNote: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8, 
    backgroundColor: `${COLORS.primary}08`, 
    borderWidth: 1, 
    borderColor: `${COLORS.primary}20`, 
    borderRadius: RADIUS.sm, 
    padding: SPACING.sm, 
    marginTop: SPACING.md 
  },
  stockNoteText: { flex: 1, color: COLORS.textMuted, fontSize: 11, lineHeight: 16 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  chip: { 
    backgroundColor: COLORS.background, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: RADIUS.sm, 
    paddingVertical: 8, 
    paddingHorizontal: 16,
    flexGrow: 1,
    alignItems: "center"
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: COLORS.surface, fontWeight: "700" },

  priceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  priceColumn: { width: "48%", flexGrow: 1 },
  priceLabel: { color: COLORS.text, fontSize: 12, fontWeight: "700", marginBottom: 4 },

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
    marginBottom: SPACING.xl,
    ...CARD_SHADOW
  },
  saveButtonText: { color: COLORS.surface, fontWeight: "800", fontSize: 15 },
});