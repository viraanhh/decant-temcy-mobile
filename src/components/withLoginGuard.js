import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { LOGIN_FEATURES } from "../constants/loginFeatures";
import { useAuth } from "../context/AuthContext";

export default function withLoginGuard(Screen, featureKey = "default") {
  return function GuardedScreen(props) {
    const { user, isLoading } = useAuth();
    const cfg = LOGIN_FEATURES[featureKey] || LOGIN_FEATURES.default;

    if (isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      );
    }

    if (!user) {
      return (
        <View style={styles.center}>
          <View style={styles.iconWrap}>
            <Ionicons name={cfg.icon} size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>{cfg.title}</Text>
          <Text style={styles.message}>{cfg.message}</Text>
          <Pressable style={styles.primary} onPress={() => props.navigation.navigate("Login")}>
            <Text style={styles.primaryText}>Masuk</Text>
          </Pressable>
          <Pressable onPress={() => props.navigation.navigate("Register")} hitSlop={8} style={{ marginTop: 14 }}>
            <Text style={styles.registerText}>
              Belum punya akun? <Text style={styles.registerLink}>Daftar</Text>
            </Text>
          </Pressable>
        </View>
      );
    }

    return <Screen {...props} />;
  };
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 28 },
  iconWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: `${COLORS.primary}18`, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  title: { color: COLORS.text, fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  message: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", lineHeight: 21, marginBottom: 24 },
  primary: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 44 },
  primaryText: { color: COLORS.text, fontWeight: "700", fontSize: 14 },
  registerText: { color: COLORS.textMuted, fontSize: 12 },
  registerLink: { color: COLORS.primary, fontWeight: "700" },
});