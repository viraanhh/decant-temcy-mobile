import { useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function CartItemRow({ item, onIncrease, onDecrease, onRemove, disabled }) {
  return (
    <View style={[styles.itemRow, disabled && styles.itemRowDisabled]}>
      <View style={styles.itemImagePlaceholder} />
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.product.product_name}</Text>
        <Text style={styles.itemVariant}>{item.variantSizeMl}ml</Text>
        <Text style={styles.itemPrice}>{formatRupiah(item.variant.price)}</Text>
      </View>
      <View style={styles.qtyControls}>
        <Pressable style={styles.qtyButton} onPress={onDecrease} disabled={disabled}>
          <Text style={styles.qtyButtonText}>−</Text>
        </Pressable>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <Pressable style={styles.qtyButton} onPress={onIncrease} disabled={disabled}>
          <Text style={styles.qtyButtonText}>+</Text>
        </Pressable>
      </View>
      <Pressable onPress={onRemove} style={{ marginLeft: 10 }} disabled={disabled}>
        <Text style={{ color: COLORS.textFaint }}>✕</Text>
      </Pressable>
    </View>
  );
}

export default function CartScreen({ navigation }) {
  const { items, loading, error, refreshCart, updateQuantity, removeFromCart, totalItems, subtotal } = useCart();
  const { user } = useAuth();

  const [notice, setNotice] = useState("");

  const showNotice = (message) => {
    if (!message) return;
    setNotice(message);
    setTimeout(() => setNotice(""), 2500);
  };

  const handleIncrease = async (item) => {
    const result = await updateQuantity(item.cartItemId, item.quantity + 1);
    if (!result.success || result.message) {
      showNotice(result.message || "Stok tidak mencukupi");
    }
  };

  const handleDecrease = async (item) => {
    const result = await updateQuantity(item.cartItemId, item.quantity - 1);
    if (!result.success) {
      showNotice(result.message || "Gagal memperbarui jumlah");
    }
  };

  const handleRemove = async (item) => {
    const result = await removeFromCart(item.cartItemId);
    if (!result.success) {
      showNotice(result.message || "Gagal menghapus produk");
    }
  };

  const handleCheckout = () => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }
    navigation.navigate("Checkout");
  };

  if (loading && items.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer} edges={["top"]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer} edges={["top"]}>
        <Text style={{ fontSize: 40 }}>🛒</Text>
        <Text style={styles.emptyTitle}>Keranjang Kosong</Text>
        <Text style={styles.emptySubtitle}>Belum ada produk di keranjangmu.</Text>
        <Pressable style={styles.exploreButton} onPress={() => navigation.navigate("Katalog")}>
          <Ionicons name="storefront-outline" size={16} color={COLORS.text} />
          <Text style={styles.exploreButtonText}>Jelajahi Katalog</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>Keranjang ({totalItems} item)</Text>

      {!!notice && (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}

      {!!error && !notice && (
        <View style={[styles.noticeBanner, styles.errorBanner]}>
          <Text style={styles.noticeText}>{error}</Text>
          <Pressable onPress={refreshCart}>
            <Text style={styles.retryInlineText}>Coba lagi</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.cartItemId)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <CartItemRow
            item={item}
            disabled={loading}
            onIncrease={() => handleIncrease(item)}
            onDecrease={() => handleDecrease(item)}
            onRemove={() => handleRemove(item)}
          />
        )}
      />

      <View style={styles.footer}>
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Subtotal</Text>
          <Text style={styles.subtotalValue}>{formatRupiah(subtotal)}</Text>
        </View>
        <Pressable
          style={[styles.checkoutButton, (!user || items.length === 0) && styles.checkoutButtonDisabled]}
          onPress={handleCheckout}
          disabled={!user || items.length === 0}
        >
          <Text style={styles.checkoutButtonText}>Lanjut ke Checkout →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  emptyContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "600", marginTop: 12 },
  emptySubtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 4, textAlign: "center" },
  exploreButton: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, marginTop: 20 },
  exploreButtonText: { color: COLORS.text, fontWeight: "600", fontSize: 13 },
  header: { color: COLORS.text, fontSize: 20, fontWeight: "600", padding: 16, paddingBottom: 0 },
  noticeBanner: { marginHorizontal: 16, marginTop: 10, backgroundColor: COLORS.surfaceLight, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  errorBanner: { borderColor: COLORS.warning },
  noticeText: { color: COLORS.warning, fontSize: 12, textAlign: "center", flexShrink: 1 },
  retryInlineText: { color: COLORS.primary, fontSize: 12, fontWeight: "600", marginLeft: 8 },
  itemRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COLORS.border },
  itemRowDisabled: { opacity: 0.6 },
  itemImagePlaceholder: { width: 50, height: 50, borderRadius: 6, backgroundColor: COLORS.surfaceLight, marginRight: 10 },
  itemName: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  itemVariant: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  itemPrice: { color: COLORS.primary, fontSize: 13, fontWeight: "600", marginTop: 4 },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyButton: { width: 26, height: 26, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  qtyButtonText: { color: COLORS.text, fontSize: 14 },
  qtyText: { color: COLORS.text, fontSize: 13, minWidth: 16, textAlign: "center" },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  subtotalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  subtotalLabel: { color: COLORS.textMuted, fontSize: 13 },
  subtotalValue: { color: COLORS.text, fontSize: 16, fontWeight: "700" },
  checkoutButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center" },
  checkoutButtonDisabled: { backgroundColor: COLORS.surfaceLight },
  checkoutButtonText: { color: COLORS.text, fontWeight: "600" },
});