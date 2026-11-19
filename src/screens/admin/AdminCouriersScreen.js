import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/theme";
import { getAdminCouriers, toggleCourier } from "../../services/adminService";

export default function AdminCouriersScreen() {
  const [couriers, setCouriers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingCode, setTogglingCode] = useState(null);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      getAdminCouriers()
        .then(setCouriers)
        .catch(() => Alert.alert("Error", "Gagal memuat data kurir."))
        .finally(() => setIsLoading(false));
    }, [])
  );

  const handleToggleCourier = async (code) => {
    setTogglingCode(code);
    try {
      const res = await toggleCourier(code);
      setCouriers((prev) => prev.map((c) => (c.code === code ? { ...c, is_active: res.is_active } : c)));
    } catch (err) {
      Alert.alert("Gagal", "Tidak dapat mengubah status kurir.");
    } finally {
      setTogglingCode(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <View style={styles.headerInfo}>
          <Ionicons name="bicycle-outline" size={32} color={COLORS.primary} />
          <Text style={styles.title}>Ekspedisi Pengiriman</Text>
          <Text style={styles.description}>
            Aktifkan atau nonaktifkan pilihan kurir yang dapat dipilih oleh pelanggan saat checkout.
          </Text>
        </View>

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ padding: 20 }} color={COLORS.primary} />
          ) : couriers.length === 0 ? (
            <Text style={styles.emptyText}>Tidak ada data kurir.</Text>
          ) : (
            couriers.map((c, index) => (
              <View key={c.code} style={[styles.itemRow, index < couriers.length - 1 && styles.itemBorder]}>
                <View style={styles.itemLeft}>
                  <View style={[styles.iconBox, { backgroundColor: c.is_active ? "#3DBA6C18" : COLORS.surfaceLight }]}>
                    <Ionicons name="cube-outline" size={18} color={c.is_active ? "#3DBA6C" : COLORS.textFaint} />
                  </View>
                  <View>
                    <Text style={styles.itemText}>{c.label}</Text>
                    <Text style={[styles.statusText, { color: c.is_active ? "#3DBA6C" : COLORS.textMuted }]}>
                      {c.is_active ? "Aktif" : "Nonaktif"}
                    </Text>
                  </View>
                </View>
                {togglingCode === c.code ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Switch
                    value={!!c.is_active}
                    onValueChange={() => handleToggleCourier(c.code)}
                    trackColor={{ false: COLORS.border, true: "#3DBA6C80" }}
                    thumbColor={c.is_active ? "#3DBA6C" : COLORS.textMuted}
                  />
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerInfo: { alignItems: "center", marginBottom: SPACING.lg, paddingHorizontal: SPACING.sm },
  title: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  description: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  itemText: { color: COLORS.text, fontSize: 14, fontWeight: "600" },
  statusText: { fontSize: 12, marginTop: 2, fontWeight: "500" },
  emptyText: { padding: 20, textAlign: "center", color: COLORS.textMuted, fontSize: 13 },
});