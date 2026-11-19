import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Keyboard,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getAllProducts } from "../../services/productService";
import { deleteAdminProduct } from "../../services/adminService";
import ProductImage from "../../components/ProductImage";
import AppTextInput from "../../components/AppTextInput";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

export default function AdminProductListScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State untuk Custom Modal Konfirmasi Hapus
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      getAllProducts()
        .then(setProducts)
        .finally(() => setIsLoading(false));
    }, [])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await getAllProducts();
      setProducts(data);
    } finally {
      setIsRefreshing(false);
    }
  };

  const openDeleteModal = (product) => {
    setDeleteError("");
    setProductToDelete(product);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setProductToDelete(null);
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    const productId = productToDelete.product_id || productToDelete.id;

    setIsDeleting(true);
    setDeleteError("");

    try {
      await deleteAdminProduct(productId);
      setProducts((prev) =>
        prev.filter((p) => (p.product_id || p.id) !== productId)
      );
      setProductToDelete(null);
    } catch (err) {
      setDeleteError(
        err?.response?.data?.message ||
          err?.message ||
          "Gagal menghapus produk, coba lagi."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    Keyboard.dismiss();
  };

  const filteredProducts = products.filter((p) =>
    `${p.brand} ${p.product_name}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER UTAMA */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Kelola Produk</Text>
          <Text style={styles.subtitle}>
            {products.length} produk terdaftar di katalog
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => navigation.navigate("AdminProductForm")}
        >
          <Ionicons name="add" size={22} color={COLORS.onPrimary} />
          <Text style={styles.addButtonText} suppressHighlighting={true}>
            Tambah
          </Text>
        </Pressable>
      </View>

      {/* SEARCH BOX */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <AppTextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cari nama parfum atau brand..."
          placeholderTextColor={COLORS.textMuted}
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={clearSearch}
            style={styles.clearButton}
            hitSlop={10}
          >
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </Pressable>
        )}
      </View>

      {/* KONTEN UTAMA */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : filteredProducts.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          <View style={styles.emptyIconBox}>
            <Ionicons
              name="cube-outline"
              size={48}
              color={COLORS.textMuted}
            />
          </View>
          <Text style={styles.emptyTitle}>Produk Tidak Ditemukan</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? `Tidak ada hasil untuk "${searchQuery}"`
              : "Belum ada produk yang ditambahkan ke katalog."}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item, index) =>
            `prod-${item.product_id || item.id || "x"}-${index}`
          }
          contentContainerStyle={{
            padding: SPACING.lg,
            gap: SPACING.md,
            paddingBottom: 90,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          renderItem={({ item }) => {
            const firstVariantPrice =
              item.variants?.[0]?.price || item.price || 0;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                ]}
                onPress={() =>
                  navigation.navigate("AdminProductForm", { product: item })
                }
              >
                <View style={styles.imageWrapper}>
                  <ProductImage
                    filename={item.image_filename}
                    style={styles.cardImage}
                    iconSize={24}
                  />
                </View>

                <View style={{ flex: 1, justifyContent: "center" }}>
                  <Text style={styles.cardBrand}>
                    {item.brand?.toUpperCase()}
                  </Text>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {item.product_name}
                  </Text>

                  <View style={styles.cardDetailRow}>
                    <View style={styles.badgeStock}>
                      <Ionicons
                        name="cube-outline"
                        size={11}
                        color={COLORS.primary}
                      />
                      <Text style={styles.cardStockText}>
                        {item.stock_ml
                          ? `${item.stock_ml}ml`
                          : "Varian Tersedia"}
                      </Text>
                    </View>
                    <Text style={styles.cardPrice}>
                      {formatRupiah(firstVariantPrice)}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => openDeleteModal(item)}
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    pressed && { backgroundColor: "rgba(239, 68, 68, 0.2)" },
                  ]}
                  hitSlop={12}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}

      {/* CUSTOM MODAL KONFIRMASI HAPUS PRODUK */}
      <Modal
        visible={!!productToDelete}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </View>

            <Text style={styles.modalTitle}>Hapus Produk?</Text>

            <Text style={styles.modalText}>
              Nonaktifkan{" "}
              <Text style={styles.modalProductHighlight}>
                "{productToDelete?.product_name}"
              </Text>
              ? Produk tidak akan tampil lagi di katalog customer.
            </Text>

            {!!deleteError && (
              <Text style={styles.modalError}>{deleteError}</Text>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalCancel,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={closeDeleteModal}
                disabled={isDeleting}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalConfirm,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Ya, Hapus</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  title: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
  subtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 4,
    ...CARD_SHADOW,
  },
  addButtonText: { color: COLORS.onPrimary, fontWeight: "700", fontSize: 13 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
    ...CARD_SHADOW,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    color: COLORS.text,
    fontSize: 14,
  },
  clearButton: { padding: 4 },

  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...CARD_SHADOW,
  },
  imageWrapper: {
    borderRadius: RADIUS.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  cardImage: { width: 60, height: 60 },
  cardBrand: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },

  cardDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  badgeStock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${COLORS.primary}12`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  cardStockText: { color: COLORS.primary, fontSize: 11, fontWeight: "600" },
  cardPrice: { color: COLORS.text, fontSize: 13, fontWeight: "800" },

  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  // STYLING CUSTOM MODAL KONFIRMASI
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 8,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  modalText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 21,
  },
  modalProductHighlight: {
    color: COLORS.text,
    fontWeight: "700",
  },
  modalError: {
    color: "#EF4444",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancel: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 14,
  },
  modalConfirm: {
    backgroundColor: "#EF4444",
  },
  modalConfirmText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});