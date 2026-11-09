
import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";

import { COLORS } from "../../constants/colors";
import { useAddress } from "../../context/AddressContext";
import { getActiveStores } from "../../services/storeService";

export default function CheckoutAddressScreen({ navigation, route }) {
  // Ambil ID produk yang dipilih dari halaman sebelumnya
  const selectedIds = route?.params?.selectedIds;

  const {
    addresses,
    isLoading,
    selectedAddress,
    selectAddress,
  } = useAddress();

  const [deliveryMethod, setDeliveryMethod] = useState("delivery");

  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesLoaded, setStoresLoaded] = useState(false);
  const [storesError, setStoresError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Muat cabang aktif saat memilih Ambil di Toko
  useEffect(() => {
    if (deliveryMethod !== "pickup" || storesLoaded) return;

    setStoresLoading(true);
    setStoresError("");

    getActiveStores()
      .then((list) => {
        setStores(list);
        setStoresLoaded(true);

        if (list.length > 0) {
          setSelectedStoreId((prev) => prev ?? list[0].store_id);
        }
      })
      .catch((err) => {
        setStoresError(err.message || "Gagal memuat daftar store");
      })
      .finally(() => {
        setStoresLoading(false);
      });
  }, [deliveryMethod, storesLoaded, reloadKey]);

  const selectedStore =
    stores.find((s) => s.store_id === selectedStoreId) || null;

  const canContinue =
    deliveryMethod === "pickup"
      ? !!selectedStore
      : !!selectedAddress;

  // Lanjut ke halaman Checkout Shipping
  const handleContinue = () => {
    navigation.navigate("CheckoutShipping", {
      deliveryMethod,
      address: deliveryMethod === "delivery" ? selectedAddress : null,
      store: deliveryMethod === "pickup" ? selectedStore : null,
      selectedIds,
    });
  };

  const openMaps = (url) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>
        Langkah 1 dari 3 · Metode Penerimaan
      </Text>

      {/* Pilihan metode penerimaan */}
      <View style={styles.methodRow}>
        <Pressable
          style={[
            styles.methodChip,
            deliveryMethod === "delivery" && styles.methodChipActive,
          ]}
          onPress={() => setDeliveryMethod("delivery")}
        >
          <Text
            style={[
              styles.methodChipText,
              deliveryMethod === "delivery" &&
                styles.methodChipTextActive,
            ]}
          >
            Dikirim ke Alamat
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.methodChip,
            deliveryMethod === "pickup" && styles.methodChipActive,
          ]}
          onPress={() => setDeliveryMethod("pickup")}
        >
          <Text
            style={[
              styles.methodChipText,
              deliveryMethod === "pickup" &&
                styles.methodChipTextActive,
            ]}
          >
            Ambil di Toko
          </Text>
        </Pressable>
      </View>

      {/* Konten berdasarkan metode penerimaan */}
      {deliveryMethod === "pickup" ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            gap: 10,
            paddingTop: 12,
          }}
        >
          <Text style={styles.pickupHeading}>
            Pilih Store Pickup · Gratis Ongkir
          </Text>

          {storesLoading ? (
            <ActivityIndicator
              color={COLORS.primary}
              style={{ marginTop: 16 }}
            />
          ) : storesError ? (
            <View style={styles.pickupInfo}>
              <Text style={styles.pickupText}>
                {storesError}
              </Text>

              <Pressable
                onPress={() => {
                  setStoresLoaded(false);
                  setReloadKey((k) => k + 1);
                }}
                style={{ marginTop: 8 }}
              >
                <Text style={styles.addAddressText}>
                  Coba lagi
                </Text>
              </Pressable>
            </View>
          ) : stores.length === 0 ? (
            <View style={styles.pickupInfo}>
              <Text style={styles.pickupTitle}>
                Belum ada store aktif
              </Text>

              <Text style={styles.pickupText}>
                Silakan pilih metode "Dikirim ke Alamat".
              </Text>
            </View>
          ) : (
            stores.map((store) => (
              <Pressable
                key={store.store_id}
                style={[
                  styles.addressCard,
                  selectedStoreId === store.store_id &&
                    styles.addressCardActive,
                ]}
                onPress={() =>
                  setSelectedStoreId(store.store_id)
                }
              >
                <View style={styles.addressHeader}>
                  <Text style={styles.addressLabel}>
                    {store.name}
                  </Text>

                  {selectedStoreId === store.store_id && (
                    <Text style={styles.defaultBadge}>
                      Dipilih
                    </Text>
                  )}
                </View>

                <Text style={styles.addressText}>
                  {store.address}, {store.city}
                </Text>

                {!!store.phone && (
                  <Text style={styles.addressTextMuted}>
                    {store.phone}
                  </Text>
                )}

                {!!store.maps_url && (
                  <Pressable
                    onPress={() => openMaps(store.maps_url)}
                    hitSlop={8}
                  >
                    <Text
                      style={[
                        styles.addAddressText,
                        {
                          marginTop: 6,
                          textAlign: "left",
                        },
                      ]}
                    >
                      Lihat di Maps
                    </Text>
                  </Pressable>
                )}
              </Pressable>
            ))
          )}

          {stores.length > 0 && (
            <Text style={styles.pickupHint}>
              Hubungi store setelah pesanan dibuat untuk
              konfirmasi waktu pengambilan.
            </Text>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            gap: 10,
            paddingTop: 10,
          }}
          ListEmptyComponent={
            !isLoading && (
              <Text style={styles.emptyText}>
                Belum ada alamat tersimpan.
              </Text>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.addressCard,
                selectedAddress?.id === item.id &&
                  styles.addressCardActive,
              ]}
              onPress={() => selectAddress(item.id)}
            >
              <View style={styles.addressHeader}>
                <Text style={styles.addressLabel}>
                  {item.label}
                </Text>

                {item.isDefault && (
                  <Text style={styles.defaultBadge}>
                    Utama
                  </Text>
                )}
              </View>

              <Text style={styles.addressText}>
                {item.recipientName} · {item.phone}
              </Text>

              <Text style={styles.addressTextMuted}>
                {item.detail}, {item.city}, {item.province}
              </Text>
            </Pressable>
          )}
          ListFooterComponent={
            <Pressable
              style={styles.addAddressButton}
              onPress={() =>
                navigation.navigate("AddressBook", {
                  selectMode: true,
                })
              }
            >
              <Text style={styles.addAddressText}>
                + Tambah / Kelola Alamat
              </Text>
            </Pressable>
          }
        />
      )}

      {/* Tombol lanjut */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.continueButton,
            !canContinue && { opacity: 0.5 },
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={styles.continueButtonText}>
            Lanjut →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },

  progress: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },

  methodRow: {
    flexDirection: "row",
    gap: 10,
  },

  methodChip: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },

  methodChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  methodChipText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },

  methodChipTextActive: {
    color: COLORS.text,
    fontWeight: "600",
  },

  pickupHeading: {
    color: COLORS.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
  },

  pickupInfo: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },

  pickupTitle: {
    color: COLORS.text,
    fontWeight: "600",
  },

  pickupText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 6,
  },

  pickupHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  emptyText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 20,
  },

  addressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  addressCardActive: {
    borderColor: COLORS.primary,
  },

  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  addressLabel: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 14,
  },

  defaultBadge: {
    color: COLORS.primary,
    fontSize: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },

  addressText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 6,
  },

  addressTextMuted: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  addAddressButton: {
    padding: 14,
    alignItems: "center",
  },

  addAddressText: {
    color: COLORS.primary,
    fontSize: 13,
  },

  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  continueButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },

  continueButtonText: {
    color: COLORS.text,
    fontWeight: "600",
  },
});
