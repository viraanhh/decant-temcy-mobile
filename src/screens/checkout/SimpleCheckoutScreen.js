import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS } from "../../constants/colors";
import { useCart } from "../../context/CartContext";
import { checkout } from "../../services/orderService";
import { useAddress } from "../../context/AddressContext";
import AppTextInput from "../../components/AppTextInput";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

export default function SimpleCheckoutScreen({ navigation }) {
  const { items, subtotal, refreshCart } = useCart();
  const { selectedAddress } = useAddress();

  // Form manual dipakai HANYA sebagai fallback kalau belum ada alamat
  // tersimpan sama sekali (address book kosong).
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingNotes, setShippingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleCheckout = async () => {
    setError("");

    const finalName = selectedAddress?.recipientName || shippingName;
    const finalPhone = selectedAddress?.phone || shippingPhone;
    const finalAddress = selectedAddress?.fullAddress || shippingAddress;
    const finalCity = selectedAddress?.city || shippingCity;

    if (!finalName || !finalPhone || !finalAddress || !finalCity) {
      setError("Nama, telepon, alamat, dan kota wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await checkout({
        shippingName: finalName,
        shippingPhone: finalPhone,
        shippingAddress: finalAddress,
        shippingCity: finalCity,
        shippingNotes,
      });
      await refreshCart();
      navigation.replace("Payment", { orderId: order.id, total: order.total });
    } catch (err) {
      setError(err?.response?.data?.message || "Gagal membuat pesanan, coba lagi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={{ padding: 20 }}>
      {/* 🔴 Catatan: metode pengiriman (Pickup/Diantar Langsung/Ekspedisi) belum
          bisa dipilih di sini karena backend belum mendukungnya. */}

      {selectedAddress ? (
        <View style={styles.selectedAddressBox}>
          <Text style={styles.sectionLabel}>Alamat Pengiriman</Text>
          <Text style={styles.addressText}>{selectedAddress.recipientName} · {selectedAddress.phone}</Text>
          <Text style={styles.addressTextMuted}>{selectedAddress.fullAddress}, {selectedAddress.city}</Text>
          <Pressable onPress={() => navigation.navigate("AddressBook", { selectMode: true })}>
            <Text style={styles.changeLink}>Ganti Alamat</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Pressable style={styles.addAddressPrompt} onPress={() => navigation.navigate("AddressBook", { selectMode: true })}>
            <Text style={styles.addAddressPromptText}>+ Pilih atau Tambah Alamat</Text>
          </Pressable>

          <Text style={styles.orDivider}>atau isi manual untuk pesanan ini saja</Text>

          <Text style={styles.sectionLabel}>Nama Penerima</Text>
          <AppTextInput style={styles.input} value={shippingName} onChangeText={setShippingName} placeholder="Nama lengkap" />

          <Text style={styles.sectionLabel}>No. Telepon</Text>
          <AppTextInput style={styles.input} value={shippingPhone} onChangeText={setShippingPhone} placeholder="08xx-xxxx-xxxx" keyboardType="phone-pad" />

          <Text style={styles.sectionLabel}>Alamat Lengkap</Text>
          <AppTextInput style={[styles.input, { height: 80 }]} value={shippingAddress} onChangeText={setShippingAddress} placeholder="Jalan, No. Rumah, RT/RW" multiline />

          <Text style={styles.sectionLabel}>Kota</Text>
          <AppTextInput style={styles.input} value={shippingCity} onChangeText={setShippingCity} placeholder="Semarang" />
        </>
      )}

      <Text style={styles.sectionLabel}>Catatan (opsional)</Text>
      <AppTextInput style={styles.input} value={shippingNotes} onChangeText={setShippingNotes} placeholder="Contoh: titip di satpam" />

      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>{items.length} produk</Text>
        <Text style={styles.summaryTotal}>{formatRupiah(subtotal)}</Text>
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <Pressable style={styles.submitButton} onPress={handleCheckout} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.submitButtonText}>Buat Pesanan</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  sectionLabel: { color: COLORS.textMuted, fontSize: 12, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text },
  summaryBox: { flexDirection: "row", justifyContent: "space-between", marginTop: 24, padding: 14, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  summaryLabel: { color: COLORS.textMuted, fontSize: 13 },
  summaryTotal: { color: COLORS.primary, fontSize: 16, fontWeight: "700" },
  errorText: { color: COLORS.primary, fontSize: 12, marginTop: 12 },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 20 },
  submitButtonText: { color: COLORS.text, fontWeight: "600" },
  selectedAddressBox: { backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 10 },
  addressText: { color: COLORS.text, fontSize: 13, marginTop: 4 },
  addressTextMuted: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  changeLink: { color: COLORS.primary, fontSize: 12, marginTop: 8 },
  addAddressPrompt: { backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 16, alignItems: "center" },
  addAddressPromptText: { color: COLORS.primary, fontSize: 13 },
  orDivider: { color: COLORS.textFaint, fontSize: 11, textAlign: "center", marginTop: 14, marginBottom: 4 },
});