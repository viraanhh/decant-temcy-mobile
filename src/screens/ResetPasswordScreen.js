import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { SPACING } from "../constants/theme";
import { resetPassword } from "../services/authService";
import AppTextInput from "../components/AppTextInput";

// Terima kode polos ATAU link lengkap dari email (ambil nilai setelah "token=")
const extractToken = (raw) => {
  const text = (raw || "").trim();
  const match = text.match(/token=([A-Za-z0-9]+)/);
  return match ? match[1] : text;
};

export default function ResetPasswordScreen({ navigation }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleReset = async () => {
    const token = extractToken(code);
    if (!token) {
      Alert.alert("Error", "Kode reset wajib diisi");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password baru minimal 6 karakter");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Error", "Konfirmasi password tidak sama");
      return;
    }

    setIsSaving(true);
    try {
      const res = await resetPassword(token, password);
      Alert.alert("Berhasil", res.message || "Password berhasil direset. Silakan login.", [
        { text: "Ke Halaman Masuk", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (err) {
      Alert.alert("Error", err.message || "Gagal mereset password");
    } finally {
      setIsSaving(false);
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
          <Ionicons name="key-outline" size={34} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.desc}>
          Tempel kode dari email (atau seluruh link-nya), lalu buat password baru.
        </Text>

        <Text style={styles.label}>Kode Reset</Text>
        <AppTextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="Tempel kode atau link dari email"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Password Baru</Text>
        <AppTextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Min. 6 karakter"
          secureTextEntry
        />

        <Text style={styles.label}>Konfirmasi Password</Text>
        <AppTextInput
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Ulangi password baru"
          secureTextEntry
        />

        <Pressable style={styles.button} onPress={handleReset} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.buttonText}>Simpan Password Baru</Text>}
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
});