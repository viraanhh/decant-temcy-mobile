import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import {
  getSystemConfigs, updateSystemConfigs, testSmtpConnection, testAiConnection,
} from "../../services/adminService";
import AppTextInput from "../../components/AppTextInput";

const SECTIONS = [
  {
    title: "Email Service (SMTP)", 
    icon: "mail-outline", 
    color: "#3B82F6",
    test: "smtp",
    items: [
      { key: "SMTP_HOST", label: "SMTP Host", placeholder: "smtp.gmail.com" },
      { key: "SMTP_PORT", label: "SMTP Port", placeholder: "587", keyboardType: "numeric" },
      { key: "SMTP_USER", label: "Email Pengirim", placeholder: "email@domain.com", keyboardType: "email-address" },
      { key: "SMTP_PASS", label: "App Password", secret: true, placeholder: "••••••••" },
    ],
  },
  {
    title: "Google OAuth", 
    icon: "logo-google", 
    color: "#EF4444",
    items: [
      { key: "GOOGLE_CLIENT_ID", label: "Google Client ID", placeholder: "xxxx.apps.googleusercontent.com" },
      { key: "GOOGLE_CLIENT_SECRET", label: "Google Client Secret", secret: true, placeholder: "••••••••" },
    ],
  },
  {
    title: "AI Service (Gemini)", 
    icon: "hardware-chip-outline", 
    color: "#8B5CF6",
    test: "ai",
    items: [{ key: "GEMINI_API_KEY", label: "Gemini API Key", secret: true, placeholder: "••••••••" }],
  },
];

export default function SysAdminConfigScreen() {
  const [form, setForm] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testing, setTesting] = useState(null);

  const load = useCallback(() => {
    setIsLoading(true);
    getSystemConfigs()
      .then(setForm)
      .catch((e) => Alert.alert("Gagal", e.message || "Gagal memuat konfigurasi sistem"))
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(load);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateSystemConfigs(form);
      Alert.alert("Sukses Menyimpan", res.message || "Konfigurasi sistem berhasil diperbarui.");
      load();
    } catch (err) {
      Alert.alert("Gagal Menyimpan", err.message || "Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async (type) => {
    setTesting(type);
    try {
      const res = type === "smtp" ? await testSmtpConnection() : await testAiConnection();
      Alert.alert("Uji Koneksi Berhasil", res.message || "Layanan terhubung dengan baik.");
    } catch (err) {
      Alert.alert("Koneksi Gagal", err.message || "Tidak dapat terhubung ke layanan.");
    } finally {
      setTesting(null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Memuat konfigurasi keamanan...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 140 }}
      >
        <View style={styles.headerBox}>
          <Text style={styles.title}>Konfigurasi API</Text>
          <Text style={styles.subtitle}>
            Data kunci rahasia (Secret / Password) disembunyikan sebagai keamanan. 
            Biarkan kosong jika Anda tidak ingin mengubahnya.
          </Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconBox, { backgroundColor: `${section.color}15` }]}>
                <Ionicons name={section.icon} size={18} color={section.color} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            <View style={styles.formArea}>
              {section.items.map((item) => (
                <View key={item.key} style={styles.inputGroup}>
                  <Text style={styles.label}>{item.label}</Text>
                  <AppTextInput
                    style={styles.input}
                    value={form[item.key] || ""}
                    onChangeText={(v) => setField(item.key, v)}
                    placeholder={item.placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!!item.secret && (!form[item.key] || form[item.key] === "")}
                    keyboardType={item.keyboardType}
                    autoCapitalize="none"
                  />
                </View>
              ))}
            </View>

            {!!section.test && (
              <View style={styles.testContainer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.testButton, 
                    pressed && { opacity: 0.8 },
                    testing === section.test && styles.testButtonActive
                  ]}
                  onPress={() => handleTest(section.test)}
                  disabled={testing !== null}
                >
                  {testing === section.test ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Ionicons name="pulse" size={16} color={COLORS.primary} />
                      <Text style={styles.testButtonText}>Uji Konektivitas {section.title.split(" ")[0]}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        ))}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.textMuted} />
          <Text style={styles.infoText}>
            Fitur uji konektivitas menggunakan data yang sudah tersimpan di database. Simpan perubahan Anda sebelum melakukan pengujian.
          </Text>
        </View>
      </ScrollView>

      {/* FLOATING ACTION BAR */}
      <View style={styles.floatingBar} pointerEvents="box-none">
        <Pressable 
          style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]} 
          onPress={handleSave} 
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={COLORS.surface} />
              <Text style={styles.saveButtonText}>Simpan Konfigurasi</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background, gap: 12 },
  loadingText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  
  headerBox: { paddingBottom: 8 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20 },
  
  sectionCard: { 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    ...CARD_SHADOW 
  },
  sectionHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12, 
    padding: SPACING.md, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  iconBox: { width: 34, height: 34, borderRadius: RADIUS.sm, alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: COLORS.text, fontWeight: "800", fontSize: 15 },
  
  formArea: { padding: SPACING.md, gap: 16 },
  inputGroup: { gap: 6 },
  label: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  input: { 
    backgroundColor: COLORS.background, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: RADIUS.sm, 
    paddingHorizontal: 14,
    paddingVertical: 12, 
    color: COLORS.text,
    fontSize: 14,
  },
  
  testContainer: { 
    paddingHorizontal: SPACING.md, 
    paddingBottom: SPACING.md, 
    paddingTop: 4 
  },
  testButton: { 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1, 
    borderColor: COLORS.border, 
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm, 
    paddingVertical: 12, 
  },
  testButtonActive: { backgroundColor: `${COLORS.primary}10`, borderColor: `${COLORS.primary}30` },
  testButtonText: { color: COLORS.primary, fontWeight: "750", fontSize: 13 },
  
  infoBox: { flexDirection: "row", gap: 10, padding: SPACING.md, backgroundColor: "rgba(0,0,0,0.03)", borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  infoText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, flex: 1 },

  floatingBar: { 
    position: "absolute", 
    left: 0, 
    right: 0, 
    bottom: 0, 
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 30 : SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: { 
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: COLORS.primary, 
    borderRadius: RADIUS.md, 
    paddingVertical: 16, 
    alignItems: "center", 
    gap: 8,
    elevation: 4, 
    shadowColor: COLORS.primary, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8 
  },
  saveButtonText: { color: COLORS.surface, fontWeight: "800", fontSize: 15, letterSpacing: 0.5 },
});