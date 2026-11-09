import { useState } from "react";
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../constants/colors";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import ProductImage from "../components/ProductImage";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function CartItemRow({ item, selected, onToggle, onIncrease, onDecrease, onRemove, disabled }) {
  return (
    <View style={[styles.itemRow, selected && styles.itemRowSelected, disabled && styles.itemRowDisabled]}>
      <Pressable onPress={onToggle} hitSlop={10} style={styles.checkbox}>
        <Ionicons
          name={selected ? "checkbox" : "square-outline"}
          size={22}
          color={selected ? COLORS.primary : COLORS.textMuted}
        />
      </Pressable>
      <ProductImage
        filename={item.product?.image_filename}
        style={styles.itemImagePlaceholder}
        iconSize={20}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName} numberOfLines={1}>{item.product?.product_name || "Produk"}</Text>
        <Text style={styles.itemVariant}>{item.variantSizeMl}ml</Text>
        <Text style={styles.itemPrice}>{formatRupiah(item.variant?.price)}</Text>
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
      <Pressable onPress={onRemove} style={{ marginLeft: 10 }} disabled={disabled} hitSlop={10}>
        <Text style={{ color: COLORS.textFaint, fontSize: 16 }}>✕</Text>
      </Pressable>
    </View>
  );
}

export default function CartScreen({ navigation }) {
  const { items, loading, error, refreshCart, updateQuantity, removeFromCart, totalItems } = useCart();
  const { user } = useAuth();

  const [notice, setNotice] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Simpan yang TIDAK dipilih, jadi item baru otomatis terpilih
  const [deselected, setDeselected] = useState([]);

  const selectedItems = items.filter((i) => !deselected.includes(i.cartItemId));
  const selectedCount = selectedItems.reduce((sum, i) => sum + i.quantity, 0);
  const selectedSubtotal = selectedItems.reduce((sum, i) => sum + (i.variant?.price || 0) * i.quantity, 0);
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  const toggleItem = (id) =>
    setDeselected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAll = () => setDeselected(allSelected ? items.map((i) => i.cartItemId) : []);

  const showNotice = (message) => {
    if (!message) return;
    setNotice(message);
    setTimeout(() => setNotice(""), 2500);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await refreshCart();
    setIsRefreshing(false);
  };

  const handleIncrease = async (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await updateQuantity(item.cartItemId, item.quantity + 1);
    if (!result.success || result.message) {
      showNotice(result.message || "Stok tidak mencukupi");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const handleDecrease = async (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await updateQuantity(item.cartItemId, item.quantity - 1);
    if (!result.success) {
      showNotice(result.message || "Gagal memperbarui jumlah");
    }
  };

  const handleRemove = async (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    if (selectedItems.length === 0) {
      showNotice("Pilih minimal satu produk untuk di-checkout");
      return;
    }
    navigation.navigate("Checkout", {
      screen: "CheckoutAddress",
      params: { selectedIds: selectedItems.map((i) => i.cartItemId) },
    });
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
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        >
          <View style={styles.emptyIllustrationCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="cart-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Keranjang Belanja Kosong</Text>
            <Text style={styles.emptySubtitle}>
              Wah, keranjangmu masih kosong nih. Yuk, temukan aroma parfum favoritmu dan mulai isi keranjang!
            </Text>
            <Pressable 
              style={({ pressed }) => [styles.exploreButton, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]} 
              onPress={() => navigation.navigate("Katalog")}
            >
              <Ionicons name="storefront-outline" size={18} color={COLORS.background} />
              <Text style={styles.exploreButtonText}>Jelajahi Katalog Parfum</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>Keranjang ({totalItems} item)</Text>

      <Pressable style={styles.selectAllRow} onPress={toggleAll}>
        <Ionicons
          name={allSelected ? "checkbox" : "square-outline"}
          size={22}
          color={allSelected ? COLORS.primary : COLORS.textMuted}
        />
        <Text style={styles.selectAllText}>Pilih Semua</Text>
        <Text style={styles.selectedInfo}>{selectedItems.length} dari {items.length} dipilih</Text>
      </Pressable>

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
        extraData={deselected}
        keyExtractor={(item) => String(item.cartItemId)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        renderItem={({ item }) => (
          <CartItemRow
            item={item}
            selected={!deselected.includes(item.cartItemId)}
            disabled={loading}
            onToggle={() => toggleItem(item.cartItemId)}
            onIncrease={() => handleIncrease(item)}
            onDecrease={() => handleDecrease(item)}
            onRemove={() => handleRemove(item)}
          />
        )}
      />

      <View style={styles.footer}>
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Subtotal ({selectedCount} item dipilih)</Text>
          <Text style={styles.subtotalValue}>{formatRupiah(selectedSubtotal)}</Text>
        </View>
        <Pressable
          style={[styles.checkoutButton, (!user || selectedItems.length === 0) && styles.checkoutButtonDisabled]}
          onPress={handleCheckout}
          disabled={!user || selectedItems.length === 0}
        >
          <Text style={styles.checkoutButtonText}>Checkout ({selectedCount}) →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  emptyContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 24 },
  
  // Empty State Styles
  emptyScroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyIllustrationCard: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  emptyTitle: { color: COLORS.text, fontSize: 20, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  emptySubtitle: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, textAlign: "center", marginBottom: 24 },
  
  exploreButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 8, 
    backgroundColor: COLORS.primary, 
    borderRadius: 14, 
    paddingVertical: 16, 
    paddingHorizontal: 24,
    width: "100%",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  exploreButtonText: { color: COLORS.background, fontWeight: "700", fontSize: 15 },

  header: { color: COLORS.text, fontSize: 20, fontWeight: "600", padding: 16, paddingBottom: 8 },
  selectAllRow: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, paddingVertical: 8 },
  selectAllText: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  selectedInfo: { marginLeft: "auto", color: COLORS.textMuted, fontSize: 11 },
  noticeBanner: { marginHorizontal: 16, marginTop: 6, backgroundColor: COLORS.surfaceLight, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  errorBanner: { borderColor: COLORS.warning },
  noticeText: { color: COLORS.warning, fontSize: 12, textAlign: "center", flexShrink: 1 },
  retryInlineText: { color: COLORS.primary, fontSize: 12, fontWeight: "600", marginLeft: 8 },
  itemRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COLORS.border },
  itemRowSelected: { borderColor: `${COLORS.primary}80` },
  itemRowDisabled: { opacity: 0.6 },
  checkbox: { marginRight: 8 },
  itemImagePlaceholder: { width: 50, height: 50, borderRadius: 6, backgroundColor: COLORS.surfaceLight, marginRight: 10 },
  itemName: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  itemVariant: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  itemPrice: { color: COLORS.primary, fontSize: 13, fontWeight: "600", marginTop: 4 },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyButton: { width: 26, height: 26, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  qtyButtonText: { color: COLORS.text, fontSize: 14 },
  qtyText: { color: COLORS.text, fontSize: 13, minWidth: 16, textAlign: "center" },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background },
  subtotalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  subtotalLabel: { color: COLORS.textMuted, fontSize: 13 },
  subtotalValue: { color: COLORS.text, fontSize: 16, fontWeight: "700" },
  checkoutButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center" },
  checkoutButtonDisabled: { backgroundColor: COLORS.surfaceLight },
  checkoutButtonText: { color: COLORS.text, fontWeight: "600" },
});