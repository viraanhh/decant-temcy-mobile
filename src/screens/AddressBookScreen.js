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
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Belum ada alamat tersimpan.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => handlePick(item.id)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>{item.label}</Text>
              {item.isDefault && <Text style={styles.defaultBadge}>Utama</Text>}
            </View>
            <Text style={styles.cardText}>{item.recipientName} · {item.phone}</Text>
            <Text style={styles.cardTextMuted}>{item.detail}, {item.city}, {item.province} {item.postalCode}</Text>
            <View style={styles.cardActions}>
              {!item.isDefault && (
                <Pressable onPress={() => setAsDefault(item.id)}><Text style={styles.actionLink}>Jadikan Utama</Text></Pressable>
              )}
              <Pressable onPress={() => removeAddress(item.id)}><Text style={[styles.actionLink, { color: COLORS.primary }]}>Hapus</Text></Pressable>
            </View>
          </Pressable>
        )}
      />
      <Pressable
        style={styles.addButton}
        onPress={() => navigation.navigate("AddAddress", { selectMode })}
      >
        <Ionicons name="add-circle-outline" size={18} color={COLORS.text} />
        <Text style={styles.addButtonText}>Tambah Alamat Baru</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  emptyText: { color: COLORS.textMuted, textAlign: "center", marginTop: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardLabel: { color: COLORS.text, fontWeight: "600" },
  defaultBadge: { color: COLORS.primary, fontSize: 10, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 4, paddingHorizontal: 6 },
  cardText: { color: COLORS.textMuted, fontSize: 12, marginTop: 6 },
  cardTextMuted: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 16, marginTop: 10 },
  actionLink: { color: COLORS.textMuted, fontSize: 12 },
  addButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, margin: 16 },
  addButtonText: { color: COLORS.text, fontWeight: "600" },
});