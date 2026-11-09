import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { SPACING, RADIUS } from "../constants/theme";
import { forgotPassword } from "../services/authService";
import AppTextInput from "../components/AppTextInput";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    const value = email.trim();
    if (!value || !value.includes("@")) {
      Alert.alert("Error", "Masukkan email yang valid");
      return;
    }
    setIsSending(true);
    try {
      await forgotPassword(value);
      setSent(true);
    } catch (err) {
      Alert.alert("Error", err.message || "Gagal mengirim email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="mail-outline" size={34} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Lupa Password?</Text>
        <Text style={styles.desc}>
          Masukkan email akunmu. Jika terdaftar, kami kirim link dan kode reset yang berlaku 1 jam.
        </Text>

        <Text style={styles.label}>Email</Text>
        <AppTextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Pressable style={styles.button} onPress={handleSend} disabled={isSending}>
          {isSending ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.buttonText}>Kirim Kode Reset</Text>}
        </Pressable>

        {sent && (
          <View style={styles.notice}>
            <Ionicons name="checkmark-circle" size={18} color="#3DBA6C" />
            <Text style={styles.noticeText}>
              Jika email terdaftar, pesan reset sudah dikirim. Cek juga folder spam.
            </Text>
          </View>
        )}

        <Pressable style={styles.linkButton} onPress={() => navigation.navigate("ResetPassword")}>
          <Text style={styles.linkText}>Saya sudah punya kode</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${COLORS.primary}18`, alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: SPACING.md },
  title: { color: COLORS.text, fontSize: 20, fontWeight: "700", textAlign: "center" },
  desc: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", lineHeight: 19 },
  label: { color: COLORS.textMuted, fontSize: 12, marginTop: 6 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text },
  button: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: SPACING.sm },
  buttonText: { color: COLORS.text, fontWeight: "700" },
  notice: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#3DBA6C15", borderRadius: RADIUS.md, padding: SPACING.md },
  noticeText: { flex: 1, color: COLORS.text, fontSize: 12, lineHeight: 17 },
  linkButton: { alignItems: "center", padding: SPACING.sm },
  linkText: { color: COLORS.primary, fontWeight: "700", fontSize: 13 },
});