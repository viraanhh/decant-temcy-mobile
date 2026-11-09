import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl, Animated } from "react-native";
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
const RATING_OPTIONS = [
  { value: "", label: "Semua Rating" },
  { value: "4", label: "★ 4 ke atas" },
  { value: "3", label: "★ 3 ke atas" },
];

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function ProductCard({ product, onPress }) {
  const lowestPrice = Math.min(...product.variants.map((v) => v.price));
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <ProductImage filename={product.image_filename} style={styles.imagePlaceholder} iconSize={32} />
      <View style={styles.cardInfo}>
        <Text style={styles.brand}>{product.brand}</Text>
        <Text style={styles.name} numberOfLines={1}>{product.product_name}</Text>
        
        <Text style={styles.category} numberOfLines={1}>{product.concentration}</Text>
        {product.review_count > 0 && (
          <View style={styles.ratingLine}>
            <Ionicons name="star" size={11} color={COLORS.warning} />
            <Text style={styles.ratingLineText}>
              {product.avg_rating.toFixed(1)} ({product.review_count})
            </Text>
          </View>
        )}

        <View style={styles.bottomRow}>
          <Text style={styles.price}>{formatRupiah(lowestPrice)}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="flame" size={12} color={COLORS.primary} />
            <Text style={styles.rating}>{product.sold_count} terjual</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// === KOMPONEN FILTER COLLAPSIBLE ===
function CollapsibleFilterSection({ title, options, value, onChange, isExpanded, onToggle }) {
  return (
    <View style={styles.filterSection}>
      <Pressable style={styles.filterHeader} onPress={onToggle}>
        <Text style={styles.filterTitle}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {value !== "" && <View style={styles.activeDot} />}
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={COLORS.textMuted} />
        </View>
      </Pressable>
      
      {isExpanded && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={options}
          keyExtractor={(item) => item.value || item.label}
          contentContainerStyle={{ gap: 8, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm }}
          renderItem={({ item }) => {
            const isActive = value === item.value;
            return (
              <Pressable style={[styles.chip, isActive && styles.chipActive]} onPress={() => onChange(item.value)}>
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
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
        <Ionicons name="chevron-back" size={20} color={page <= 1 ? COLORS.textFaint : COLORS.text} />
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
        <Ionicons name="chevron-forward" size={20} color={page >= totalPages ? COLORS.textFaint : COLORS.text} />
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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedFilter, setExpandedFilter] = useState(null); // Menyimpan ID filter yang sedang dibuka

  const [searchInput, setSearchInput] = useState(route?.params?.search || "");
  const [filters, setFilters] = useState({
    search: route?.params?.search || "",
    gender: route?.params?.gender || "",
    concentration: "",
    sort: "",
    minRating: "",
  });

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
        min_rating: filters.minRating || undefined,
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

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadPage(1);
    setIsRefreshing(false);
  };

  const handleChangePage = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === page || isLoading) return;
    loadPage(newPage);
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    // Opsional: Tutup filter setelah memilih
    // setExpandedFilter(null);
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters({ search: "", gender: "", concentration: "", sort: "", minRating: "" });
    setExpandedFilter(null);
  };

  const toggleFilter = (filterKey) => {
    setExpandedFilter(expandedFilter === filterKey ? null : filterKey);
  };

  const hasActiveFilters = filters.gender || filters.concentration || filters.sort || filters.minRating;
  const displayData = products.length % 2 !== 0 ? [...products, { id: "__placeholder__", isPlaceholder: true }] : products;

  const ListHeader = () => (
    <View style={styles.filtersContainer}>
      <CollapsibleFilterSection 
        title="Urutkan" 
        options={SORT_OPTIONS} 
        value={filters.sort} 
        onChange={(v) => updateFilter("sort", v)} 
        isExpanded={expandedFilter === "sort"}
        onToggle={() => toggleFilter("sort")}
      />
      <View style={styles.filterDivider} />
      
      {/* Jika kamu mencari berdasarkan searchInput alih-alih filter state, kamu mungkin perlu menyesuaikan props value/onChange di bawah */}
      <CollapsibleFilterSection 
        title="Aroma (Notes)" 
        options={CATEGORY_OPTIONS} 
        value={filters.search} // Di kode asli, ini menggunakan searchInput
        onChange={(v) => setSearchInput(v)} 
        isExpanded={expandedFilter === "notes"}
        onToggle={() => toggleFilter("notes")}
      />
      <View style={styles.filterDivider} />

      <CollapsibleFilterSection 
        title="Peruntukan (Gender)" 
        options={GENDER_OPTIONS} 
        value={filters.gender} 
        onChange={(v) => updateFilter("gender", v)} 
        isExpanded={expandedFilter === "gender"}
        onToggle={() => toggleFilter("gender")}
      />
      <View style={styles.filterDivider} />

      <CollapsibleFilterSection 
        title="Tipe Parfum" 
        options={CONCENTRATION_OPTIONS} 
        value={filters.concentration} 
        onChange={(v) => updateFilter("concentration", v)} 
        isExpanded={expandedFilter === "concentration"}
        onToggle={() => toggleFilter("concentration")}
      />
      <View style={styles.filterDivider} />

      <CollapsibleFilterSection 
        title="Minimal Rating" 
        options={RATING_OPTIONS} 
        value={filters.minRating} 
        onChange={(v) => updateFilter("minRating", v)} 
        isExpanded={expandedFilter === "rating"}
        onToggle={() => toggleFilter("rating")}
      />

      {hasActiveFilters && (
        <Pressable style={styles.resetButton} onPress={clearFilters}>
          <Ionicons name="refresh" size={16} color={COLORS.primary} />
          <Text style={styles.resetButtonText}>Reset Semua Filter</Text>
        </Pressable>
      )}
      <View style={styles.bottomHeaderSpacing} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Sticky Header & Search */}
      <View style={styles.stickyHeader}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Katalog Parfum</Text>
          <Text style={styles.headerSubtitle}>{total} produk tersedia</Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <AppTextInput
            style={styles.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Cari parfum, brand, aroma..."
          />
          {!!searchInput && (
            <Pressable onPress={() => setSearchInput("")} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Main Content */}
      {isLoading && products.length === 0 ? (
        <View style={styles.centerContainer}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : error && products.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textFaint} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => loadPage(page)}><Text style={styles.retryButtonText}>Coba Lagi</Text></Pressable>
        </View>
      ) : products.length === 0 ? (
        <FlatList
          key="list-empty"
          data={[]}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>Produk tidak ditemukan</Text>
              <Text style={styles.emptySubtitle}>Coba ubah filter atau kata kunci pencarian lainnya.</Text>
              <Pressable style={styles.retryButton} onPress={clearFilters}><Text style={styles.retryButtonText}>Reset Filter</Text></Pressable>
            </View>
          }
        />
      ) : (
        <FlatList
          key="list-2-cols"
          data={displayData}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.flatListContent}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) =>
            item.isPlaceholder ? (
              <View style={[styles.card, { backgroundColor: "transparent", borderWidth: 0, elevation: 0 }]} />
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
  
  // Sticky Header
  stickyHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  headerTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: SPACING.md },
  headerTitle: { color: COLORS.text, fontSize: 24, fontWeight: "800" },
  headerSubtitle: { color: COLORS.textMuted, fontSize: 13, marginBottom: 3 },
  
  // Search
  searchBox: { 
    flexDirection: "row", alignItems: "center", gap: 8, 
    backgroundColor: COLORS.surface, 
    borderWidth: 1, borderColor: COLORS.border, 
    borderRadius: RADIUS.lg, 
    paddingHorizontal: 16, paddingVertical: 4
  },
  searchInput: { flex: 1, backgroundColor: "transparent", borderWidth: 0, paddingVertical: 8, color: COLORS.text, fontSize: 14 },
  
  // Filters Header Area
  filtersContainer: { backgroundColor: COLORS.surface, paddingBottom: SPACING.md },
  bottomHeaderSpacing: { height: SPACING.lg, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.md },
  filterSection: { backgroundColor: COLORS.surface },
  filterHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.lg, 
    paddingVertical: 14,
  },
  filterDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.lg },
  filterTitle: { color: COLORS.text, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  
  chip: { 
    backgroundColor: COLORS.background, 
    borderWidth: 1, borderColor: COLORS.border, 
    borderRadius: RADIUS.full, 
    paddingVertical: 8, paddingHorizontal: 16 
  },
  chipActive: { backgroundColor: `${COLORS.primary}15`, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "500" },
  chipTextActive: { color: COLORS.primary, fontWeight: "700" },
  
  resetButton: { 
    flexDirection: "row", alignItems: "center", gap: 6, 
    alignSelf: "center", 
    backgroundColor: COLORS.background, 
    borderWidth: 1, borderColor: COLORS.primary, 
    borderRadius: RADIUS.full, 
    paddingVertical: 10, paddingHorizontal: 20, 
    marginTop: SPACING.md
  },
  resetButtonText: { color: COLORS.primary, fontSize: 12, fontWeight: "700" },
  
  // Empty & Error States
  emptyContainer: { alignItems: "center", justifyContent: "center", padding: SPACING.xl, marginTop: 40 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginTop: 16 },
  emptySubtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 6, textAlign: "center", lineHeight: 20 },
  errorText: { color: COLORS.textMuted, fontSize: 14, marginTop: 12, marginBottom: 16, textAlign: "center" },
  retryButton: { 
    backgroundColor: COLORS.surface, 
    borderWidth: 1, borderColor: COLORS.border, 
    borderRadius: RADIUS.md, 
    paddingVertical: 12, paddingHorizontal: 24, 
    marginTop: 16 
  },
  retryButtonText: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },
  
  // Product List
  flatListContent: { paddingBottom: SPACING.xl },
  columnWrapper: { gap: SPACING.md, paddingHorizontal: SPACING.lg },
  
  // Product Card
  card: { 
    flex: 1, 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.lg, 
    overflow: "hidden", 
    borderWidth: 1, borderColor: COLORS.border, 
    ...CARD_SHADOW,
    marginBottom: SPACING.md
  },
  imagePlaceholder: { height: 160, backgroundColor: COLORS.surfaceLight, alignItems: "center", justifyContent: "center", width: "100%" },
  cardInfo: { padding: 12 },
  brand: { color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "600" },
  name: { color: COLORS.text, fontSize: 14, fontWeight: "700", marginTop: 4, lineHeight: 18 },
  category: { color: COLORS.textFaint, fontSize: 11, marginTop: 2 },
  
  ratingLine: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  ratingLineText: { color: COLORS.textMuted, fontSize: 10 },

  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  price: { color: COLORS.primary, fontSize: 14, fontWeight: "800" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  rating: { color: COLORS.textMuted, fontSize: 11, fontWeight: "500" },
  
  // Pagination
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: SPACING.xl },
  pageArrow: { 
    width: 40, height: 40, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, borderColor: COLORS.border, 
    backgroundColor: COLORS.surface,
    alignItems: "center", justifyContent: "center" 
  },
  pageButton: { 
    minWidth: 40, height: 40, paddingHorizontal: 10, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, borderColor: COLORS.border, 
    backgroundColor: COLORS.surface,
    alignItems: "center", justifyContent: "center" 
  },
  pageButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pageButtonDisabled: { opacity: 0.3 },
  pageButtonText: { color: COLORS.text, fontSize: 14, fontWeight: "600" },
  pageButtonTextActive: { color: COLORS.text, fontWeight: "800" },
  pageEllipsis: { color: COLORS.textMuted, fontSize: 14, marginHorizontal: 4, fontWeight: "700" },
});