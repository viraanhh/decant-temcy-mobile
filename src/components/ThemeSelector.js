import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, themePreference, setThemePreference } from "../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../constants/theme";
import { reloadApp } from "../utils/reloadApp";

const OPTIONS = [
  { value: "system", label: "Sistem", icon: "phone-portrait-outline" },
  { value: "light", label: "Terang", icon: "sunny-outline" },
  { value: "dark", label: "Gelap", icon: "moon-outline" },
];

export default function ThemeSelector({ style }) {
  const [selected, setSelected] = useState(themePreference);
  const [needRestart, setNeedRestart] = useState(false);

  const handlePick = (value) => {
    if (value === selected) return;
    if (!setThemePreference(value)) return;
    setSelected(value);
    // Kalau tidak bisa memuat ulang otomatis, minta pengguna membuka ulang aplikasi
    if (!reloadApp()) setNeedRestart(true);
  };

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Ionicons name="color-palette-outline" size={18} color={COLORS.textMuted} />
        <Text style={styles.title}>Tampilan</Text>
      </View>

      <View style={styles.row}>
        {OPTIONS.map((o) => {
          const active = selected === o.value;
          return (
            <Pressable
              key={o.value}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => handlePick(o.value)}
            >
              <Ionicons name={o.icon} size={20} color={active ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.hint}>Perubahan tema berlaku setelah aplikasi dimuat ulang.</Text>

      <Modal visible={needRestart} transparent animationType="fade" onRequestClose={() => setNeedRestart(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}>
              <Ionicons name="refresh-circle-outline" size={34} color={COLORS.primary} />
            </View>
            <Text style={styles.dialogTitle}>Tema tersimpan</Text>
            <Text style={styles.dialogText}>
              Tutup aplikasi sepenuhnya (geser dari daftar aplikasi terbuka), lalu buka lagi untuk melihat tampilan barunya.
            </Text>
            <Pressable style={styles.dialogButton} onPress={() => setNeedRestart(false)}>
              <Text style={styles.dialogButtonText}>Mengerti</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: 12, ...CARD_SHADOW },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  row: { flexDirection: "row", gap: 8 },
  option: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  optionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  optionText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  optionTextActive: { color: COLORS.primary, fontWeight: "700" },
  hint: { color: COLORS.textFaint, fontSize: 11 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 16 },
  dialog: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center", elevation: 8 },
  dialogIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primaryLight, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  dialogTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  dialogText: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: 20, lineHeight: 22 },
  dialogButton: { width: "100%", paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: COLORS.primary },
  dialogButtonText: { color: COLORS.onPrimary, fontWeight: "600", fontSize: 14 },
});