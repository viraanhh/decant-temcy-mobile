import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, FlatList, StyleSheet, ActivityIndicator, Alert, Modal } from "react-native";
import { COLORS } from "../constants/colors";
import { getProductById } from "../services/productService";
import { getReviewsByProduct } from "../services/reviewService";
import { getSimilarProducts } from "../services/recommendationService";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import ProductImage from "../components/ProductImage";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

function SimilarProductCard({ product, onPress }) {
  const lowestPrice = Math.min(...product.variants.map((v) => v.price));
  return (
    <Pressable style={styles.similarCard} onPress={onPress}>
      <ProductImage filename={product.image_filename} style={styles.similarImagePlaceholder} iconSize={20} />
      <Text style={styles.similarBrand}>{product.brand}</Text>
      <Text style={styles.similarName} numberOfLines={1}>{product.product_name}</Text>
      <Text style={styles.similarPrice}>{formatRupiah(lowestPrice)}</Text>
    </Pressable>
  );
}

export default function ProductDetailScreen({ route, navigation }) {
  const { productId } = route.params;

  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [similarProducts, setSimilarProducts] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const [isCartModalVisible, setIsCartModalVisible] = useState(false);
  const [cartModalMessage, setCartModalMessage] = useState("");
  const [isSuccessAdd, setIsSuccessAdd] = useState(false);

  const [modalType, setModalType] = useState("cart");

  const { addToCart } = useCart();
  const { user } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();

  useEffect(() => {
    let mounted = true;

    async function loadProduct() {
      try {
        setIsLoading(true);

        const [productData, reviewsResult, similar] = await Promise.all([
          getProductById(productId),
          getReviewsByProduct(productId),
          getSimilarProducts(productId),
        ]);

        if (!mounted) return;

        setProduct(productData);
        setReviews(reviewsResult.reviews);
        setAvgRating(reviewsResult.avgRating);
        setTotalReviews(reviewsResult.totalReviews);
        setSimilarProducts(similar);

        if (productData?.variants?.length > 0) {
          const firstAvailableVariant =
            productData.variants.find((v) => v.in_stock) ||
            productData.variants[0];

          setSelectedVariant(firstAvailableVariant);
        }
      } catch (error) {
        console.error("Failed to load product detail:", error);
        if (mounted) {
          Alert.alert("Gagal Memuat Produk", "Data produk tidak dapat dimuat. Silakan coba lagi.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      mounted = false;
    };
  }, [productId]);

  const showPopup = (success, message, type = "cart") => {
    setIsSuccessAdd(success);
    setCartModalMessage(message);
    setModalType(type);
    setIsCartModalVisible(true);
  };

  const handleShare = async () => {
    const link = `https://decanttemcy.com/product/${product.id}`;
    await Clipboard.setStringAsync(link);
    showPopup(true, "Link produk berhasil disalin ke clipboard!", "share");
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      showPopup(false, "Pilih ukuran decant terlebih dahulu.", "cart");
      return;
    }

    if (!selectedVariant.in_stock) {
      showPopup(false, "Stok untuk ukuran ini tidak mencukupi.", "cart");
      return;
    }

    if (!user) {
      Alert.alert(
        "Login Diperlukan",
        "Silakan login terlebih dahulu untuk menambahkan produk ke keranjang.",
        [
          { text: "Batal", style: "cancel" },
          { text: "Login", onPress: () => navigation.navigate("Login") },
        ]
      );
      return;
    }

    try {
      setIsAdding(true);
      const result = await addToCart(product, selectedVariant, quantity);

      if (!result?.success) {
        showPopup(false, result?.message || "Produk gagal ditambahkan ke keranjang.", "cart");
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showPopup(true, "Berhasil ditambahkan ke keranjang!", "cart");
      
    } catch (error) {
      console.error("Add to cart error:", error);
      showPopup(false, error?.message || "Terjadi kesalahan saat menambahkan produk.", "cart");
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlist = async () => {
    if (!user) {
      Alert.alert(
        "Login Diperlukan",
        "Silakan login terlebih dahulu untuk menggunakan wishlist.",
        [
          { text: "Batal", style: "cancel" },
          { text: "Login", onPress: () => navigation.navigate("Login") },
        ]
      );
      return;
    }
    
    try {
      const wasWishlisted = isWishlisted(product.id);
      await toggleWishlist(product.id);
      
      if (wasWishlisted) {
        showPopup(true, "Produk dihapus dari Wishlist.", "wishlist_remove");
      } else {
        showPopup(true, "Produk berhasil ditambahkan ke Wishlist!", "wishlist_add");
      }
    } catch (error) {
      console.error("Wishlist error:", error);
      showPopup(false, "Gagal memperbarui Wishlist.", "wishlist_add");
    }
  };

  if (isLoading || !product) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const wishlistActive = isWishlisted(product.id);

  return (
    <>
      <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={styles.scrollContent}>
        <ProductImage filename={product.image_filename} style={styles.imagePlaceholder} iconSize={40} />

        <View style={styles.content}>
          <Text style={styles.brand}>{product.brand}</Text>

          <View style={styles.titleRow}>
            <Text style={styles.name}>{product.product_name}</Text>

            <View style={styles.actionIconGroup}>
              <Pressable onPress={handleShare} style={styles.actionIconButton} hitSlop={10}>
                <Ionicons name="share-social-outline" size={24} color={COLORS.text} />
              </Pressable>
              <Pressable onPress={handleWishlist} style={styles.actionIconButton} hitSlop={10}>
                <Ionicons 
                   name={wishlistActive ? "heart" : "heart-outline"} 
                   size={26} 
                   color={wishlistActive ? "#FF4B4B" : COLORS.text} 
                />
              </Pressable>
            </View>
          </View>

          <Text style={styles.rating}>★ {avgRating.toFixed(1)} ({totalReviews} ulasan)</Text>

          {!!product.concentration && (
            <Text style={styles.concentration}>{product.concentration}</Text>
          )}

          <Text style={styles.sectionTitle}>Ukuran Decant</Text>

          <View style={styles.variantRow}>
            {product.variants?.map((variant) => {
              const isSelected = selectedVariant?.size_ml === variant.size_ml;
              return (
                <Pressable
                  key={variant.size_ml}
                  onPress={() => {
                    setSelectedVariant(variant);
                    setQuantity(1);
                  }}
                  disabled={!variant.in_stock}
                  style={[
                    styles.variantChip,
                    isSelected && styles.variantChipActive,
                    !variant.in_stock && styles.variantChipDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.variantChipText,
                      isSelected && styles.variantChipTextActive,
                      !variant.in_stock && styles.variantChipTextDisabled,
                    ]}
                  >
                    {variant.size_ml}ml
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {!!product.inspirator && (
            <Text style={styles.inspiratorText}>Terinspirasi dari: <Text style={{ color: COLORS.text }}>{product.inspirator}</Text></Text>
          )}

          {!!product.description && (
            <>
              <Text style={styles.sectionTitle}>Deskripsi</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </>
          )}

          <Text style={styles.sectionTitle}>Jumlah</Text>
          <View style={styles.qtyRow}>
            <Pressable
              style={styles.qtyButton}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Text style={styles.qtyButtonText}>−</Text>
            </Pressable>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <Pressable
              style={styles.qtyButton}
              onPress={() => setQuantity((q) => q + 1)}
            >
              <Text style={styles.qtyButtonText}>+</Text>
            </Pressable>
          </View>

          <Text style={styles.price}>{formatRupiah(selectedVariant?.price)}</Text>

          <Text style={styles.stock}>
            {selectedVariant?.in_stock
              ? `Stok tersedia: ${selectedVariant.stock} ml`
              : "Stok tidak mencukupi untuk ukuran ini"}
          </Text>

          <Pressable
            style={[styles.addButton, (!selectedVariant?.in_stock || isAdding) && styles.addButtonDisabled]}
            onPress={handleAddToCart}
            disabled={!selectedVariant?.in_stock || isAdding}
          >
            {isAdding ? (
              <ActivityIndicator color={COLORS.text} size="small" />
            ) : (
              <Text style={styles.addButtonText}>
                + Tambah ke Keranjang
              </Text>
            )}
          </Pressable>

          {(product.top_notes || product.middle_notes || product.base_notes) && (
            <>
              <Text style={styles.sectionTitle}>Notes</Text>
              {product.top_notes && (
                <View style={styles.noteRow}>
                  <Text style={styles.noteIcon}>🍃</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noteLabel}>TOP NOTES</Text>
                    <Text style={styles.noteValue}>{product.top_notes}</Text>
                  </View>
                </View>
              )}
              {product.middle_notes && (
                <View style={styles.noteRow}>
                  <Text style={styles.noteIcon}>🌸</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noteLabel}>MIDDLE NOTES</Text>
                    <Text style={styles.noteValue}>{product.middle_notes}</Text>
                  </View>
                </View>
              )}
              {product.base_notes && (
                <View style={styles.noteRow}>
                  <Text style={styles.noteIcon}>🪵</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noteLabel}>BASE NOTES</Text>
                    <Text style={styles.noteValue}>{product.base_notes}</Text>
                  </View>
                </View>
              )}
            </>
          )}

          {!!product.main_accords && (
            <View style={styles.accordRow}>
              {product.main_accords.split(",").map((accord, i) => (
                <View key={i} style={styles.accordChip}>
                  <Text style={styles.accordChipText}>{accord.trim()}</Text>
                </View>
              ))}
            </View>
          )}

          {(product.pros || product.cons) && (
            <View style={styles.prosConsRow}>
              {product.pros && (
                <View style={styles.prosConsBox}>
                  <Text style={styles.prosTitle}>✓ Kelebihan</Text>
                  <Text style={styles.prosConsText}>{product.pros}</Text>
                </View>
              )}
              {product.cons && (
                <View style={styles.prosConsBox}>
                  <Text style={styles.consTitle}>✕ Kekurangan</Text>
                  <Text style={styles.prosConsText}>{product.cons}</Text>
                </View>
              )}
            </View>
          )}

          {similarProducts.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Produk Serupa</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={similarProducts}
                keyExtractor={(item) => `similar-${item.id}`}
                contentContainerStyle={{ gap: 10 }}
                renderItem={({ item }) => (
                  <SimilarProductCard
                    product={item}
                    onPress={() => navigation.push("ProductDetail", { productId: item.id })}
                  />
                )}
              />
            </>
          )}

          <Text style={styles.sectionTitle}>Ulasan Pembeli ({reviews.length})</Text>

          {reviews.length === 0 ? (
            <Text style={styles.noReview}>Belum ada ulasan untuk produk ini.</Text>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewUser}>{review.userName}</Text>
                  <Text style={styles.reviewStars}>
                    {"★".repeat(review.rating || 0)}
                    {"☆".repeat(5 - (review.rating || 0))}
                  </Text>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                {!!review.createdAt && <Text style={styles.reviewDate}>{review.createdAt}</Text>}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={isCartModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
               <Ionicons 
                 name={isSuccessAdd ? "checkmark-circle" : "warning"} 
                 size={48} 
                 color={isSuccessAdd ? "#3DBA6C" : COLORS.warning} 
               />
            </View>
            <Text style={styles.modalTitle}>{isSuccessAdd ? "Sukses" : "Oops!"}</Text>
            <Text style={styles.modalMessage}>{cartModalMessage}</Text>
            
            <View style={styles.modalActionRow}>
               <Pressable 
                 style={[styles.modalBtn, styles.modalBtnSecondary]} 
                 onPress={() => setIsCartModalVisible(false)}
               >
                  <Text style={styles.modalBtnSecondaryText}>Tutup</Text>
               </Pressable>

               {isSuccessAdd && modalType === "cart" && (
                 <Pressable 
                   style={[styles.modalBtn, styles.modalBtnPrimary]} 
                   onPress={() => {
                     setIsCartModalVisible(false);
                     navigation.navigate("MainTabs", { screen: "Keranjang" });
                   }}
                 >
                    <Text style={styles.modalBtnPrimaryText}>Lihat Keranjang</Text>
                 </Pressable>
               )}

               {isSuccessAdd && modalType === "wishlist_add" && (
                 <Pressable 
                   style={[styles.modalBtn, styles.modalBtnPrimary]} 
                   onPress={() => {
                     setIsCartModalVisible(false);
                     navigation.navigate("Wishlist");
                   }}
                 >
                    <Text style={styles.modalBtnPrimaryText}>Lihat Wishlist</Text>
                 </Pressable>
               )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40 },
  centerContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" },
  imagePlaceholder: { height: 260, backgroundColor: COLORS.surfaceLight, alignItems: "center", justifyContent: "center", width: "100%" },
  content: { padding: 20 },
  brand: { color: COLORS.textMuted, fontSize: 12 },
  
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  name: { flex: 1, color: COLORS.text, fontSize: 22, fontWeight: "600", lineHeight: 28, marginRight: 10 },
  
  actionIconGroup: { flexDirection: "row", alignItems: "center", gap: 14 },
  actionIconButton: { alignItems: "center", justifyContent: "center" },

  rating: { color: COLORS.textMuted, fontSize: 13, marginTop: 6 },
  concentration: { color: COLORS.textMuted, fontSize: 12, marginTop: 6 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 20, marginBottom: 8, textTransform: "uppercase" },
  variantRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  variantChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  variantChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  variantChipDisabled: { opacity: 0.4 },
  variantChipText: { color: COLORS.textMuted, fontSize: 13 },
  variantChipTextActive: { color: COLORS.text, fontWeight: "600" },
  variantChipTextDisabled: { color: COLORS.textFaint },
  
  inspiratorText: { color: COLORS.textMuted, fontSize: 12, marginTop: 10 },
  descriptionText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginTop: 4 },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  noteIcon: { fontSize: 18 },
  noteLabel: { color: COLORS.textFaint, fontSize: 10, letterSpacing: 0.5 },
  noteValue: { color: COLORS.text, fontSize: 13, marginTop: 2 },
  accordRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  accordChip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  accordChipText: { color: COLORS.textMuted, fontSize: 11 },
  prosConsRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  prosConsBox: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
  prosTitle: { color: COLORS.success, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  consTitle: { color: COLORS.primary, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  prosConsText: { color: COLORS.textMuted, fontSize: 11, lineHeight: 16 },
  
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyButton: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  qtyButtonText: { color: COLORS.text, fontSize: 18 },
  qtyValue: { color: COLORS.text, fontSize: 16, fontWeight: "600", minWidth: 24, textAlign: "center" },

  price: { color: COLORS.primary, fontSize: 24, fontWeight: "700", marginTop: 20 },
  stock: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  addButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 16, alignItems: "center", justifyContent: "center", marginTop: 24, minHeight: 50 },
  addButtonDisabled: { backgroundColor: COLORS.surfaceLight },
  addButtonText: { color: COLORS.text, fontWeight: "600" },
  
  similarCard: { width: 120, backgroundColor: COLORS.surface, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: COLORS.border },
  similarImagePlaceholder: { height: 70, borderRadius: 6, backgroundColor: COLORS.surfaceLight, alignItems: "center", justifyContent: "center", width: "100%" },
  similarBrand: { color: COLORS.textMuted, fontSize: 9, marginTop: 6 },
  similarName: { color: COLORS.text, fontSize: 12, fontWeight: "600", marginTop: 1 },
  similarPrice: { color: COLORS.primary, fontSize: 11, fontWeight: "600", marginTop: 4 },
  noReview: { color: COLORS.textMuted, fontSize: 12 },
  reviewCard: { backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 8 },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between" },
  reviewUser: { color: COLORS.text, fontSize: 12, fontWeight: "600" },
  reviewStars: { color: COLORS.warning, fontSize: 11 },
  reviewComment: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  reviewDate: { color: COLORS.textFaint, fontSize: 10, marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 40, alignItems: "center" },
  modalIconContainer: { marginBottom: 16 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  modalMessage: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  modalActionRow: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  modalBtnSecondary: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  modalBtnSecondaryText: { color: COLORS.text, fontWeight: "600" },
  modalBtnPrimary: { backgroundColor: COLORS.primary },
  modalBtnPrimaryText: { color: COLORS.text, fontWeight: "600" },
});