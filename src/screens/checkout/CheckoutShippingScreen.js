import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS } from "../../constants/colors";
import { getShippingCost } from "../../services/shippingService";

function formatRupiah(amount) {
  if (amount === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

const EXPEDITION_COURIERS = [
  { value: "jne", label: "JNE" },
  { value: "jnt", label: "J&T" },
  { value: "sicepat", label: "SiCepat" },
];

export default function CheckoutShippingScreen({ route, navigation }) {
  const { deliveryMethod, address } = route.params;

  const [shippingChoice, setShippingChoice] = useState(deliveryMethod === "pickup" ? "pickup" : null);
  const [expeditionCourier, setExpeditionCourier] = useState(null);
  const [expeditionOptions, setExpeditionOptions] = useState([]);
  const [isLoadingCost, setIsLoadingCost] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const handlePickCourier = async (courier) => {
    setExpeditionCourier(courier);
    setSelectedService(null);
    setIsLoadingCost(true);
    try {
      const costs = await getShippingCost(address.cityId, 50, courier.value);
      setExpeditionOptions(costs);
    } catch (err) {
      setExpeditionOptions([]);
    } finally {
      setIsLoadingCost(false);
    }
  };

  const handleContinue = () => {
    let shipping;
    if (deliveryMethod === "pickup") {
      shipping = { deliveryMethod: "pickup", courier: null, courierService: null, cost: 0, label: "Ambil di Toko" };
    } else if (shippingChoice === "cod") {
      shipping = { deliveryMethod: "delivery", courier: "cod", courierService: "COD", cost: 0, label: "Diantar Langsung (COD)" };
    } else {
      shipping = {
        deliveryMethod: "delivery",
        courier: expeditionCourier.value,
        courierService: selectedService.service,
        cost: selectedService.cost[0].value,
        label: `${expeditionCourier.label} ${selectedService.service}`,
        etd: selectedService.cost[0].etd,
      };
    }
    navigation.navigate("CheckoutReview", { deliveryMethod, address, shipping });
  };

  const canContinue =
    deliveryMethod === "pickup" ||
    shippingChoice === "cod" ||
    (shippingChoice === "expedition" && selectedService);

  return (
    <View style={styles.container}>
      <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={styles.progress}>Langkah 2 dari 3 · Metode Pengiriman</Text>

        {deliveryMethod === "delivery" && (
          <>
            <Pressable
              style={[styles.optionCard, shippingChoice === "cod" && styles.optionCardActive]}
              onPress={() => setShippingChoice("cod")}
            >
              <Text style={styles.optionLabel}>Diantar Langsung</Text>
              <Text style={styles.optionNote}>Kurir toko, area Semarang saja</Text>
              <Text style={styles.optionCost}>Gratis</Text>
            </Pressable>

            <Text style={styles.sectionLabel}>Atau Pilih Ekspedisi</Text>
            <View style={styles.courierRow}>
              {EXPEDITION_COURIERS.map((c) => (
                <Pressable
                  key={c.value}
                  style={[styles.courierChip, expeditionCourier?.value === c.value && styles.courierChipActive]}
                  onPress={() => { setShippingChoice("expedition"); handlePickCourier(c); }}
                >
                  <Text style={[styles.courierChipText, expeditionCourier?.value === c.value && styles.courierChipTextActive]}>
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {isLoadingCost && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 10 }} />}

            {!isLoadingCost && expeditionOptions.map((opt) => (
              <Pressable
                key={opt.service}
                style={[styles.optionCard, selectedService?.service === opt.service && styles.optionCardActive]}
                onPress={() => setSelectedService(opt)}
              >
                <Text style={styles.optionLabel}>{opt.description}</Text>
                <Text style={styles.optionNote}>Estimasi {opt.cost[0].etd} hari</Text>
                <Text style={styles.optionCost}>{formatRupiah(opt.cost[0].value)}</Text>
              </Pressable>
            ))}
          </>
        )}

        {deliveryMethod === "pickup" && (
          <View style={styles.optionCard}>
            <Text style={styles.optionLabel}>Ambil di Toko — Semarang</Text>
            <Text style={styles.optionCost}>Gratis</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.continueButton, !canContinue && { opacity: 0.5 }]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={styles.continueButtonText}>Lanjut ke Review →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  progress: { color: COLORS.textMuted, fontSize: 12 },
  sectionLabel: { color: COLORS.textMuted, fontSize: 12, textTransform: "uppercase", marginTop: 10 },
  courierRow: { flexDirection: "row", gap: 8 },
  courierChip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  courierChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  courierChipText: { color: COLORS.textMuted, fontSize: 12 },
  courierChipTextActive: { color: COLORS.text, fontWeight: "600" },
  optionCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  optionCardActive: { borderColor: COLORS.primary },
  optionLabel: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  optionNote: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
  optionCost: { color: COLORS.primary, fontSize: 13, fontWeight: "600", marginTop: 6 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  continueButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center" },
  continueButtonText: { color: COLORS.text, fontWeight: "600" },
});