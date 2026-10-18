import { View, Text, Pressable, StyleSheet, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { SPACING, RADIUS } from "../constants/theme";

export default function AboutScreen() {
  const openLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Gagal", "Tidak dapat membuka tautan ini di perangkat Anda.");
      }
    } catch (error) {
      console.error("Error opening link:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>DECANT TEMCY</Text>
        <Text style={styles.description}>
          Marketplace parfum decant premium. Temukan signature scent kamu tanpa risiko blind buy.
          Tersedia dalam ukuran 1ml, 2ml, 3ml, dan 5ml.
        </Text>

        <View style={styles.badge}>
          <Text style={styles.badgeTitle}>ORIGINAL 100%</Text>
          <Text style={styles.badgeText}>Semua produk terjamin keasliannya</Text>
        </View>

        <Text style={styles.sectionLabel}>Hubungi Kami</Text>
        <View style={styles.socialRow}>
          {/* INSTAGRAM */}
          <Pressable 
            style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]} 
            onPress={() => openLink("https://www.instagram.com/decant.temcy")}
          >
            <Ionicons name="logo-instagram" size={18} color={COLORS.textMuted} />
          </Pressable>

          {/* TIKTOK */}
          <Pressable 
            style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]} 
            onPress={() => openLink("https://www.tiktok.com/@decant.temcy")}
          >
            <Ionicons name="logo-tiktok" size={18} color={COLORS.textMuted} />
          </Pressable>

          {/* WHATSAPP*/}
          <Pressable 
            style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]} 
            onPress={() => openLink("https://wa.me/6285128061012")}
          >
            <Ionicons name="logo-whatsapp" size={18} color={COLORS.textMuted} />
          </Pressable>
        </View>

        <Text style={styles.copyright}>© 2026 Decant Temcy. All rights reserved.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg },
  title: { color: COLORS.text, fontSize: 20, fontWeight: "800", letterSpacing: 1 },
  description: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginTop: 12 },
  badge: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 14, marginTop: 20 },
  badgeTitle: { color: COLORS.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  badgeText: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  sectionLabel: { color: COLORS.textMuted, fontSize: 11, textTransform: "uppercase", marginTop: 28, marginBottom: 10 },
  socialRow: { flexDirection: "row", gap: 10 },
  socialButton: { 
    width: 44, 
    height: 44, 
    borderRadius: RADIUS.sm, 
    backgroundColor: COLORS.surface, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  socialButtonPressed: {
    backgroundColor: COLORS.surfaceLight,
    opacity: 0.7,
  },
  copyright: { color: COLORS.textFaint, fontSize: 11, marginTop: 40, textAlign: "center" },
});