import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS } from "../../constants/colors";
import { useCart } from "../../context/CartContext";
import { checkout } from "../../services/orderService";
import { checkVoucher, getActiveVouchers } from "../../services/voucherService";
import AppTextInput from "../../components/AppTextInput";
import useKeyboardHeight from "../../hooks/useKeyboardHeight";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount || 0);
}

const voucherLabel = (v) =>
  v.type === "percentage"
    ? `Diskon ${v.value}%${v.max_discount ? ` (maks ${formatRupiah(v.max_discount)})` : ""}`
    : `Diskon ${formatRupiah(v.value)}`;

export default function CheckoutReviewScreen({ route, navigation }) {
  const { deliveryMethod, address, store, shipping, selectedIds } = route.params;
  const { items: cartItems, refreshCart } = useCart();

  // Hanya item yang dipilih di keranjang (kalau tidak ada pilihan, semua item)
  const items = selectedIds?.length ? cartItems.filter((i) => selectedIds.includes(i.cartItemId)) : cartItems;
  const subtotal = items.reduce((sum, i) => sum + (i.variant?.price || 0) * i.quantity, 0);

  const keyboardHeight = useKeyboardHeight();

  const [notes, setNotes] = useState("");
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState("");
  const [isCheckingVoucher, setIsCheckingVoucher] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    getActiveVouchers().then(setAvailableVouchers).catch(() => setAvailableVouchers([]));
  }, []);

  const discount = appliedVoucher?.discount || 0;
  const total = subtotal + shipping.cost - discount;

  const applyVoucher = async (code) => {
    const value = (code || "").trim();
    if (!value) return;
    setIsCheckingVoucher(true);
    setVoucherError("");
    try {
      const result = await checkVoucher(value, subtotal);
      setAppliedVoucher(result.voucher);
      setVoucherInput(result.voucher?.code || value);
    } catch (err) {
      setAppliedVoucher(null);
      setVoucherError(err?.response?.data?.message || err?.message || "Voucher tidak valid");
    } finally {
      setIsCheckingVoucher(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput("");
    setVoucherError("");
  };

  const handleSubmit = async () => {
    setSubmitError("");
    if (deliveryMethod === "pickup" && !store?.store_id) {
      setSubmitError("Pilih store pickup terlebih dahulu");
      return;
    }
    if (items.length === 0) {
      setSubmitError("Tidak ada produk yang dipilih untuk di-checkout");
      return;
    }
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
        pickupStoreId: deliveryMethod === "pickup" ? store.store_id : undefined,
        cartItemIds: selectedIds?.length ? selectedIds : undefined,
      });
      await refreshCart();
      navigation.replace("Payment", { orderId: order.id, total: order.total });
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Gagal membuat pesanan, coba lagi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
      <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={styles.progress}>Langkah 3 dari 3 · Review Pesanan</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Penerimaan</Text>
          {deliveryMethod === "pickup" ? (
            <>
              <Text style={styles.text}>Ambil di Toko · {store?.name}</Text>
              <Text style={styles.textMuted}>{store?.address}, {store?.city}</Text>
              {!!store?.phone && <Text style={styles.textMuted}>{store.phone}</Text>}
              <Text style={[styles.textMuted, { marginTop: 6 }]}>
                Hubungi store setelah pesanan dibuat untuk konfirmasi waktu pengambilan.
              </Text>
            </>
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
              <Text style={[styles.text, { flex: 1 }]}>{item.product.product_name} · {item.variantSizeMl}ml ×{item.quantity}</Text>
              <Text style={styles.text}>{formatRupiah(item.variant.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kode Voucher</Text>

          {availableVouchers.length > 0 && !appliedVoucher && (
            <>
              <Text style={styles.textMuted}>Voucher tersedia, ketuk untuk memakai</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.voucherList}>
                {availableVouchers.map((v) => {
                  const minOk = subtotal >= (Number(v.min_purchase) || 0);
                  return (
                    <Pressable
                      key={v.voucher_id ?? v.code}
                      style={[styles.voucherChip, !minOk && styles.voucherChipDisabled]}
                      disabled={!minOk || isCheckingVoucher}
                      onPress={() => applyVoucher(v.code)}
                    >
                      <Text style={styles.voucherCode}>{v.code}</Text>
                      <Text style={styles.voucherDesc}>{voucherLabel(v)}</Text>
                      <Text style={styles.voucherMin}>
                        {v.min_purchase > 0 ? `Min. belanja ${formatRupiah(v.min_purchase)}` : "Tanpa minimum belanja"}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={[styles.voucherRow, { marginTop: 8 }]}>
            <AppTextInput
              style={styles.voucherInput}
              value={voucherInput}
              onChangeText={setVoucherInput}
              placeholder="Masukkan kode voucher"
              autoCapitalize="characters"
              editable={!appliedVoucher}
            />
            <Pressable
              style={styles.voucherButton}
              onPress={() => applyVoucher(voucherInput)}
              disabled={isCheckingVoucher || !!appliedVoucher}
            >
              {isCheckingVoucher ? <ActivityIndicator color={COLORS.text} size="small" /> : <Text style={styles.voucherButtonText}>{appliedVoucher ? "✓" : "Pakai"}</Text>}
            </Pressable>
          </View>
          {!!voucherError && <Text style={styles.errorText}>{voucherError}</Text>}
          {!!appliedVoucher && (
            <>
              <Text style={styles.voucherSuccess}>Voucher "{appliedVoucher.code}" diterapkan — hemat {formatRupiah(appliedVoucher.discount)}</Text>
              <Pressable onPress={removeVoucher} hitSlop={8}>
                <Text style={styles.removeVoucher}>Lepas voucher</Text>
              </Pressable>
            </>
          )}
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
  productRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, gap: 8 },
  voucherList: { gap: 8, paddingVertical: 8 },
  voucherChip: { width: 175, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, backgroundColor: COLORS.background, gap: 2 },
  voucherChipDisabled: { opacity: 0.5 },
  voucherCode: { color: COLORS.primary, fontWeight: "800", fontSize: 13 },
  voucherDesc: { color: COLORS.text, fontSize: 11 },
  voucherMin: { color: COLORS.textMuted, fontSize: 10 },
  voucherRow: { flexDirection: "row", gap: 8 },
  voucherInput: { flex: 1, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.text },
  voucherButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  voucherButtonText: { color: COLORS.text, fontWeight: "600" },
  voucherSuccess: { color: COLORS.success, fontSize: 11, marginTop: 8 },
  removeVoucher: { color: COLORS.primary, fontSize: 11, marginTop: 6, fontWeight: "600" },
  errorText: { color: COLORS.primary, fontSize: 11, marginTop: 6 },
  notesInput: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text },
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  totalLabel: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  totalValue: { color: COLORS.primary, fontSize: 16, fontWeight: "700" },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center" },
  submitButtonText: { color: COLORS.text, fontWeight: "600" },
});