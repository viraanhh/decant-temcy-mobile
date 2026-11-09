import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useAddress } from "../context/AddressContext";

export default function AddressBookScreen({ navigation, route }) {
  const selectMode = route?.params?.selectMode ?? false;
  const { addresses, removeAddress, setAsDefault, selectAddress } = useAddress();

  const handlePick = (id) => {
    selectAddress(id);
    if (selectMode) navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="location-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Belum Ada Alamat</Text>
            <Text style={styles.emptyText}>
              Tambahkan alamat pengiriman untuk memudahkan proses belanja kamu.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable 
            style={({ pressed }) => [
              styles.card, 
              item.isDefault && styles.cardDefault,
              pressed && { opacity: 0.8 }
            ]} 
            onPress={() => handlePick(item.id)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.labelWrapper}>
                <Ionicons name="bookmark" size={14} color={COLORS.primary} />
                <Text style={styles.cardLabel}>{item.label}</Text>
              </View>
              {item.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Utama</Text>
                </View>
              )}
            </View>

            <View style={styles.recipientRow}>
              <Text style={styles.recipientName}>{item.recipientName}</Text>
              <Text style={styles.dotSeparator}>·</Text>
              <Text style={styles.recipientPhone}>{item.phone}</Text>
            </View>

            <Text style={styles.cardAddressText} numberOfLines={2}>
              {item.detail}, {item.city}, {item.province} {item.postalCode}
            </Text>

            <View style={styles.divider} />

            <View style={styles.cardActions}>
              {!item.isDefault && (
                <Pressable 
                  style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.6 }]} 
                  onPress={() => setAsDefault(item.id)}
                >
                  <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.actionLink}>Jadikan Utama</Text>
                </Pressable>
              )}
              <Pressable 
                style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.6 }, item.isDefault && { marginLeft: 'auto' }]} 
                onPress={() => removeAddress(item.id)}
              >
                <Ionicons name="trash-outline" size={14} color={COLORS.primary} />
                <Text style={[styles.actionLink, { color: COLORS.primary, fontWeight: "600" }]}>Hapus</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      />

      {/* Sticky Footer Button */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
          onPress={() => navigation.navigate("AddAddress", { selectMode })}
        >
          <Ionicons name="add-circle" size={20} color={COLORS.background} />
          <Text style={styles.addButtonText}>Tambah Alamat Baru</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: 16, paddingBottom: 20 },

  // Empty State
  emptyContainer: { 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: 60, 
    paddingHorizontal: 24 
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptyText: { color: COLORS.textMuted, textAlign: "center", fontSize: 13, lineHeight: 20 },

  // Card Styles
  card: { 
    backgroundColor: COLORS.surface, 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: COLORS.border,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardDefault: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  labelWrapper: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardLabel: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  
  defaultBadge: { 
    backgroundColor: `${COLORS.primary}15`, 
    borderWidth: 1, 
    borderColor: COLORS.primary, 
    borderRadius: 20, 
    paddingHorizontal: 10, 
    paddingVertical: 2 
  },
  defaultBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: "700" },

  recipientRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  recipientName: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  dotSeparator: { color: COLORS.textMuted },
  recipientPhone: { color: COLORS.textMuted, fontSize: 13 },

  cardAddressText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 12 },

  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 12 },

  cardActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionLink: { color: COLORS.textMuted, fontSize: 12, fontWeight: "500" },

  // Footer Button
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  addButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 8, 
    backgroundColor: COLORS.primary, 
    borderRadius: 12, 
    padding: 16, 
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonText: { color: COLORS.background, fontWeight: "700", fontSize: 15 },
});