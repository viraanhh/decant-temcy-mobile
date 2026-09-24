import { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, FlatList, Pressable, StyleSheet, ActivityIndicator, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { getProducts } from "../services/productService";
import { getHomeRecommendations } from "../services/recommendationService";
import ProductImage from "../components/ProductImage";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

const MARQUEE_BRANDS = ["AFNAN", "AMTHRA", "AOERA", "MAISON MARGIELA", "LATTAFA", "MONTALE", "INITIO", "MANCERA"];

const CATEGORIES = [
  { label: "Floral", icon: "flower-outline", query: "Floral" },
  { label: "Woody", icon: "leaf-outline", query: "Woody" },
  { label: "Citrus", icon: "sunny-outline", query: "Citrus" },
  { label: "Spicy", icon: "flame-outline", query: "Spicy" },
  { label: "Aquatic", icon: "water-outline", query: "Aquatic" },
  { label: "Fresh", icon: "leaf", query: "Fresh" },
  { label: "Vanilla", icon: "ice-cream-outline", query: "Vanilla" },
  { label: "Musky", icon: "cloud-outline", query: "Musky" },
];

function BrandMarquee() {
  const scrollX = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null); // Menyimpan instance animasi
  const isFocused = useIsFocused();  // Mengecek apakah tab sedang aktif
  const itemWidth = 160; // perkiraan lebar tiap brand + spasi

  useEffect(() => {
    const totalWidth = itemWidth * MARQUEE_BRANDS.length;

    // 1. Inisialisasi animasi hanya sekali agar tidak mereset posisi scroll
    if (!animationRef.current) {
      animationRef.current = Animated.loop(
        Animated.timing(scrollX, {
          toValue: -totalWidth,
          duration: 15000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
    }

    // 2. Play / Pause berdasarkan status fokus tab
    if (isFocused) {
      animationRef.current.start();
    } else {
      animationRef.current.stop();
    }

    // 3. Cleanup: Hentikan animasi saat komponen benar-benar di-unmount
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [isFocused, scrollX]);

  const doubledBrands = [...MARQUEE_BRANDS, ...MARQUEE_BRANDS];

  return (
    <View style={styles.marqueeContainer}>
      <Animated.View style={[styles.marqueeRow, { transform: [{ translateX: scrollX }] }]}>
        {doubledBrands.map((brand, i) => (
          <View key={i} style={styles.marqueeItem}>
            <Text style={styles.marqueeText}>{brand}</Text>
            <Text style={styles.marqueeDot}>◆</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function MiniProductCard({ product, onPress }) {
  const lowestPrice = Math.min(...product.variants.map((v) => v.price));
  return (
    <Pressable style={styles.miniCard} onPress={onPress}>
      <ProductImage filename={product.image_filename} style={styles.miniImagePlaceholder} iconSize={26} />
      <Text style={styles.miniBrand}>{product.brand}</Text>
      <Text style={styles.miniName} numberOfLines={1}>{product.product_name}</Text>
      <View style={styles.miniBottomRow}>
        <Text style={styles.miniPrice}>{formatRupiah(lowestPrice)}</Text>
        <Text style={styles.miniRatingText}>{product.sold_count} terjual</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    getProducts({ page: 1, limit: 20 })
      .then((result) => {
        setProducts(result.products);
      })
      .catch(() => {
        setProducts([]);
      })
      .finally(() => setIsLoading(false));

    getHomeRecommendations(!!user).then(setRecommendations);
  }, [user]);

  const goToDetail = (id) => navigation.navigate("ProductDetail", { productId: id });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>
                {user ? `Halo, ${user.name.split(" ")[0]} 👋` : "Selamat Datang 👋"}
              </Text>
              <Text style={styles.subGreeting}>Temukan parfum favoritmu hari ini</Text>
            </View>
          </View>
        </View>

        {/* Banner */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <Text style={styles.bannerLabel}>PROMO SPESIAL MAHASISWA BARU</Text>
          <Text style={styles.bannerText}>Diskon 10%{"\n"}Hanya Dengan Menunjukkan KTM</Text>
        </LinearGradient>

        <BrandMarquee />

        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="flame" size={16} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Produk Populer</Text>
              </View>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={products}
                keyExtractor={(item) => `popular-${item.id}`}
                contentContainerStyle={{ gap: SPACING.md, paddingRight: SPACING.lg }}
                renderItem={({ item }) => <MiniProductCard product={item} onPress={() => goToDetail(item.id)} />}
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="sparkles" size={16} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Rekomendasi Untukmu</Text>
              </View>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={recommendations}
                keyExtractor={(item) => `rec-${item.id}`}
                contentContainerStyle={{ gap: SPACING.md, paddingRight: SPACING.lg }}
                renderItem={({ item }) => <MiniProductCard product={item} onPress={() => goToDetail(item.id)} />}
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Produk Terbaru</Text>
              </View>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={products}
                keyExtractor={(item) => `new-${item.id}`}
                contentContainerStyle={{ gap: SPACING.md, paddingRight: SPACING.lg }}
                renderItem={({ item }) => <MiniProductCard product={item} onPress={() => goToDetail(item.id)} />}
              />
            </View>

            <View style={[styles.section, { marginTop: SPACING.lg, marginBottom: SPACING.xl }]}>
              <Text style={styles.sectionTitle}>Jelajahi Berdasarkan Aroma</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.label}
                    style={styles.categoryChip}
                    onPress={() => navigation.navigate("Katalog", { search: cat.query })}
                  >
                    <Ionicons name={cat.icon} size={14} color={COLORS.textMuted} />
                    <Text style={styles.categoryChipText}>{cat.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingBottom: 0 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { color: COLORS.text, fontSize: 22, fontWeight: "700" },
  subGreeting: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  chatButton: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.full, width: 42, height: 42, alignItems: "center", justifyContent: "center",
    ...CARD_SHADOW,
  },
  banner: { margin: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.xl, ...CARD_SHADOW },
  bannerLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  bannerText: { color: COLORS.text, fontSize: 20, fontWeight: "700", lineHeight: 26, marginTop: 6 },
  marqueeContainer: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, paddingVertical: 14, overflow: "hidden", backgroundColor: COLORS.surface, marginTop: SPACING.sm },
  marqueeRow: { flexDirection: "row" },
  marqueeItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  marqueeText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  marqueeDot: { color: COLORS.primary, fontSize: 8 },
  section: { marginTop: SPACING.sm, paddingLeft: SPACING.lg },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: SPACING.md },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  categoryChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.full, paddingVertical: 9, paddingHorizontal: 16,
  },
  categoryChipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "500" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingRight: SPACING.lg, marginTop: SPACING.md },
  miniCard: { width: 138, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, ...CARD_SHADOW },
  miniImagePlaceholder: { height: 84, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceLight, alignItems: "center", justifyContent: "center", width: "100%" },
  miniBrand: { color: COLORS.textMuted, fontSize: 9, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  miniName: { color: COLORS.text, fontSize: 13, fontWeight: "600", marginTop: 2 },
  miniBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  miniPrice: { color: COLORS.primary, fontSize: 12, fontWeight: "700" },
  miniRatingText: { color: COLORS.textMuted, fontSize: 10 },
});