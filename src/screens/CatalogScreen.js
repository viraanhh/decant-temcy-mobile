import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../constants/theme";
import { getProducts } from "../services/productService";
import ProductImage from "../components/ProductImage";
import AppTextInput from "../components/AppTextInput";

const PAGE_LIMIT = 12;

const CATEGORY_OPTIONS = [
  { value: "", label: "Semua Aroma" },
  { value: "Floral", label: "Floral" },
  { value: "Woody", label: "Woody" },
  { value: "Citrus", label: "Citrus" },
  { value: "Spicy", label: "Spicy" },
  { value: "Aquatic", label: "Aquatic" },
  { value: "Fresh", label: "Fresh" },
  { value: "Vanilla", label: "Vanilla" },
  { value: "Musky", label: "Musky" },
];
const GENDER_OPTIONS = [
  { value: "", label: "Semua Gender" },
  { value: "Male", label: "Pria" },
  { value: "Female", label: "Wanita" },
  { value: "Unisex", label: "Unisex" },
];
const CONCENTRATION_OPTIONS = [
  { value: "", label: "Semua Tipe" },
  { value: "EDP", label: "EDP" },
  { value: "Extrait", label: "Extrait" },
  { value: "EDT", label: "EDT" },
];
const SORT_OPTIONS = [
  { value: "", label: "Terbaru" },
  { value: "terlaris", label: "Terlaris" },
  { value: "termurah", label: "Termurah" },
  { value: "termahal", label: "Termahal" },
];

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function ProductCard({ product, onPress }) {
  const lowestPrice = Math.min(...product.variants.map((v) => v.price));
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <ProductImage filename={product.image_filename} style={styles.imagePlaceholder} iconSize={28} />
      <View style={styles.cardInfo}>
        <Text style={styles.brand}>{product.brand}</Text>
        <Text style={styles.name} numberOfLines={1}>{product.product_name}</Text>
        <Text style={styles.category} numberOfLines={1}>{product.concentration}</Text>
        <View style={styles.bottomRow}>
          <Text style={styles.price}>{formatRupiah(lowestPrice)}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="flame-outline" size={11} color={COLORS.textMuted} />
            <Text style={styles.rating}>{product.sold_count} terjual</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function FilterChipGroup({ options, value, onChange }) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={options}
      keyExtractor={(item) => item.value || item.label}
      contentContainerStyle={{ gap: 8 }}
      renderItem={({ item }) => {
        const isActive = value === item.value;
        return (
          <Pressable style={[styles.chip, isActive && styles.chipActive]} onPress={() => onChange(item.value)}>
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{item.label}</Text>
          </Pressable>
        );
      }}
    />
  );
}

function Pagination({ page, totalPages, onChangePage, disabled }) {
  if (totalPages <= 1) return null;
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pageNumbers = [];
  for (let p = start; p <= end; p++) pageNumbers.push(p);

  return (
    <View style={styles.pagination}>
      <Pressable style={[styles.pageArrow, (page <= 1 || disabled) && styles.pageButtonDisabled]} onPress={() => onChangePage(page - 1)} disabled={page <= 1 || disabled}>
        <Ionicons name="chevron-back" size={16} color={page <= 1 ? COLORS.textFaint : COLORS.text} />
      </Pressable>
      {start > 1 && (
        <>
          <Pressable style={styles.pageButton} onPress={() => onChangePage(1)} disabled={disabled}><Text style={styles.pageButtonText}>1</Text></Pressable>
          {start > 2 && <Text style={styles.pageEllipsis}>…</Text>}
        </>
      )}
      {pageNumbers.map((p) => (
        <Pressable key={p} style={[styles.pageButton, p === page && styles.pageButtonActive]} onPress={() => onChangePage(p)} disabled={disabled}>
          <Text style={[styles.pageButtonText, p === page && styles.pageButtonTextActive]}>{p}</Text>
        </Pressable>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <Text style={styles.pageEllipsis}>…</Text>}
          <Pressable style={styles.pageButton} onPress={() => onChangePage(totalPages)} disabled={disabled}><Text style={styles.pageButtonText}>{totalPages}</Text></Pressable>
        </>
      )}
      <Pressable style={[styles.pageArrow, (page >= totalPages || disabled) && styles.pageButtonDisabled]} onPress={() => onChangePage(page + 1)} disabled={page >= totalPages || disabled}>
        <Ionicons name="chevron-forward" size={16} color={page >= totalPages ? COLORS.textFaint : COLORS.text} />
      </Pressable>
    </View>
  );
}

