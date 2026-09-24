import { useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
import { useAddress } from "../../context/AddressContext";

export default function CheckoutAddressScreen({ navigation }) {
  const { addresses, isLoading, selectedAddress, selectAddress } = useAddress();
  const [deliveryMethod, setDeliveryMethod] = useState("delivery"); // 'delivery' | 'pickup'

  const canContinue = deliveryMethod === "pickup" || !!selectedAddress;

  const handleContinue = () => {
    navigation.navigate("CheckoutShipping", {
      deliveryMethod,
      address: deliveryMethod === "delivery" ? selectedAddress : null,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>Langkah 1 dari 3 · Metode Penerimaan</Text>

      <View style={styles.methodRow}>
        <Pressable
          style={[styles.methodChip, deliveryMethod === "delivery" && styles.methodChipActive]}
          onPress={() => setDeliveryMethod("delivery")}
        >
          <Text style={[styles.methodChipText, deliveryMethod === "delivery" && styles.methodChipTextActive]}>
            Dikirim ke Alamat
          </Text>
        </Pressable>
        <Pressable
          style={[styles.methodChip, deliveryMethod === "pickup" && styles.methodChipActive]}
          onPress={() => setDeliveryMethod("pickup")}
        >
          <Text style={[styles.methodChipText, deliveryMethod === "pickup" && styles.methodChipTextActive]}>
            Ambil di Toko
          </Text>
        </Pressable>
      </View>

      {deliveryMethod === "pickup" ? (
        <View style={styles.pickupInfo}>
          <Text style={styles.pickupTitle}>Pickup di Toko</Text>
          <Text style={styles.pickupText}>Semarang — alamat lengkap toko akan dikonfirmasi lewat notifikasi setelah pesanan dibuat.</Text>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ gap: 10, paddingTop: 10 }}
          ListEmptyComponent={
            !isLoading && (
              <Text style={styles.emptyText}>Belum ada alamat tersimpan.</Text>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.addressCard, selectedAddress?.id === item.id && styles.addressCardActive]}
              onPress={() => selectAddress(item.id)}
            >
              <View style={styles.addressHeader}>
                <Text style={styles.addressLabel}>{item.label}</Text>
                {item.isDefault && <Text style={styles.defaultBadge}>Utama</Text>}
              </View>
              <Text style={styles.addressText}>{item.recipientName} · {item.phone}</Text>
              <Text style={styles.addressTextMuted}>{item.detail}, {item.city}, {item.province}</Text>
            </Pressable>
          )}
          ListFooterComponent={
            <Pressable style={styles.addAddressButton} onPress={() => navigation.navigate("AddressBook", { selectMode: true })}>
              <Text style={styles.addAddressText}>+ Tambah / Kelola Alamat</Text>
            </Pressable>
          }
        />
      )}

      <View style={styles.footer}>
        <Pressable
          style={[styles.continueButton, !canContinue && { opacity: 0.5 }]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={styles.continueButtonText}>Lanjut →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  progress: { color: COLORS.textMuted, fontSize: 12, marginBottom: 12 },
  methodRow: { flexDirection: "row", gap: 10 },
  methodChip: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, alignItems: "center" },
  methodChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  methodChipText: { color: COLORS.textMuted, fontSize: 13 },
  methodChipTextActive: { color: COLORS.text, fontWeight: "600" },
  pickupInfo: { backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginTop: 16 },
  pickupTitle: { color: COLORS.text, fontWeight: "600" },
  pickupText: { color: COLORS.textMuted, fontSize: 12, marginTop: 6 },
  emptyText: { color: COLORS.textMuted, textAlign: "center", marginTop: 20 },
  addressCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  addressCardActive: { borderColor: COLORS.primary },
  addressHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  addressLabel: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  defaultBadge: { color: COLORS.primary, fontSize: 10, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  addressText: { color: COLORS.textMuted, fontSize: 12, marginTop: 6 },
  addressTextMuted: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  addAddressButton: { padding: 14, alignItems: "center" },
  addAddressText: { color: COLORS.primary, fontSize: 13 },
  footer: { paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  continueButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center" },
  continueButtonText: { color: COLORS.text, fontWeight: "600" },
});