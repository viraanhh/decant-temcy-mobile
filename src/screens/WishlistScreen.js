import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS } from "../constants/colors";
import { useWishlist } from "../context/WishlistContext";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

export default function WishlistScreen({ navigation }) {
  const { favorites, isLoading, toggleWishlist } = useWishlist();

  // Item hasil optimistic update yang belum sempat direfresh (product masih null)
  const displayFavorites = favorites.filter((f) => f.product);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (displayFavorites.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ fontSize: 40 }}>🤍</Text>
        <Text style={styles.emptyTitle}>Wishlist Kosong</Text>
        <Text style={styles.emptySubtitle}>Simpan parfum favoritmu di sini.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={displayFavorites}
        keyExtractor={(item) => String(item.productId)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => {
          const product = item.product;
          const lowestPrice = Math.min(...product.variants.map((v) => v.price));
          return (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("ProductDetail", { productId: product.id })}
            >
              <View style={styles.imagePlaceholder} />
              <View style={{ flex: 1 }}>
                <Text style={styles.brand}>{product.brand}</Text>
                <Text style={styles.name}>{product.product_name}</Text>
                <Text style={styles.price}>{formatRupiah(lowestPrice)}</Text>
              </View>
              <Pressable onPress={() => toggleWishlist(product.id)} style={{ padding: 6 }}>
                <Text style={{ fontSize: 18 }}>❤️</Text>
              </Pressable>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { color: COLORS.text, fontSize: 15, marginTop: 10 },
  emptySubtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COLORS.border },
  imagePlaceholder: { width: 50, height: 50, borderRadius: 6, backgroundColor: COLORS.surfaceLight, marginRight: 10 },
  brand: { color: COLORS.textMuted, fontSize: 10 },
  name: { color: COLORS.text, fontSize: 13, fontWeight: "600", marginTop: 2 },
  price: { color: COLORS.primary, fontSize: 13, fontWeight: "600", marginTop: 4 },
});