export default function CatalogScreen({ navigation, route }) {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState(route?.params?.search || "");
  const [filters, setFilters] = useState({
    search: route?.params?.search || "",
    gender: route?.params?.gender || "",
    concentration: "",
    sort: "",
  });

  // PENTING: CatalogScreen ini SEBUAH TAB — kalau sudah pernah dibuka,
  // navigate() ulang ke sini TIDAK remount komponennya, jadi params baru
  // tidak pernah kebaca kalau cuma diambil lewat useState() awal saja.
  // useEffect ini yang membuat filter benar-benar ikut ter-update tiap
  // kali datang dari Home dengan kategori/gender berbeda.
  useEffect(() => {
    if (route?.params?.search !== undefined) {
      setSearchInput(route.params.search);
      setFilters((prev) => ({ ...prev, search: route.params.search }));
    }
    if (route?.params?.gender !== undefined) {
      setFilters((prev) => ({ ...prev, gender: route.params.gender }));
    }
  }, [route?.params?.search, route?.params?.gender]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    loadPage(1);
  }, [filters]);

  const loadPage = async (pageNumber) => {
    setIsLoading(true);
    setError("");
    try {
      const result = await getProducts({
        page: pageNumber,
        limit: PAGE_LIMIT,
        search: filters.search || undefined,
        gender: filters.gender || undefined,
        concentration: filters.concentration || undefined,
        sort: filters.sort || undefined,
      });
      setProducts(result.products);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (err) {
      setError("Gagal memuat produk, coba lagi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePage = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === page || isLoading) return;
    loadPage(newPage);
  };

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  // Chip kategori/aroma "nempel" ke kolom search yang sama (backend cuma
  // punya satu parameter `search`, bukan field kategori terpisah) — jadi
  // pilih chip = isi searchInput dengan nama aromanya.
  const handleCategoryChip = (value) => setSearchInput(value);

  const clearFilters = () => {
    setSearchInput("");
    setFilters({ search: "", gender: "", concentration: "", sort: "" });
  };

  const hasActiveFilters = filters.search || filters.gender || filters.concentration || filters.sort;

  const displayData =
    products.length % 2 !== 0 ? [...products, { id: "__placeholder__", isPlaceholder: true }] : products;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Katalog Parfum</Text>
        <Text style={styles.headerSubtitle}>{total} produk tersedia · Halaman {page} dari {totalPages}</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <AppTextInput
          style={styles.searchInput}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Cari parfum, brand, aroma..."
        />
        {!!searchInput && (
          <Pressable onPress={() => setSearchInput("")}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </Pressable>
        )}
      </View>

      <View style={{ paddingLeft: SPACING.lg, marginTop: SPACING.sm }}>
        <FilterChipGroup options={CATEGORY_OPTIONS} value={searchInput} onChange={handleCategoryChip} />
      </View>
      <View style={{ paddingLeft: SPACING.lg, marginTop: SPACING.sm }}>
        <FilterChipGroup options={GENDER_OPTIONS} value={filters.gender} onChange={(v) => updateFilter("gender", v)} />
      </View>
      <View style={{ paddingLeft: SPACING.lg, marginTop: SPACING.sm }}>
        <FilterChipGroup options={CONCENTRATION_OPTIONS} value={filters.concentration} onChange={(v) => updateFilter("concentration", v)} />
      </View>
      <View style={{ paddingLeft: SPACING.lg, marginTop: SPACING.sm, marginBottom: SPACING.sm }}>
        <FilterChipGroup options={SORT_OPTIONS} value={filters.sort} onChange={(v) => updateFilter("sort", v)} />
      </View>

      {hasActiveFilters && (
        <Pressable style={styles.resetButton} onPress={clearFilters}>
          <Ionicons name="refresh-circle" size={18} color={COLORS.primary} />
          <Text style={styles.resetButtonText}>Reset Filter</Text>
        </Pressable>
      )}

      {isLoading && products.length === 0 ? (
        <View style={styles.centerContainer}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : error && products.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLORS.textFaint} />
          <Text style={{ color: COLORS.textMuted, marginTop: 10, marginBottom: 12 }}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => loadPage(page)}><Text style={styles.retryButtonText}>Coba Lagi</Text></Pressable>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={{ fontSize: 40 }}>🔍</Text>
          <Text style={styles.emptyTitle}>Produk tidak ditemukan</Text>
          <Text style={styles.emptySubtitle}>Coba ubah filter atau kata kunci pencarian</Text>
          <Pressable style={styles.retryButton} onPress={clearFilters}><Text style={styles.retryButtonText}>Reset Filter</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: SPACING.md }}
          contentContainerStyle={{ gap: SPACING.md, padding: SPACING.lg, paddingTop: SPACING.sm }}
          keyboardDismissMode="on-drag"
          renderItem={({ item }) =>
            item.isPlaceholder ? (
              <View style={[styles.card, { backgroundColor: "transparent", borderWidth: 0 }]} />
            ) : (
              <ProductCard product={item} onPress={() => navigation.navigate("ProductDetail", { productId: item.id })} />
            )
          }
          ListFooterComponent={<Pagination page={page} totalPages={totalPages} onChangePage={handleChangePage} disabled={isLoading} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xl },
  header: { padding: SPACING.lg, paddingBottom: SPACING.sm },
  headerTitle: { color: COLORS.text, fontSize: 22, fontWeight: "700" },
  headerSubtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14 },
  searchInput: { flex: 1, backgroundColor: "transparent", borderWidth: 0, padding: 10, color: COLORS.text, fontSize: 13 },
  chip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingVertical: 7, paddingHorizontal: 14 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 11 },
  chipTextActive: { color: COLORS.text, fontWeight: "700" },
  resetButton: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, marginLeft: SPACING.lg, marginTop: 8, marginBottom: 6 },
  resetButtonText: { color: COLORS.primary, fontSize: 13, fontWeight: "700" },
  emptyTitle: { color: COLORS.text, fontSize: 15, fontWeight: "600", marginTop: 12 },
  emptySubtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, textAlign: "center" },
  retryButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 20, marginTop: 12 },
  retryButtonText: { color: COLORS.primary, fontWeight: "600" },
  card: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border, ...CARD_SHADOW },
  imagePlaceholder: { height: 120, backgroundColor: COLORS.surfaceLight, alignItems: "center", justifyContent: "center", width: "100%" },
  cardInfo: { padding: SPACING.sm },
  brand: { color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  name: { color: COLORS.text, fontSize: 13, fontWeight: "600", marginTop: 3 },
  category: { color: COLORS.textFaint, fontSize: 10, marginTop: 2 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  price: { color: COLORS.primary, fontSize: 13, fontWeight: "700" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  rating: { color: COLORS.textMuted, fontSize: 11 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: SPACING.sm, marginBottom: SPACING.lg },
  pageArrow: { width: 32, height: 32, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  pageButton: { minWidth: 32, height: 32, paddingHorizontal: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  pageButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pageButtonDisabled: { opacity: 0.4 },
  pageButtonText: { color: COLORS.text, fontSize: 13, fontWeight: "500" },
  pageButtonTextActive: { color: COLORS.text, fontWeight: "700" },
  pageEllipsis: { color: COLORS.textMuted, fontSize: 13, marginHorizontal: 2 },
});