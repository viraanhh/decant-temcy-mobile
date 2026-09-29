import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, Keyboard, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getAllProducts } from "../../services/productService";
import { deleteAdminProduct } from "../../services/adminService";
import ProductImage from "../../components/ProductImage";
import AppTextInput from "../../components/AppTextInput";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

export default function AdminProductListScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // State Pull-to-Refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      getAllProducts().then(setProducts).finally(() => setIsLoading(false));
    }, [])
  );

  // Handler Pull-to-Refresh
  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await getAllProducts();
      setProducts(data);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = (product) => {
    const productId = product.product_id || product.id;
    Alert.alert(
      "Hapus Produk",
      `Nonaktifkan "${product.product_name}"? Produk tidak akan tampil lagi di katalog customer.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus", style: "destructive",
          onPress: async () => {
            await deleteAdminProduct(productId);
            setProducts((prev) => prev.filter((p) => (p.product_id || p.id) !== productId));
          },
        },
      ]
    );
  };

  const clearSearch = () => {
    setSearchQuery("");
    Keyboard.dismiss();
  };

  const filteredProducts = products.filter((p) =>
    `${p.brand} ${p.product_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Kelola Produk</Text>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate("AdminProductForm")}>
          <Ionicons name="add" size={20} color={COLORS.text} />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <AppTextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cari produk atau brand..."
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={clearSearch} style={styles.clearButton} hitSlop={10}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : filteredProducts.length === 0 ? (
        <ScrollView contentContainerStyle={{ flex: 1 }} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
          <Text style={{ color: COLORS.textMuted, textAlign: "center", marginTop: 40 }}>
            {searchQuery ? "Produk tidak ditemukan." : "Belum ada produk."}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item, index) => `prod-${item.product_id || item.id || 'x'}-${index}`}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("AdminProductForm", { product: item })}
            >
              <ProductImage filename={item.image_filename} style={styles.cardImage} iconSize={22} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardBrand}>{item.brand}</Text>
                <Text style={styles.cardName} numberOfLines={1}>{item.product_name}</Text>
                <Text style={styles.cardStock}>Stok: {item.stock_ml}ml · {formatRupiah(item.variants?.[0]?.price)}</Text>
              </View>
              <Pressable onPress={() => handleDelete(item)} style={{ padding: 6 }}>
                <Ionicons name="trash-outline" size={18} color={COLORS.primary} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: SPACING.lg, paddingBottom: SPACING.sm },
  title: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
  addButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14 },
  searchInput: { flex: 1, backgroundColor: "transparent", borderWidth: 0, padding: 10, color: COLORS.text },
  clearButton: { padding: 4 },
  card: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.sm, ...CARD_SHADOW },
  cardImage: { width: 50, height: 50, borderRadius: RADIUS.sm },
  cardBrand: { color: COLORS.textMuted, fontSize: 10 },
  cardName: { color: COLORS.text, fontSize: 13, fontWeight: "600", marginTop: 2 },
  cardStock: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
});