import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "../../constants/colors";
import { RADIUS, SPACING, CARD_SHADOW } from "../../constants/theme";
import {
  getShippingCost,
  searchDestinations,
  getActiveCouriers,
} from "../../services/shippingService";
import ContactAdminButton from "../../components/ContactAdminButton";

function formatRupiah(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value)) return "-";
  if (value === 0) return "Gratis";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function CheckoutShippingScreen({ route, navigation }) {
  const {
    deliveryMethod,
    address,
    store,
    selectedIds,
  } = route.params || {};

  const [expeditionCourier, setExpeditionCourier] = useState(null);
  const [expeditionOptions, setExpeditionOptions] = useState([]);
  const [selectedService, setSelectedService] = useState(null);

  const [destinationId, setDestinationId] = useState(null);
  const [isLoadingDestination, setIsLoadingDestination] = useState(false);
  const [isLoadingCost, setIsLoadingCost] = useState(false);

  const [costError, setCostError] = useState("");

  // Mengambil daftar kurir aktif dari backend
  const [activeCouriers, setActiveCouriers] = useState([]);
  const [isCouriersLoading, setIsCouriersLoading] = useState(
    deliveryMethod === "delivery"
  );

  useEffect(() => {
    if (deliveryMethod !== "delivery") {
      setIsCouriersLoading(false);
      return;
    }

    let mounted = true;

    getActiveCouriers()
      .then((list) => {
        if (mounted) {
          const safeList = Array.isArray(list) ? list : [];
          setActiveCouriers(
            safeList.map((courier) => ({
              value: courier.code,
              label: courier.label,
            }))
          );
        }
      })
      .catch((error) => {
        console.error("Gagal mengambil daftar kurir aktif:", error);
        if (mounted) setActiveCouriers([]);
      })
      .finally(() => {
        if (mounted) setIsCouriersLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [deliveryMethod]);

  // Cari destination ID RajaOngkir
  useEffect(() => {
    if (deliveryMethod !== "delivery" || !address) return;

    let isMounted = true;

    const findDestination = async () => {
      setIsLoadingDestination(true);
      setDestinationId(null);
      setExpeditionOptions([]);
      setSelectedService(null);
      setExpeditionCourier(null);
      setCostError("");

      try {
        const search =
          address.district ||
          address.districtName ||
          address.cityName ||
          address.city;

        if (!search) {
          throw new Error(
            "Informasi kecamatan atau kota pada alamat tidak tersedia."
          );
        }

        const results = await searchDestinations(search);

        if (!isMounted) return;

        const safeResults = Array.isArray(results) ? results : [];
        const normalizedSearch = String(search).trim().toLowerCase();

        const matched =
          safeResults.find(
            (item) =>
              String(item?.district_name || "").trim().toLowerCase() ===
              normalizedSearch
          ) ||
          safeResults.find(
            (item) =>
              String(item?.subdistrict_name || "").trim().toLowerCase() ===
              normalizedSearch
          ) ||
          safeResults.find(
            (item) =>
              String(item?.label || "")
                .toLowerCase()
                .includes(normalizedSearch)
          );

        if (!matched?.id) {
          throw new Error(
            `Wilayah "${search}" tidak ditemukan di RajaOngkir.`
          );
        }

        setDestinationId(matched.id);
      } catch (error) {
        if (!isMounted) return;

        setDestinationId(null);
        setCostError(
          error.message || "Gagal mencari alamat tujuan di RajaOngkir."
        );
      } finally {
        if (isMounted) {
          setIsLoadingDestination(false);
        }
      }
    };

    findDestination();

    return () => {
      isMounted = false;
    };
  }, [deliveryMethod, address]);

  // Mengambil tarif ongkir
  const handlePickCourier = async (courier) => {
    setExpeditionCourier(courier);
    setSelectedService(null);
    setExpeditionOptions([]);
    setCostError("");

    if (!destinationId) {
      setCostError(
        "ID tujuan belum ditemukan. Periksa kembali alamat pengiriman."
      );
      return;
    }

    setIsLoadingCost(true);

    try {
      const response = await getShippingCost(
        destinationId,
        50,
        courier.value
      );

      const costs = Array.isArray(response) ? response : [];

      setExpeditionOptions(costs);

      if (costs.length === 0) {
        setCostError(
          "Layanan ekspedisi ini belum tersedia untuk alamat Anda."
        );
      }
    } catch (error) {
      setExpeditionOptions([]);

      setCostError(
        error.response?.data?.message ||
          error.message ||
          "Tarif belum bisa dimuat. Silakan coba lagi."
      );
    } finally {
      setIsLoadingCost(false);
    }
  };

  // Lanjut ke halaman review
  const handleContinue = () => {
    let shipping;

    if (deliveryMethod === "pickup") {
      shipping = {
        deliveryMethod: "pickup",
        courier: null,
        courierService: null,
        cost: 0,
        label: `Ambil di Toko · ${store?.name || ""}`,
      };
    } else {
      if (!expeditionCourier || !selectedService) return;

      shipping = {
        deliveryMethod: "delivery",
        courier: expeditionCourier.value,
        courierService: selectedService.service || "",
        cost: Number(selectedService.cost) || 0,
        label: `${expeditionCourier.label} ${
          selectedService.service || ""
        }`,
        etd: selectedService.etd || "-",
      };
    }

    navigation.navigate("CheckoutReview", {
      deliveryMethod,
      address,
      store,
      shipping,
      selectedIds,
    });
  };

  const canContinue =
    deliveryMethod === "pickup"
      ? !!store
      : !!selectedService && !!destinationId;

  return (
    <View style={styles.container}>
      <ScrollView
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          padding: SPACING.lg,
          gap: SPACING.lg,
          paddingBottom: 120,
        }}
      >
        {/* PROGRESS */}
        <View style={styles.progressBox}>
          <Text style={styles.progressText}>Langkah 2 dari 3</Text>
          <Text style={styles.progressTitle}>Metode Pengiriman</Text>
        </View>

        {deliveryMethod === "delivery" && (
          <>
            {/* ALAMAT TUJUAN */}
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <Ionicons
                  name="location"
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.addressTitle}>Dikirim ke</Text>
              </View>

              <Text style={styles.addressName}>
                {address?.name || address?.recipientName || "Penerima"}
              </Text>

              <Text style={styles.addressDetail}>
                {address?.fullAddress ||
                  address?.detail ||
                  "Alamat lengkap tidak tersedia"}
                {address?.cityName || address?.city
                  ? `, ${address.cityName || address.city}`
                  : ""}
              </Text>

              {isLoadingDestination && (
                <View style={styles.destinationLoading}>
                  <ActivityIndicator
                    size="small"
                    color={COLORS.primary}
                  />
                  <Text style={styles.loadingText}>
                    Memeriksa wilayah tujuan...
                  </Text>
                </View>
              )}

              {!!destinationId && !isLoadingDestination && (
                <View style={styles.destinationLoading}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={COLORS.primary}
                  />
                  <Text style={styles.destinationSuccess}>
                    Wilayah tujuan berhasil ditemukan
                  </Text>
                </View>
              )}
            </View>

            {/* PILIH EKSPEDISI */}
            <View>
              <Text style={styles.sectionLabel}>Pilih Ekspedisi</Text>

              <View style={styles.courierRow}>
                {isCouriersLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.primary}
                  />
                ) : activeCouriers.length === 0 ? (
                  <Text
                    style={{
                      color: COLORS.textMuted,
                      fontSize: 13,
                    }}
                  >
                    Pengiriman ekspedisi sedang tidak tersedia.
                  </Text>
                ) : (
                  activeCouriers.map((courier) => {
                    const isActive =
                      expeditionCourier?.value === courier.value;

                    return (
                      <Pressable
                        key={courier.value}
                        style={[
                          styles.courierChip,
                          isActive && styles.courierChipActive,
                        ]}
                        onPress={() => handlePickCourier(courier)}
                        disabled={
                          isLoadingDestination || isLoadingCost
                        }
                      >
                        <Ionicons
                          name={isActive ? "cube" : "cube-outline"}
                          size={16}
                          color={
                            isActive
                              ? COLORS.primary
                              : COLORS.textMuted
                          }
                          style={{ marginRight: 6 }}
                        />

                        <Text
                          style={[
                            styles.courierChipText,
                            isActive && styles.courierChipTextActive,
                          ]}
                        >
                          {courier.label}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>

            {/* HASIL ONGKIR */}
            {expeditionCourier && (
              <View style={styles.servicesContainer}>
                <Text style={styles.sectionLabel}>
                  Pilih Layanan {expeditionCourier.label}
                </Text>

                {isLoadingDestination || isLoadingCost ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator
                      color={COLORS.primary}
                      size="large"
                    />
                    <Text style={styles.loadingText}>
                      {isLoadingDestination
                        ? "Memeriksa wilayah tujuan..."
                        : "Mengecek tarif ongkos kirim..."}
                    </Text>
                  </View>
                ) : costError ? (
                  <View style={styles.errorBox}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={24}
                      color="#EF4444"
                    />

                    <Text style={styles.errorText}>
                      {costError}
                    </Text>

                    <Pressable
                      onPress={() =>
                        handlePickCourier(expeditionCourier)
                      }
                      style={{ marginTop: 12 }}
                    >
                      <Text style={styles.retryText}>Coba lagi</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {expeditionOptions
                      .filter((option) => option != null)
                      .map((option, index) => {
                        const isActive =
                          selectedService?.service === option?.service;

                        return (
                          <Pressable
                            key={`${option?.service || "service"}-${index}`}
                            style={[
                              styles.optionCard,
                              isActive && styles.optionCardActive,
                            ]}
                            onPress={() => setSelectedService(option)}
                          >
                            <View style={styles.optionContent}>
                              <Text style={styles.optionLabel}>
                                {option?.description ||
                                  option?.name ||
                                  "Layanan pengiriman"}{" "}
                                ({option?.service || "-"})
                              </Text>

                              <View style={styles.etdBadge}>
                                <Ionicons
                                  name="time-outline"
                                  size={12}
                                  color={COLORS.textMuted}
                                />
                                <Text style={styles.optionNote}>
                                  Estimasi {option?.etd || "Belum tersedia"}
                                </Text>
                              </View>

                              <Text style={styles.optionCost}>
                                {formatRupiah(option?.cost)}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.radioCircle,
                                isActive && styles.radioCircleActive,
                              ]}
                            >
                              {isActive && (
                                <View style={styles.radioInner} />
                              )}
                            </View>
                          </Pressable>
                        );
                      })}
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* PICKUP */}
        {deliveryMethod === "pickup" && (
          <View>
            <Text style={styles.sectionLabel}>
              Lokasi Pengambilan
            </Text>

            <View style={[styles.optionCard, styles.optionCardActive]}>
              <View style={styles.optionContent}>
                <Text style={styles.optionLabel}>
                  Ambil di Toko · {store?.name || ""}
                </Text>

                <Text style={styles.optionDetailNote}>
                  {store?.address || ""}, {store?.city || ""}
                </Text>

                <Text style={styles.optionCost}>
                  Gratis Biaya Pengiriman
                </Text>
              </View>

              <Ionicons
                name="checkmark-circle"
                size={24}
                color={COLORS.primary}
              />
            </View>
          </View>
        )}

        {/* TOMBOL KONTAK ADMIN */}
        <ContactAdminButton label="Tanya admin via WhatsApp" />
      </ScrollView>

      {/* TOMBOL LANJUT */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            !canContinue && styles.continueButtonDisabled,
            pressed && canContinue && { opacity: 0.8 },
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text
            style={[
              styles.continueButtonText,
              !canContinue && styles.continueButtonTextDisabled,
            ]}
          >
            Lanjut ke Review Pembayaran
          </Text>

          <Ionicons
            name="arrow-forward"
            size={18}
            color={canContinue ? COLORS.surface : COLORS.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  progressBox: {
    marginBottom: 4,
  },

  progressText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  progressTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },

  sectionLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
  },

  addressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...CARD_SHADOW,
  },

  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },

  addressTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  addressName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },

  addressDetail: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },

  destinationLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },

  destinationSuccess: {
    color: COLORS.primary,
    fontSize: 11,
  },

  courierRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  courierChip: {
    flex: 1,
    minWidth: "30%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    paddingHorizontal: 10,
    ...CARD_SHADOW,
  },

  courierChipActive: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: COLORS.primary,
  },

  courierChipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  courierChipTextActive: {
    color: COLORS.primary,
    fontWeight: "750",
  },

  servicesContainer: {
    marginTop: 8,
  },

  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },

  loadingText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },

  errorBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    padding: 20,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },

  errorText: {
    color: "#EF4444",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },

  retryText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 13,
  },

  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...CARD_SHADOW,
  },

  optionCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(16, 185, 129, 0.03)",
  },

  optionContent: {
    flex: 1,
    paddingRight: 10,
  },

  optionLabel: {
    color: COLORS.text,
    fontWeight: "750",
    fontSize: 14,
    marginBottom: 4,
  },

  etdBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.background,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginBottom: 8,
  },

  optionNote: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },

  optionDetailNote: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },

  optionCost: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "800",
  },

  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  radioCircleActive: {
    borderColor: COLORS.primary,
  },

  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: SPACING.lg,
    paddingBottom: 24,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  continueButtonDisabled: {
    backgroundColor: COLORS.border,
    elevation: 0,
    shadowOpacity: 0,
  },

  continueButtonText: {
    color: COLORS.surface,
    fontWeight: "800",
    fontSize: 15,
  },

  continueButtonTextDisabled: {
    color: COLORS.textMuted,
  },
});