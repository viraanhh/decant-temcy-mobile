import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import * as Haptics from "expo-haptics"; // <-- IMPORT HAPTICS

export default function OrderSuccessScreen({ route, navigation }) {
  const { order } = route.params;
  const [countdown, setCountdown] = useState(8);

  const goHome = () => navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });

  // Getar sukses sekali saat screen ini terbuka
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      goHome();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 56 }}>✅</Text>
      <Text style={styles.title}>Pembayaran Berhasil!</Text>
      <Text style={styles.subtitle}>Pesanan {order.orderNumber} sedang diproses</Text>

      <Pressable style={styles.button} onPress={goHome}>
        <Text style={styles.buttonText}>Kembali ke Beranda ({countdown})</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: "700", marginTop: 16 },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 6 },
  button: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, paddingHorizontal: 24, marginTop: 32 },
  buttonText: { color: COLORS.text, fontWeight: "600" },
});