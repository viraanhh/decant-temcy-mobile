import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
      <ProductImage
        filename={product.image_filename}
        style={styles.similarImagePlaceholder}
        iconSize={20}
      />
      <Text style={styles.similarBrand}>{product.brand}</Text>
      <Text style={styles.similarName} numberOfLines={1}>
        {product.product_name}
      </Text>
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

  // State untuk modal hasil action (berhasil/gagal)
  const [isCartModalVisible, setIsCartModalVisible] = useState(false);
  const [cartModalMessage, setCartModalMessage] = useState("");
  const [isSuccessAdd, setIsSuccessAdd] = useState(false);
  const [modalType, setModalType] = useState("cart");

  // State khusus untuk modal peringatan "Harus Login"
  const [isLoginPromptVisible, setIsLoginPromptVisible] = useState(false);
  const [loginPromptConfig, setLoginPromptConfig] = useState({
    icon: "person-circle-outline",
    title: "Masuk dulu ya",
    message: "Fitur ini hanya untuk pengguna yang sudah login.",
  });

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

  const showPopup = (success, message, type = "cart") => {
    setIsSuccessAdd(success);
    setCartModalMessage(message);
    setModalType(type);
    setIsCartModalVisible(true);
  };

  const showLoginPrompt = (type) => {
    if (type === "cart") {
      setLoginPromptConfig({
        icon: "cart-outline",
        title: "Masuk untuk belanja",
        message: "Login dulu supaya produk masuk ke keranjangmu dan pesananmu tercatat.",
      });
    } else if (type === "wishlist") {
      setLoginPromptConfig({
        icon: "heart-outline",
        title: "Simpan ke wishlist",
        message: "Masuk dulu untuk menyimpan parfum favoritmu dan melihatnya lagi kapan saja.",
      });
    }
    setIsLoginPromptVisible(true);
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
      showLoginPrompt("cart");
      return;
    }

    try {
      setIsAdding(true);
      const result = await addToCart(product, selectedVariant, quantity);

      if (!result?.success) {
        showPopup(
          false,
          result?.message || "Produk gagal ditambahkan ke keranjang.",
          "cart"
        );
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showPopup(true, "Berhasil ditambahkan ke keranjang!", "cart");
    } catch (error) {
      console.error("Add to cart error:", error);
      showPopup(
        false,
        error?.message || "Terjadi kesalahan saat menambahkan produk.",
        "cart"
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlist = async () => {
    if (!user) {
      showLoginPrompt("wishlist");
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
  const totalPrice = (selectedVariant?.price || 0) * quantity;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Gambar Produk Utama */}
        <ProductImage
          filename={product.image_filename}
          style={styles.imagePlaceholder}
          iconSize={48}
        />

        <View style={styles.content}>
          {/* Brand & Tombol Aksi */}
          <View style={styles.headerRow}>
            <Text style={styles.brand}>{product.brand}</Text>
            <View style={styles.actionIconGroup}>
              <Pressable
                onPress={handleShare}
                style={styles.actionIconButton}
                hitSlop={10}
              >
                <Ionicons
                  name="share-social-outline"
                  size={22}
                  color={COLORS.text}
                />
              </Pressable>
              <Pressable
                onPress={handleWishlist}
                style={styles.actionIconButton}
                hitSlop={10}
              >
                <Ionicons
                  name={wishlistActive ? "heart" : "heart-outline"}
                  size={24}
                  color={wishlistActive ? "#FF4B4B" : COLORS.text}
                />
              </Pressable>
            </View>
          </View>

          {/* Nama Produk & Rating */}
          <Text style={styles.name}>{product.product_name}</Text>

          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color={COLORS.warning} />
              <Text style={styles.ratingBadgeText}>{avgRating.toFixed(1)}</Text>
            </View>
            <Text style={styles.totalReviewsText}>({totalReviews} ulasan)</Text>

            {!!product.concentration && (
              <View style={styles.concentrationBadge}>
                <Text style={styles.concentrationText}>
                  {product.concentration}
                </Text>
              </View>
            )}
          </View>

          {!!product.inspirator && (
            <View style={styles.inspiratorBox}>
              <Ionicons
                name="sparkles-outline"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.inspiratorText}>
                Terinspirasi dari:{" "}
                <Text style={{ fontWeight: "700", color: COLORS.text }}>
                  {product.inspirator}
                </Text>
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Card Pemilihan Ukuran Decant & Jumlah */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Pilih Ukuran Decant</Text>
              {selectedVariant?.in_stock && (
                <Text style={styles.stockBadge}>
                  Stok: {selectedVariant.stock} pcs
                </Text>
              )}
            </View>

            <View style={styles.variantRow}>
              {product.variants?.map((variant) => {
                const isSelected =
                  selectedVariant?.size_ml === variant.size_ml;
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
                      {variant.size_ml} ml
                    </Text>
                    <Text
                      style={[
                        styles.variantPriceText,
                        isSelected && styles.variantPriceTextActive,
                        !variant.in_stock && styles.variantPriceTextDisabled,
                      ]}
                    >
                      {formatRupiah(variant.price)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!selectedVariant?.in_stock && (
              <Text style={styles.outOfStockText}>
                ⚠️ Stok tidak mencukupi untuk ukuran ini
              </Text>
            )}

            {/* Pengatur Jumlah */}
            <View style={styles.qtyContainer}>
              <Text style={styles.qtyLabel}>Jumlah Pembelian</Text>
              <View style={styles.qtyRow}>
                <Pressable
                  style={[
                    styles.qtyButton,
                    quantity <= 1 && styles.qtyButtonDisabled,
                  ]}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
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
            </View>
          </View>

          <View style={styles.divider} />

          {/* Fragrance Notes */}
          {(product.top_notes || product.middle_notes || product.base_notes) && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Aroma (Fragrance Notes)</Text>

              <View style={styles.notesCard}>
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
                  <View style={[styles.noteRow, styles.noteRowBorder]}>
                    <Text style={styles.noteIcon}>🌸</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noteLabel}>MIDDLE NOTES</Text>
                      <Text style={styles.noteValue}>
                        {product.middle_notes}
                      </Text>
                    </View>
                  </View>
                )}

                {product.base_notes && (
                  <View style={[styles.noteRow, styles.noteRowBorder]}>
                    <Text style={styles.noteIcon}>🪵</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noteLabel}>BASE NOTES</Text>
                      <Text style={styles.noteValue}>{product.base_notes}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Main Accords */}
          {!!product.main_accords && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Karakter Utamanya (Main Accords)</Text>
              <View style={styles.accordRow}>
                {product.main_accords.split(",").map((accord, i) => (
                  <View key={i} style={styles.accordChip}>
                    <Text style={styles.accordChipText}>{accord.trim()}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Deskripsi */}
          {!!product.description && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Deskripsi Produk</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          )}

          {/* Pros & Cons */}
          {(product.pros || product.cons) && (
            <View style={styles.prosConsRow}>
              {product.pros && (
                <View style={[styles.prosConsBox, styles.prosBox]}>
                  <Text style={styles.prosTitle}>✓ Kelebihan</Text>
                  <Text style={styles.prosConsText}>{product.pros}</Text>
                </View>
              )}
              {product.cons && (
                <View style={[styles.prosConsBox, styles.consBox]}>
                  <Text style={styles.consTitle}>✕ Kekurangan</Text>
                  <Text style={styles.prosConsText}>{product.cons}</Text>
                </View>
              )}
            </View>
          )}

          {/* Produk Serupa */}
          {similarProducts.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Produk Serupa</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={similarProducts}
                keyExtractor={(item) => `similar-${item.id}`}
                contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
                renderItem={({ item }) => (
                  <SimilarProductCard
                    product={item}
                    onPress={() =>
                      navigation.push("ProductDetail", { productId: item.id })
                    }
                  />
                )}
              />
            </View>
          )}

          {/* Ulasan */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              Ulasan Pembeli ({reviews.length})
            </Text>

            {reviews.length === 0 ? (
              <View style={styles.emptyReviewBox}>
                <Ionicons
                  name="chatbox-ellipses-outline"
                  size={32}
                  color={COLORS.textFaint}
                />
                <Text style={styles.noReview}>
                  Belum ada ulasan untuk produk ini.
                </Text>
              </View>
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
                  {!!review.createdAt && (
                    <Text style={styles.reviewDate}>{review.createdAt}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceContainer}>
          <Text style={styles.bottomPriceLabel}>Total Harga</Text>
          <Text style={styles.bottomPriceValue}>{formatRupiah(totalPrice)}</Text>
        </View>

        <Pressable
          style={[
            styles.addButton,
            (!selectedVariant?.in_stock || isAdding) && styles.addButtonDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={!selectedVariant?.in_stock || isAdding}
        >
          {isAdding ? (
            <ActivityIndicator color={COLORS.text} size="small" />
          ) : (
            <View style={styles.addButtonContent}>
              <Ionicons name="cart-outline" size={20} color={COLORS.text} />
              <Text style={styles.addButtonText}>Keranjang</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Modal Popup Result Cart/Wishlist Success/Error */}
      <Modal visible={isCartModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons
                name={isSuccessAdd ? "checkmark-circle" : "warning"}
                size={52}
                color={isSuccessAdd ? COLORS.success || "#3DBA6C" : COLORS.warning}
              />
            </View>
            <Text style={styles.modalTitle}>
              {isSuccessAdd ? "Berhasil" : "Perhatian"}
            </Text>
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

      {/* Modal Popup: Harap Login Terlebih Dahulu */}
      <Modal visible={isLoginPromptVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.loginPromptCard}>
            <View style={styles.loginPromptIconWrap}>
              <Ionicons name={loginPromptConfig.icon} size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.loginPromptTitle}>{loginPromptConfig.title}</Text>
            <Text style={styles.loginPromptMessage}>{loginPromptConfig.message}</Text>

            <View style={styles.loginPromptActions}>
              <Pressable style={[styles.loginPromptBtn, styles.loginPromptCancel]} onPress={() => setIsLoginPromptVisible(false)}>
                <Text style={styles.loginPromptCancelText}>Nanti saja</Text>
              </Pressable>
              <Pressable 
                style={[styles.loginPromptBtn, styles.loginPromptConfirm]} 
                onPress={() => {
                  setIsLoginPromptVisible(false);
                  navigation.navigate("Login");
                }}
              >
                <Text style={styles.loginPromptConfirmText}>Masuk</Text>
              </Pressable>
            </View>

            <Pressable 
              onPress={() => {
                setIsLoginPromptVisible(false);
                navigation.navigate("Register");
              }} 
              hitSlop={8} 
              style={{ marginTop: 14 }}
            >
              <Text style={styles.loginPromptRegisterText}>
                Belum punya akun? <Text style={styles.loginPromptRegisterLink}>Daftar</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { paddingBottom: 110 }, // Memberi ruang agar tidak tertutup sticky footer

  imagePlaceholder: {
    height: 300,
    backgroundColor: COLORS.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },

  content: { padding: 20 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  actionIconGroup: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  name: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    marginTop: 6,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${COLORS.warning}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingBadgeText: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  totalReviewsText: { color: COLORS.textMuted, fontSize: 13 },
  concentrationBadge: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 4,
  },
  concentrationText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "600" },

  inspiratorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${COLORS.primary}10`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  inspiratorText: { color: COLORS.textMuted, fontSize: 13, flex: 1 },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 20,
  },

  // Sections
  sectionContainer: { marginTop: 8, marginBottom: 16 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stockBadge: { color: COLORS.primary, fontSize: 12, fontWeight: "600" },

  variantRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  variantChip: {
    flex: 1,
    minWidth: "45%",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    alignItems: "center",
  },
  variantChipActive: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  variantChipDisabled: { opacity: 0.4 },
  variantChipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "500" },
  variantChipTextActive: { color: COLORS.primary, fontWeight: "700" },
  variantChipTextDisabled: { color: COLORS.textFaint },
  variantPriceText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  variantPriceTextActive: { color: COLORS.primary },
  variantPriceTextDisabled: { color: COLORS.textFaint },

  outOfStockText: {
    color: COLORS.primary,
    fontSize: 12,
    marginTop: 10,
    fontWeight: "500",
  },

  qtyContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  qtyLabel: { color: COLORS.text, fontSize: 14, fontWeight: "600" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyButtonDisabled: { opacity: 0.3 },
  qtyButtonText: { color: COLORS.text, fontSize: 18, fontWeight: "600" },
  qtyValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    minWidth: 20,
    textAlign: "center",
  },

  // Notes & Accords
  notesCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 4 },
  noteRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 10,
    paddingTop: 10,
  },
  noteIcon: { fontSize: 20 },
  noteLabel: { color: COLORS.textFaint, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  noteValue: { color: COLORS.text, fontSize: 13, marginTop: 2, lineHeight: 18 },

  accordRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  accordChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  accordChipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "500" },

  descriptionText: { color: COLORS.textMuted, fontSize: 14, lineHeight: 22 },

  // Pros Cons
  prosConsRow: { flexDirection: "row", gap: 12, marginVertical: 12 },
  prosConsBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  prosBox: {
    backgroundColor: `${COLORS.success || "#3DBA6C"}10`,
    borderColor: `${COLORS.success || "#3DBA6C"}30`,
  },
  consBox: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: `${COLORS.primary}30`,
  },
  prosTitle: { color: COLORS.success || "#3DBA6C", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  consTitle: { color: COLORS.primary, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  prosConsText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },

  // Similar products
  similarCard: {
    width: 124,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  similarImagePlaceholder: {
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  similarBrand: { color: COLORS.textMuted, fontSize: 10, marginTop: 6, fontWeight: "500" },
  similarName: { color: COLORS.text, fontSize: 12, fontWeight: "600", marginTop: 2 },
  similarPrice: { color: COLORS.primary, fontSize: 12, fontWeight: "700", marginTop: 4 },

  // Reviews
  emptyReviewBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  noReview: { color: COLORS.textMuted, fontSize: 13, textAlign: "center" },
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewUser: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  reviewStars: { color: COLORS.warning, fontSize: 12, letterSpacing: 1 },
  reviewComment: { color: COLORS.textMuted, fontSize: 13, marginTop: 6, lineHeight: 18 },
  reviewDate: { color: COLORS.textFaint, fontSize: 11, marginTop: 6 },

  // Sticky Bottom Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  bottomPriceContainer: { flex: 1, marginRight: 16 },
  bottomPriceLabel: { color: COLORS.textMuted, fontSize: 11 },
  bottomPriceValue: { color: COLORS.primary, fontSize: 20, fontWeight: "800", marginTop: 2 },

  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 150,
  },
  addButtonDisabled: { opacity: 0.5 },
  addButtonContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  addButtonText: { color: COLORS.text, fontWeight: "700", fontSize: 15 },

  // Modal Overlay Shared Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    elevation: 5,
  },
  modalIconContainer: { marginBottom: 12 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  modalMessage: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  modalActionRow: { flexDirection: "row", gap: 10, width: "100%" },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnSecondary: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnSecondaryText: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  modalBtnPrimary: { backgroundColor: COLORS.primary },
  modalBtnPrimaryText: { color: COLORS.text, fontWeight: "700", fontSize: 14 },

  // Modal Login Prompt Styles
  loginPromptCard: { 
    backgroundColor: COLORS.surface, 
    borderRadius: 24, 
    padding: 24, 
    width: "100%", 
    maxWidth: 340, 
    alignItems: "center", 
    elevation: 8 
  },
  loginPromptIconWrap: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: `${COLORS.primary}18`, 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 16 
  },
  loginPromptTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  loginPromptMessage: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: 22, lineHeight: 22 },
  loginPromptActions: { flexDirection: "row", gap: 12, width: "100%" },
  loginPromptBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  loginPromptCancel: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  loginPromptCancelText: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  loginPromptConfirm: { backgroundColor: COLORS.primary },
  loginPromptConfirmText: { color: COLORS.text, fontWeight: "700", fontSize: 14 },
  loginPromptRegisterText: { color: COLORS.textMuted, fontSize: 12 },
  loginPromptRegisterLink: { color: COLORS.primary, fontWeight: "700" },
});