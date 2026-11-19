import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import * as Haptics from "expo-haptics";

export default function OrderSuccessScreen({ route, navigation }) {
  const { order } = route.params;
  const [countdown, setCountdown] = useState(8);

  const orderId = order?.id ?? order?.order_id;
  const orderCode = order?.orderNumber ?? order?.order_code ?? "";

  const goToOrderDetail = useCallback(() => {
    if (!orderId) {
      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
      return;
    }

    navigation.reset({
      index: 2,
      routes: [
        { name: "MainTabs" },
        { name: "OrderHistory" },
        { name: "OrderDetail", params: { orderId } },
      ],
    });
  }, [navigation, orderId]);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      goToOrderDetail();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, goToOrderDetail]);

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 56 }}>✅</Text>
      <Text style={styles.title}>Pembayaran Berhasil!</Text>
      <Text style={styles.subtitle}>Pesanan {orderCode} sedang diproses</Text>

      <Pressable style={styles.button} onPress={goToOrderDetail}>
        <Text style={styles.buttonText}>Lihat Detail Pesanan ({countdown})</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: "700", marginTop: 16 },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 6 },
  button: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, paddingHorizontal: 24, marginTop: 32 },
  buttonText: { color: COLORS.onPrimary, fontWeight: "600" },
});