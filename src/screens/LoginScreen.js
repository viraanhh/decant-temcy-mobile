import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PasswordInput from "../components/PasswordInput";
import AppTextInput from "../components/AppTextInput";
import KeyboardAvoidingScreen from "../components/KeyboardAvoidingScreen";
import { COLORS } from "../constants/colors";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Email dan password wajib diisi");
      return;
    }
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      navigation.replace(loggedInUser?.role === "admin" ? "AdminTabs" : "MainTabs");
    } catch (err) {
      setError(err.message || "Gagal login, coba lagi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingScreen contentContainerStyle={styles.container}>
      <Text style={styles.title}>Selamat Datang</Text>
      <Text style={styles.subtitle}>Masuk ke akun Decant Temcy Anda</Text>

      <View style={styles.brandBadge}>
        <Text style={styles.brandBadgeText}>DECANT TEMCY</Text>
      </View>

      <Text style={styles.label}>Email</Text>
      <AppTextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="email@contoh.com"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Password</Text>
      <PasswordInput value={password} onChangeText={setPassword} placeholder="••••••••" style={{ marginBottom: 0 }} />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleLogin} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color={COLORS.text} />
        ) : (
          <Text style={styles.buttonText}>Masuk</Text>
        )}
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>atau</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable style={styles.googleButton} onPress={() => navigation.navigate("GoogleLogin")}>
        <Image source={{ uri: "https://developers.google.com/identity/images/g-logo.png" }} style={{ width: 18, height: 18 }} />
        <Text style={styles.googleButtonText}>Lanjutkan dengan Google</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Register")}>
        <Text style={styles.linkText}>
          Belum punya akun? <Text style={{ color: COLORS.primary }}>Daftar sekarang</Text>
        </Text>
      </Pressable>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, padding: 24, justifyContent: "center" },
  title: { color: COLORS.text, fontSize: 24, fontWeight: "600", marginBottom: 4 },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginBottom: 24 },
  brandBadge: { alignSelf: "center", marginBottom: 20 },
  brandBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  label: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
  },
  errorText: { color: COLORS.primary, fontSize: 12, marginTop: 10 },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: { color: COLORS.text, fontWeight: "600" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textFaint, fontSize: 11 },
  googleButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#ffffff", borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 14 },
  googleButtonText: { color: "#1f1f1f", fontWeight: "600", fontSize: 13 },
  linkText: { color: COLORS.textMuted, textAlign: "center", marginTop: 18, fontSize: 13 },
});