import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Share, Modal, BackHandler } from "react-native";
import { WebView } from "react-native-webview";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { createPayment, getOrderById, getPaymentStatus } from "../services/orderService";

const POLL_INTERVAL_MS = 3000;
const FINISH_HOST = "decanttemcy.app/payment/finish"; // harus sama dengan PAYMENT_FINISH_URL di backend
const PAID_STATUSES = ["paid", "processing", "shipped", "delivered"];

// Tangkap URL gambar QR langsung dari halaman Midtrans
const QR_SNIFFER = `
(function () {
  if (window.__qrSniffer) return;
  window.__qrSniffer = true;
  var last = '';
  setInterval(function () {
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var s = imgs[i].src || '';
      if (/qr-code/i.test(s) && s !== last) {
        last = s;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'qr', url: s }));
      }
    }
  }, 1500);
})();
true;
`;

const TONES = {
  danger: { color: "#FF4B4B", icon: "close-circle-outline" },
  warning: { color: "#f59e0b", icon: "alert-circle-outline" },
  success: { color: "#3DBA6C", icon: "checkmark-circle-outline" },
};

export default function PaymentScreen({ route, navigation }) {
  const { orderId, fromOrder } = route.params;

  const [redirectUrl, setRedirectUrl] = useState(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [expired, setExpired] = useState(false);

  const [qrUrl, setQrUrl] = useState("");
  const [savingQr, setSavingQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dialog, setDialog] = useState({ visible: false });

  const pollRef = useRef(null);
  const busyRef = useRef(false);
  const qrFromWebRef = useRef(false);

  const openDialog = (cfg) => setDialog({ visible: true, tone: "warning", confirmText: "Mengerti", ...cfg });
  const closeDialog = () => setDialog((d) => ({ ...d, visible: false }));

  const goToOrder = () => {
    if (fromOrder && navigation.canGoBack()) navigation.goBack();
    else navigation.replace("OrderDetail", { orderId });
  };

  const requestClose = () =>
    openDialog({
      tone: "warning",
      icon: "exit-outline",
      title: "Keluar dari pembayaran?",
      message:
        "Pesananmu tetap menunggu pembayaran. Kamu bisa melanjutkannya dari Detail Pesanan dengan tombol Lanjutkan Pembayaran.",
      confirmText: "Keluar",
      cancelText: "Tetap di sini",
      onConfirm: goToOrder,
    });

  // Tombol X native di header + cegah keluar tanpa konfirmasi (gestur iOS dan tombol back Android)
  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerRight: () => (
        <Pressable onPress={requestClose} hitSlop={12} style={{ paddingHorizontal: 6 }}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </Pressable>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      requestClose();
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    prepareSnap();
    return () => clearInterval(pollRef.current);
  }, []);

  // Satu pemeriksaan: tanya Midtrans lewat backend, lalu baca status pesanan terbaru
  const evaluate = async () => {
    const statusRes = await getPaymentStatus(orderId);
    if (statusRes?.qr_url && !qrFromWebRef.current) setQrUrl(statusRes.qr_url);

    const order = await getOrderById(orderId);
    if (PAID_STATUSES.includes(order.status)) {
      clearInterval(pollRef.current);
      navigation.replace("OrderSuccess", { order });
      return "paid";
    }
    if (order.status === "cancelled") {
      clearInterval(pollRef.current);
      setExpired(true);
      return "cancelled";
    }
    return "pending";
  };

  const prepareSnap = async () => {
    setIsPreparing(true);
    setError("");
    setExpired(false);
    try {
      const { redirect_url } = await createPayment(orderId);
      if (!redirect_url) {
        setError("Halaman pembayaran belum tersedia, coba lagi.");
        return;
      }
      setRedirectUrl(redirect_url);
      startPolling();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Gagal membuat pembayaran, coba lagi";
      // Pesanan sudah dibayar atau dibatalkan: tampilkan statusnya, bukan layar error
      try {
        const order = await getOrderById(orderId);
        if (PAID_STATUSES.includes(order.status)) {
          navigation.replace("OrderSuccess", { order });
          return;
        }
        if (order.status === "cancelled") {
          setExpired(true);
          return;
        }
      } catch {}
      setError(msg);
    } finally {
      setIsPreparing(false);
    }
  };

  const startPolling = () => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        await evaluate();
      } catch {
        // abaikan gangguan jaringan sesaat saat polling
      } finally {
        busyRef.current = false;
      }
    }, POLL_INTERVAL_MS);
  };

  const handleCheckManually = async () => {
    setIsChecking(true);
    setError("");
    setInfo("");
    try {
      const result = await evaluate();
      if (result === "pending") {
        setInfo("Pembayaran belum terdeteksi. Selesaikan dulu pembayaran di halaman Midtrans di atas.");
      }
    } catch {
      setError("Gagal mengecek status, coba lagi");
    } finally {
      setIsChecking(false);
    }
  };

  // Halaman Midtrans mengarah ke finish_url: tahan halamannya, beri tahu pengguna, lalu cek status
  const handleShouldStart = (request) => {
    if (request.url.includes(FINISH_HOST)) {
      setInfo("Memeriksa status pembayaran…");
      handleCheckManually();
      return false;
    }
    return true;
  };

  const handleWebMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "qr" && msg.url) {
        qrFromWebRef.current = true;
        setQrUrl(msg.url);
      }
    } catch {}
  };

  // Unduh gambar QRIS lalu buka menu bagikan (di situ ada "Simpan ke galeri")
  const saveQr = async (url = qrUrl) => {
    if (!url) {
      openDialog({
        tone: "warning",
        title: "QRIS belum tersedia",
        message: "Pilih QRIS di halaman pembayaran dulu, lalu coba lagi.",
      });
      return;
    }
    setSavingQr(true);
    try {
      const dest = `${FileSystem.cacheDirectory}QRIS_${orderId}.png`;
      const res = await FileSystem.downloadAsync(url, dest);
      if (res.status !== 200) throw new Error("unduh gagal");
      if (!(await Sharing.isAvailableAsync())) throw new Error("berbagi tidak tersedia");
      await Sharing.shareAsync(res.uri, {
        mimeType: "image/png",
        dialogTitle: "Simpan atau bagikan QRIS",
        UTI: "public.png",
      });
    } catch {
      openDialog({
        tone: "danger",
        title: "QRIS belum bisa disimpan",
        message: "Periksa koneksi internet lalu coba lagi.",
      });
    } finally {
      setSavingQr(false);
    }
  };

  const copyQr = async () => {
    await Clipboard.setStringAsync(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tone = TONES[dialog.tone] || TONES.warning;

  const dialogView = (
    <Modal visible={!!dialog.visible} transparent animationType="fade" onRequestClose={closeDialog}>
      <View style={styles.overlay}>
        <View style={styles.dialogCard}>
          <View style={[styles.dialogIcon, { backgroundColor: `${tone.color}18` }]}>
            <Ionicons name={dialog.icon || tone.icon} size={32} color={tone.color} />
          </View>
          <Text style={styles.dialogTitle}>{dialog.title}</Text>
          {!!dialog.message && <Text style={styles.dialogText}>{dialog.message}</Text>}
          <View style={styles.dialogActions}>
            {!!dialog.cancelText && (
              <Pressable
                style={[styles.dialogButton, styles.dialogCancel]}
                onPress={() => { closeDialog(); dialog.onCancel?.(); }}
              >
                <Text style={styles.dialogCancelText}>{dialog.cancelText}</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.dialogButton, { backgroundColor: tone.color }]}
              onPress={() => { closeDialog(); dialog.onConfirm?.(); }}
            >
              <Text style={styles.dialogConfirmText}>{dialog.confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isPreparing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Menyiapkan halaman pembayaran...</Text>
        {dialogView}
      </View>
    );
  }

  if (expired) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.expiredIcon}>
          <Ionicons name="time-outline" size={36} color="#f59e0b" />
        </View>
        <Text style={styles.expiredTitle}>Pembayaran tidak berhasil</Text>
        <Text style={styles.expiredText}>
          Waktu pembayaran habis atau transaksi dibatalkan. Pesananmu dibatalkan dan stok produk dikembalikan.
        </Text>
        <Pressable style={styles.primaryButton} onPress={goToOrder}>
          <Text style={styles.primaryButtonText}>Lihat Pesanan</Text>
        </Pressable>
        {dialogView}
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
        {dialogView}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: redirectUrl }}
        style={{ flex: 1 }}
        onShouldStartLoadWithRequest={handleShouldStart}
        onMessage={handleWebMessage}
        onFileDownload={({ nativeEvent }) => saveQr(nativeEvent?.downloadUrl)}
        injectedJavaScript={QR_SNIFFER}
        setSupportMultipleWindows={false}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        renderLoading={() => (
          <View style={styles.webviewLoader}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}
      />

      <View style={styles.footer}>
        {!!info && <Text style={styles.infoText}>{info}</Text>}
        {!!error && <Text style={styles.errorTextSmall}>{error}</Text>}

        {__DEV__ && !!qrUrl && (
          <View style={styles.devPanel}>
            <Text style={styles.devTitle}>🧪 Mode testing (tidak tampil di produksi)</Text>
            <Text style={styles.devUrl} selectable numberOfLines={2}>{qrUrl}</Text>
            <View style={styles.devRow}>
              <Pressable style={styles.devButton} onPress={copyQr}>
                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={14} color={COLORS.warning} />
                <Text style={styles.devButtonText}>{copied ? "Tersalin" : "Salin URL QR"}</Text>
              </Pressable>
              <Pressable style={styles.devButton} onPress={() => Share.share({ message: qrUrl })}>
                <Ionicons name="share-outline" size={14} color={COLORS.warning} />
                <Text style={styles.devButtonText}>Bagikan URL</Text>
              </Pressable>
            </View>
            <Text style={styles.devHint}>
              Buka simulator.sandbox.midtrans.com/v2/qris/index di laptop, tempel URL ini, klik Scan QR.
            </Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.saveButton, !qrUrl && { opacity: 0.55 }]}
            onPress={() => saveQr()}
            disabled={savingQr}
          >
            {savingQr ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color={COLORS.primary} />
                <Text style={styles.saveButtonText}>Simpan QRIS</Text>
              </>
            )}
          </Pressable>
          <Pressable style={styles.checkButton} onPress={handleCheckManually} disabled={isChecking}>
            {isChecking ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.checkButtonText}>Cek Status</Text>
            )}
          </Pressable>
        </View>
      </View>

      {dialogView}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { color: COLORS.textMuted, fontSize: 12, marginTop: 12 },
  errorText: { color: COLORS.primary, fontSize: 13, textAlign: "center", marginBottom: 16 },
  errorTextSmall: { color: COLORS.primary, fontSize: 11, textAlign: "center", marginBottom: 8 },
  infoText: { color: COLORS.textMuted, fontSize: 11, textAlign: "center", marginBottom: 8, lineHeight: 16 },
  retryButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryButtonText: { color: COLORS.primary, fontWeight: "600" },
  webviewLoader: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background },
  actionRow: { flexDirection: "row", gap: 10 },
  saveButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, padding: 14 },
  saveButtonText: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },
  checkButton: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center", justifyContent: "center" },
  checkButtonText: { color: COLORS.background, fontWeight: "700", fontSize: 14 },

  expiredIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#f59e0b18", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  expiredTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  expiredText: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  primaryButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 28 },
  primaryButtonText: { color: COLORS.text, fontWeight: "600" },

  devPanel: { backgroundColor: `${COLORS.warning}15`, borderRadius: 8, padding: 10, marginBottom: 10, gap: 6 },
  devTitle: { color: COLORS.warning, fontSize: 11, fontWeight: "700" },
  devUrl: { color: COLORS.text, fontSize: 10 },
  devRow: { flexDirection: "row", gap: 8 },
  devButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: COLORS.warning, borderRadius: 8, paddingVertical: 8 },
  devButtonText: { color: COLORS.warning, fontSize: 11, fontWeight: "700" },
  devHint: { color: COLORS.textMuted, fontSize: 10, lineHeight: 15 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 16 },
  dialogCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center", elevation: 8 },
  dialogIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  dialogTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  dialogText: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: 20, lineHeight: 22 },
  dialogActions: { flexDirection: "row", gap: 12, width: "100%" },
  dialogButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dialogCancel: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  dialogCancelText: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  dialogConfirmText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});