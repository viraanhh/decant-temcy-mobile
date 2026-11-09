import { View, Text, Pressable, StyleSheet, Linking, Alert, ScrollView } from "react-native";
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Brand Header Icon / Logo Card */}
        <View style={styles.brandHeader}>
          <View style={styles.logoCircle}>
            <Ionicons name="sparkles" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>DECANT TEMCY</Text>
          <Text style={styles.subtitle}>Eksplorasi Aroma Impianmu</Text>
        </View>

        {/* Main Description Card */}
        <View style={styles.card}>
          <Text style={styles.description}>
            Marketplace parfum decant premium terpercaya. Temukan signature scent kamu tanpa risiko blind buy. 
            Tersedia dalam pilihan ukuran praktis mulai dari 1ml, 2ml, 3ml, hingga 5ml.
          </Text>

          {/* Guarantee Badge inside Card */}
          <View style={styles.badge}>
            <View style={styles.badgeIconWrapper}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.badgeTitle}>ORIGINAL 100%</Text>
              <Text style={styles.badgeText}>Semua produk dijamin keasliannya langsung dari botol authentic.</Text>
            </View>
          </View>
        </View>

        {/* Social Media Section */}
        <View style={styles.socialSection}>
          <Text style={styles.sectionLabel}>Terhubung Dengan Kami</Text>
          <View style={styles.socialRow}>
            
            {/* INSTAGRAM */}
            <Pressable 
              style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]} 
              onPress={() => openLink("https://www.instagram.com/decant.temcy")}
            >
              <Ionicons name="logo-instagram" size={20} color={COLORS.primary} />
              <Text style={styles.socialText}>Instagram</Text>
            </Pressable>

            {/* TIKTOK */}
            <Pressable 
              style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]} 
              onPress={() => openLink("https://www.tiktok.com/@decant.temcy")}
            >
              <Ionicons name="logo-tiktok" size={20} color={COLORS.primary} />
              <Text style={styles.socialText}>TikTok</Text>
            </Pressable>

            {/* WHATSAPP */}
            <Pressable 
              style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]} 
              onPress={() => openLink("https://wa.me/6285128061012")}
            >
              <Ionicons name="logo-whatsapp" size={20} color={COLORS.primary} />
              <Text style={styles.socialText}>WhatsApp</Text>
            </Pressable>

          </View>
        </View>

        {/* Copyright */}
        <Text style={styles.copyright}>© 2026 Decant Temcy. All rights reserved.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },

  // Brand Header
  brandHeader: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 24,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  title: { 
    color: COLORS.text, 
    fontSize: 22, 
    fontWeight: "800", 
    letterSpacing: 1.5,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },

  // Card Content
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md ? RADIUS.md * 1.5 : 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 24,
  },
  description: { 
    color: COLORS.textMuted, 
    fontSize: 14, 
    lineHeight: 22, 
  },

  // Badge inside card
  badge: { 
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: RADIUS.md, 
    padding: 12, 
    marginTop: 16,
    gap: 12,
  },
  badgeIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTitle: { 
    color: COLORS.primary, 
    fontSize: 12, 
    fontWeight: "800", 
    letterSpacing: 0.5,
  },
  badgeText: { 
    color: COLORS.textMuted, 
    fontSize: 12, 
    marginTop: 2,
    lineHeight: 16,
  },

  // Social Section
  socialSection: {
    marginTop: 8,
  },
  sectionLabel: { 
    color: COLORS.textMuted, 
    fontSize: 11, 
    textTransform: "uppercase", 
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 12, 
  },
  socialRow: { 
    flexDirection: "column", 
    gap: 10,
  },
  socialButton: { 
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: RADIUS.md, 
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  socialButtonPressed: {
    backgroundColor: COLORS.surfaceLight,
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  socialText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },

  // Copyright
  copyright: { 
    color: COLORS.textFaint, 
    fontSize: 12, 
    marginTop: 36, 
    textAlign: "center", 
  },
});