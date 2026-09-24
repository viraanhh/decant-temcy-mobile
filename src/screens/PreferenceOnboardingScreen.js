import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS } from "../constants/colors";
import { updateProfile } from "../services/userService";
import { useAuth } from "../context/AuthContext";

const PREF_GENDER_OPTIONS = [
  { value: "Male", label: "Pria" },
  { value: "Female", label: "Wanita" },
  { value: "Unisex", label: "Unisex" },
];
const AROMA_OPTIONS = ["Floral", "Woody", "Citrus", "Spicy", "Aquatic", "Fresh", "Vanilla", "Musky"];
const LONGEVITY_OPTIONS = [
  { value: "<4 jam", label: "< 4 Jam" },
  { value: "4-8 jam", label: "4-8 Jam" },
  { value: ">8 jam", label: "> 8 Jam" },
];

function Chip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function PreferenceOnboardingScreen({ navigation }) {
  const { user } = useAuth();
  const [prefGender, setPrefGender] = useState("");
  const [prefAroma, setPrefAroma] = useState("");
  const [prefLongevity, setPrefLongevity] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const toggleMulti = (current, setCurrent, value) => {
    const list = current ? current.split(",") : [];
    const updated = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    setCurrent(updated.join(","));
  };

  // Screen ini cuma dicapai lewat alur Register (akun baru selalu role
  // "customer", tidak pernah "admin" lewat pendaftaran publik). Tapi tetap
  // ikut pola cek role yang sama seperti Login/GoogleLogin untuk konsistensi
  // & jaga-jaga kalau suatu saat alur ini berubah.
  const finish = () => navigation.replace(user?.role === "admin" ? "AdminTabs" : "MainTabs");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ pref_gender: prefGender, pref_aroma: prefAroma, pref_longevity: prefLongevity });
    } catch (err) {
      // gagal simpan preferensi tidak menghalangi user masuk app
    } finally {
      setIsSaving(false);
      finish();
    }
  };

  return (
    <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Kenali Selera Kamu 🌸</Text>
      <Text style={styles.subtitle}>Biar rekomendasi parfum di Beranda lebih pas buat kamu.</Text>

      <Text style={styles.label}>Gender Parfum</Text>
      <View style={styles.chipRow}>
        {PREF_GENDER_OPTIONS.map((opt) => (
          <Chip key={opt.value} label={opt.label} active={prefGender === opt.value} onPress={() => setPrefGender(opt.value)} />
        ))}
      </View>

      <Text style={styles.label}>Aroma Favorit</Text>
      <View style={styles.chipRow}>
        {AROMA_OPTIONS.map((aroma) => (
          <Chip key={aroma} label={aroma} active={prefAroma.split(",").includes(aroma)} onPress={() => toggleMulti(prefAroma, setPrefAroma, aroma)} />
        ))}
      </View>

      <Text style={styles.label}>Daya Tahan yang Disukai</Text>
      <View style={styles.chipRow}>
        {LONGEVITY_OPTIONS.map((opt) => (
          <Chip key={opt.value} label={opt.label} active={prefLongevity.split(",").includes(opt.value)} onPress={() => toggleMulti(prefLongevity, setPrefLongevity, opt.value)} />
        ))}
      </View>

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.saveButtonText}>Simpan & Mulai Belanja</Text>}
      </Pressable>

      <Pressable onPress={finish}>
        <Text style={styles.skipText}>Lewati dulu</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { color: COLORS.text, fontSize: 22, fontWeight: "700" },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 6, marginBottom: 20 },
  label: { color: COLORS.textMuted, fontSize: 12, marginTop: 16, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 12 },
  chipTextActive: { color: COLORS.text, fontWeight: "600" },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 28 },
  saveButtonText: { color: COLORS.text, fontWeight: "600" },
  skipText: { color: COLORS.textMuted, textAlign: "center", marginTop: 16, fontSize: 12 },
});