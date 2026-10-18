import { useState } from "react";
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet, ActivityIndicator, Keyboard, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useWishlist } from "../context/WishlistContext";
import AppTextInput from "../components/AppTextInput";
import ProductImage from "../components/ProductImage";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

export default function WishlistScreen({ navigation }) {
  const { favorites, isLoading, toggleWishlist, refresh } = useWishlist();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const validFavorites = favorites.filter((f) => f.product);
  
  const displayFavorites = validFavorites.filter((f) => {
    const q = searchQuery.toLowerCase();
    const brand = (f.product.brand || "").toLowerCase();
    const name = (f.product.product_name || "").toLowerCase();
    return brand.includes(q) || name.includes(q);
  });

  const onRefresh = async () => {
    setIsRefreshing(true);
    if (refresh) {
      await refresh();
    } else {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    setIsRefreshing(false);
  };

  const handleToggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedIds([]); 
  };

  const handleToggleItemSelection = (productId) => {
    if (selectedIds.includes(productId)) {
      setSelectedIds(selectedIds.filter((id) => id !== productId));
    } else {
      setSelectedIds([...selectedIds, productId]);
    }
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) {
      await toggleWishlist(id);
    }
    setSelectedIds([]);
    setIsSelectMode(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    Keyboard.dismiss();
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Wishlist Saya</Text>
          {validFavorites.length > 0 && (
            <Pressable onPress={handleToggleSelectMode} style={styles.selectButton}>
              <Text style={styles.selectButtonText}>
                {isSelectMode ? "Batal" : "Pilih"}
              </Text>
            </Pressable>
          )}
        </View>

        {validFavorites.length > 0 && (
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <View style={{ flex: 1 }}>
              <AppTextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cari parfum favoritmu..."
              />
            </View>
            {searchQuery ? (
              <Pressable onPress={clearSearch} style={styles.clearButton} hitSlop={15}>
                <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      {displayFavorites.length === 0 ? (
        <ScrollView contentContainerStyle={{ flex: 1 }} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 40 }}>🤍</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? "Parfum tidak ditemukan" : "Wishlist Kosong"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? "Coba kata kunci lain." : "Simpan parfum favoritmu di sini."}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={displayFavorites}
          keyExtractor={(item) => String(item.productId)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          renderItem={({ item }) => {
            const product = item.product;
            const lowestPrice = Math.min(...product.variants.map((v) => v.price));
            const isSelected = selectedIds.includes(product.id);

            return (
              <Pressable
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => {
                  if (isSelectMode) {
                    handleToggleItemSelection(product.id);
                  } else {
                    navigation.navigate("ProductDetail", { productId: product.id });
                  }
                }}
                onLongPress={() => {
                  if (!isSelectMode) {
                    setIsSelectMode(true);
                    setSelectedIds([product.id]);
                  }
                }}
              >
                {isSelectMode && (
                  <View style={styles.checkboxContainer}>
                    <Ionicons 
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                      size={24} 
                      color={isSelected ? COLORS.primary : COLORS.border} 
                    />
                  </View>
                )}

                <ProductImage filename={product.image_filename} style={styles.imagePlaceholder} iconSize={20} />
                
                <View style={{ flex: 1 }}>
                  <Text style={styles.brand}>{product.brand}</Text>
                  <Text style={styles.name}>{product.product_name}</Text>
                  <Text style={styles.price}>{formatRupiah(lowestPrice)}</Text>
                </View>

                {!isSelectMode && (
                  <Pressable onPress={() => toggleWishlist(product.id)} style={{ padding: 6 }} hitSlop={10}>
                    <Text style={{ fontSize: 18 }}>❤️</Text>
                  </Pressable>
                )}
              </Pressable>
            );
          }}
        />
      )}

      {!isSelectMode && (
        <Pressable 
          style={styles.fab} 
          onPress={() => navigation.navigate("MainTabs", { screen: "Katalog" })}
        >
          <Ionicons name="add" size={28} color={COLORS.text} />
        </Pressable>
      )}

      {isSelectMode && selectedIds.length > 0 && (
        <View style={styles.bottomBar}>
          <Text style={styles.selectedCountText}>{selectedIds.length} produk dipilih</Text>
          <Pressable style={styles.deleteButton} onPress={handleDeleteSelected}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.deleteButtonText}>Hapus</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 24 },
  
  header: { padding: 16, paddingBottom: 0 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
  selectButton: { paddingVertical: 4, paddingHorizontal: 8 },
  selectButtonText: { color: COLORS.primary, fontSize: 14, fontWeight: "600" },
  
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 14, marginBottom: 16 },
  searchInput: { backgroundColor: "transparent", borderWidth: 0, padding: 10, color: COLORS.text, fontSize: 13 },
  clearButton: { padding: 4 },

  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, marginTop: -50 },
  emptyTitle: { color: COLORS.text, fontSize: 15, marginTop: 10, fontWeight: "600" },
  emptySubtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  
  card: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COLORS.border },
  cardSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  checkboxContainer: { marginRight: 12 },
  imagePlaceholder: { width: 50, height: 50, borderRadius: 6, backgroundColor: COLORS.surfaceLight, marginRight: 10 },
  brand: { color: COLORS.textMuted, fontSize: 10 },
  name: { color: COLORS.text, fontSize: 13, fontWeight: "600", marginTop: 2 },
  price: { color: COLORS.primary, fontSize: 13, fontWeight: "600", marginTop: 4 },

  fab: { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: 32 },
  selectedCountText: { color: COLORS.text, fontSize: 14, fontWeight: "600" },
  deleteButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#FF4B4B", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, gap: 6 },
  deleteButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});