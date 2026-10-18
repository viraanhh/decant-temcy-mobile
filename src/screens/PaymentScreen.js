import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import * as Clipboard from "expo-clipboard";
import { COLORS } from "../constants/colors";
import { createPayment, getOrderById } from "../services/orderService";

const POLL_INTERVAL_MS = 3000;

export default function PaymentScreen({ route, navigation }) {
  const { orderId } = route.params;

  const [redirectUrl, setRedirectUrl] = useState(null);
  const [midtransOrderId, setMidtransOrderId] = useState(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    prepareSnap();
    return () => clearInterval(pollRef.current);
  }, []);

  const prepareSnap = async () => {
    setIsPreparing(true);
    setError("");
    try {
      const { redirect_url, midtrans_order_id } = await createPayment(orderId);
      if (!redirect_url) {
        setError("Backend tidak mengembalikan redirect_url pembayaran.");
        return;
      }
      setRedirectUrl(redirect_url);
      setMidtransOrderId(midtrans_order_id);
      startPolling();
    } catch (err) {
      setError(err?.response?.data?.message || "Gagal membuat pembayaran, coba lagi");
    } finally {
      setIsPreparing(false);
    }
  };

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const order = await getOrderById(orderId);
        if (order.status !== "pending") {
          clearInterval(pollRef.current);
          navigation.replace("OrderSuccess", { order });
        }
      } catch (err) {
      }
    }, POLL_INTERVAL_MS);
  };

  const handleCheckManually = async () => {
    setIsChecking(true);
    try {
      const order = await getOrderById(orderId);
      if (order.status !== "pending") {
        clearInterval(pollRef.current);
        navigation.replace("OrderSuccess", { order });
      } else {
        setError("Pembayaran belum terdeteksi. Selesaikan dulu di halaman Midtrans di atas.");
      }
    } catch (err) {
      setError("Gagal mengecek status, coba lagi");
    } finally {
      setIsChecking(false);
    }
  };

  if (isPreparing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Menyiapkan halaman pembayaran...</Text>
      </View>
    );
  }

  if (error && !redirectUrl) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={prepareSnap}>
          <Text style={styles.retryButtonText}>Coba Lagi</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: redirectUrl }}
        style={{ flex: 1 }}
        startInLoadingState
        scalesPageToFit
        javaScriptEnabled
        domStorageEnabled
      />

      <View style={styles.footer}>
        {!!error && <Text style={styles.errorTextSmall}>{error}</Text>}
        
        {!!midtransOrderId && (
          <Pressable
            style={styles.simulatorHint}
            onPress={async () => {
              await Clipboard.setStringAsync(midtransOrderId);
              alert(`Order ID disalin: ${midtransOrderId}\n\nBuka simulator.sandbox.midtrans.com di browser, cari transaksi ini, pilih QRIS, lalu Pay.`);
            }}
          >
            <Text style={styles.simulatorHintText}>🧪 [Testing] Salin Order ID untuk Simulator</Text>
          </Pressable>
        )}

        <Pressable style={styles.checkButton} onPress={handleCheckManually} disabled={isChecking}>
          {isChecking ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <Text style={styles.checkButtonText}>Saya Sudah Bayar, Cek Status</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { color: COLORS.textMuted, fontSize: 12, marginTop: 12 },
  errorText: { color: COLORS.primary, fontSize: 13, textAlign: "center", marginBottom: 16 },
  errorTextSmall: { color: COLORS.primary, fontSize: 11, textAlign: "center", marginBottom: 8 },
  retryButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryButtonText: { color: COLORS.primary, fontWeight: "600" },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  checkButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center" },
  checkButtonText: { color: COLORS.text, fontWeight: "600" },
  simulatorHint: { padding: 10, alignItems: "center", marginBottom: 8 },
  simulatorHintText: { color: COLORS.warning, fontSize: 11 },
});