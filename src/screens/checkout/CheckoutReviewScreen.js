import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS } from "../../constants/colors";
import { useCart } from "../../context/CartContext";
import { checkout } from "../../services/orderService";
import { checkVoucher } from "../../services/voucherService";
import AppTextInput from "../../components/AppTextInput";
import useKeyboardHeight from "../../hooks/useKeyboardHeight";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

export default function CheckoutReviewScreen({ route, navigation }) {
  const { deliveryMethod, address, shipping } = route.params;
  const { items, subtotal, refreshCart } = useCart();

  const keyboardHeight = useKeyboardHeight();

  const [notes, setNotes] = useState("");
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState("");
  const [isCheckingVoucher, setIsCheckingVoucher] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const discount = appliedVoucher?.discount || 0;
  const total = subtotal + shipping.cost - discount;

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) return;
    setIsCheckingVoucher(true);
    setVoucherError("");
    try {
      const result = await checkVoucher(voucherInput.trim(), subtotal);
      setAppliedVoucher(result.voucher);
    } catch (err) {
      setAppliedVoucher(null);
      setVoucherError(err?.response?.data?.message || "Voucher tidak valid");
    } finally {
      setIsCheckingVoucher(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const order = await checkout({
        addressId: deliveryMethod === "delivery" ? address?.id : undefined,
        shippingName: deliveryMethod === "delivery" ? address?.recipientName : undefined,
        shippingPhone: deliveryMethod === "delivery" ? address?.phone : undefined,
        shippingAddress: deliveryMethod === "delivery" ? address?.detail : undefined,
        shippingCity: deliveryMethod === "delivery" ? address?.city : undefined,
        shippingNotes: notes,
        deliveryMethod,
        courier: shipping.courier,
        courierService: shipping.courierService,
        shippingCost: shipping.cost,
        voucherCode: appliedVoucher?.code,
      });
      await refreshCart();
      navigation.replace("Payment", { orderId: order.id, total: order.total });
    } catch (err) {
      setSubmitError(err?.response?.data?.message || "Gagal membuat pesanan, coba lagi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
      <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={styles.progress}>Langkah 3 dari 3 · Review Pesanan</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Penerimaan</Text>
          {deliveryMethod === "pickup" ? (
            <Text style={styles.text}>Ambil di Toko — Semarang</Text>
          ) : (
            <>
              <Text style={styles.text}>{address.recipientName} · {address.phone}</Text>
              <Text style={styles.textMuted}>{address.detail}, {address.city}, {address.province}</Text>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pengiriman</Text>
          <Text style={styles.text}>{shipping.label}</Text>
          {shipping.etd && <Text style={styles.textMuted}>Estimasi {shipping.etd} hari</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{items.length} Produk</Text>
          {items.map((item) => (
            <View key={item.cartItemId} style={styles.productRow}>
              <Text style={styles.text}>{item.product.product_name} · {item.variantSizeMl}ml ×{item.quantity}</Text>
              <Text style={styles.text}>{formatRupiah(item.variant.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kode Voucher</Text>
          <View style={styles.voucherRow}>
            <AppTextInput
              style={styles.voucherInput}
              value={voucherInput}
              onChangeText={setVoucherInput}
              placeholder="Masukkan kode voucher"
              autoCapitalize="characters"
              editable={!appliedVoucher}
            />
            <Pressable style={styles.voucherButton} onPress={handleApplyVoucher} disabled={isCheckingVoucher || !!appliedVoucher}>
              {isCheckingVoucher ? <ActivityIndicator color={COLORS.text} size="small" /> : <Text style={styles.voucherButtonText}>{appliedVoucher ? "✓" : "Pakai"}</Text>}
            </Pressable>
          </View>
          {!!voucherError && <Text style={styles.errorText}>{voucherError}</Text>}
          {!!appliedVoucher && <Text style={styles.voucherSuccess}>Voucher "{appliedVoucher.code}" diterapkan — hemat {formatRupiah(appliedVoucher.discount)}</Text>}
        </View>

        <AppTextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Catatan untuk pesanan (opsional)"
        />

        <View style={styles.section}>
          <View style={styles.priceRow}>
            <Text style={styles.textMuted}>Subtotal</Text>
            <Text style={styles.text}>{formatRupiah(subtotal)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.textMuted}>Ongkir</Text>
            <Text style={styles.text}>{formatRupiah(shipping.cost)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.textMuted}>Diskon Voucher</Text>
              <Text style={[styles.text, { color: COLORS.success }]}>-{formatRupiah(discount)}</Text>
            </View>
          )}
          <View style={[styles.priceRow, { marginTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 }]}>
            <Text style={styles.totalLabel}>Total Bayar</Text>
            <Text style={styles.totalValue}>{formatRupiah(total)}</Text>
          </View>
        </View>

        {!!submitError && <Text style={styles.errorText}>{submitError}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.submitButtonText}>Buat Pesanan & Bayar →</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  progress: { color: COLORS.textMuted, fontSize: 12 },
  section: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { color: COLORS.textMuted, fontSize: 12, textTransform: "uppercase", marginBottom: 6 },
  text: { color: COLORS.text, fontSize: 13 },
  textMuted: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  productRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  voucherRow: { flexDirection: "row", gap: 8 },
  voucherInput: { flex: 1, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.text },
  voucherButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  voucherButtonText: { color: COLORS.text, fontWeight: "600" },
  voucherSuccess: { color: COLORS.success, fontSize: 11, marginTop: 8 },
  errorText: { color: COLORS.primary, fontSize: 11, marginTop: 6 },
  notesInput: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text },
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  totalLabel: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  totalValue: { color: COLORS.primary, fontSize: 16, fontWeight: "700" },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center" },
  submitButtonText: { color: COLORS.text, fontWeight: "600" },
});