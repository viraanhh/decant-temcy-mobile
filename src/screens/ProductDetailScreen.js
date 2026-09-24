import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { COLORS } from "../constants/colors";
import { getProductById } from "../services/productService";
import { getReviewsByProduct, submitReview } from "../services/reviewService";
import { getSimilarProducts } from "../services/recommendationService";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import ProductImage from "../components/ProductImage";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";

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
  const [quantity, setQuantity] = useState(1); // State baru untuk quantity
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [similarProducts, setSimilarProducts] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const [cartMessage, setCartMessage] = useState("");
  const [justAdded, setJustAdded] = useState(false);

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
          Alert.alert(
            "Gagal Memuat Produk",
            "Data produk tidak dapat dimuat. Silakan coba lagi."
          );
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

  const showCartMessage = (message) => {
    if (!message) return;
    setCartMessage(message);
    setTimeout(() => setCartMessage(""), 2500);
  };

  const handleShare = async () => {
    // 🔴 Placeholder domain — sesuaikan kalau website punya deep link/URL produk resmi
    const link = `https://decanttemcy.com/product/${product.id}`;
    await Clipboard.setStringAsync(link);
    showCartMessage("Link produk disalin ke clipboard");
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      showCartMessage("Pilih ukuran decant terlebih dahulu.");
      return;
    }

    if (!selectedVariant.in_stock) {
      showCartMessage("Stok untuk ukuran ini tidak mencukupi.");
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
      setCartMessage("");

      // Kirim quantity ke keranjang
      const result = await addToCart(product, selectedVariant, quantity);

      if (!result?.success) {
        showCartMessage(result?.message || "Produk gagal ditambahkan ke keranjang.");
        return;
      }

      setJustAdded(true);
      if (result.message) showCartMessage(result.message);
      setTimeout(() => setJustAdded(false), 1500);
    } catch (error) {
      console.error("Add to cart error:", error);
      showCartMessage(error?.message || "Terjadi kesalahan saat menambahkan produk.");
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
      await toggleWishlist(product.id);
    } catch (error) {
      console.error("Wishlist error:", error);
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
    <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ProductImage filename={product.image_filename} style={styles.imagePlaceholder} iconSize={40} />

      <View style={styles.content}>
        <Text style={styles.brand}>{product.brand}</Text>

        <View style={styles.titleRow}>
          <Text style={styles.name}>{product.product_name}</Text>
          <Pressable onPress={handleShare} style={styles.wishlistButton}>
            <Ionicons name="share-outline" size={20} color={COLORS.textMuted} />
          </Pressable>
          <Pressable onPress={handleWishlist} style={styles.wishlistButton}>
            <Text style={styles.wishlistIcon}>{wishlistActive ? "❤️" : "🤍"}</Text>
          </Pressable>
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
                  setQuantity(1); // Reset quantity ketika ganti ukuran
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

        {/* UI Quantity */}
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
              {justAdded ? "✓ Ditambahkan!" : "+ Tambah ke Keranjang"}
            </Text>
          )}
        </Pressable>

        {!!cartMessage && (
          <View style={styles.messageContainer}>
            <Text style={styles.cartMessage}>{cartMessage}</Text>
          </View>
        )}

        {/* NOTES & PROS/CONS */}
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

        {/* Produk Serupa */}
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

        {/* Reviews */}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40 },
  centerContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" },
  imagePlaceholder: { height: 260, backgroundColor: COLORS.surfaceLight, alignItems: "center", justifyContent: "center", width: "100%" },
  content: { padding: 20 },
  brand: { color: COLORS.textMuted, fontSize: 12 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 4 },
  name: { flex: 1, color: COLORS.text, fontSize: 22, fontWeight: "600", lineHeight: 28 },
  wishlistButton: { padding: 4, marginLeft: 12 },
  wishlistIcon: { fontSize: 22 },
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
  messageContainer: { marginTop: 8 },
  cartMessage: { color: COLORS.warning, fontSize: 12, textAlign: "center" },
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
});