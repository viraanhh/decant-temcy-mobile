import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getAdminVouchers } from "../../services/adminService";

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount || 0);
}

export default function AdminVoucherListScreen({ navigation }) {
  const [vouchers, setVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      getAdminVouchers()
        .then((data) => {
           setVouchers(Array.isArray(data) ? data : data.vouchers || []);
        })
        .finally(() => setIsLoading(false));
    }, [])
  );

  const isExpired = (v) => v.expired_at && new Date(v.expired_at) < new Date();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
           <Text style={styles.title}>Voucher</Text>
           <Text style={styles.subtitle}>{vouchers.length} voucher terdaftar</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate("AdminVoucherForm")}>
          <Ionicons name="add" size={20} color={COLORS.text} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={vouchers}
          keyExtractor={(item) => String(item.voucher_id || item.id)}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.sm }}
          ListEmptyComponent={<Text style={styles.emptyText}>Belum ada voucher.</Text>}
          renderItem={({ item }) => {
            const expired = isExpired(item);
            const quotaLeft = item.quota - (item.used_count || 0);
            return (
              <Pressable
                style={styles.card}
                onPress={() => navigation.navigate("AdminVoucherForm", { voucher: item })}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.code}>{item.code}</Text>
                  
                  {/* Badge Area: Tempat status Nonaktif / Expired berada */}
                  <View style={styles.badgeRow}>
                    {!item.is_active && <Text style={styles.inactiveBadge}>NONAKTIF</Text>}
                    {expired && <Text style={styles.expiredBadge}>EXPIRED</Text>}
                  </View>
                </View>

                <Text style={styles.value}>
                  {item.type === "percentage" ? `${item.value}%` : formatRupiah(item.value)}
                  {item.max_discount ? ` (maks ${formatRupiah(item.max_discount)})` : ""}
                </Text>
                
                <Text style={styles.detail}>Min. belanja {formatRupiah(item.min_purchase)} · Sisa kuota {quotaLeft}/{item.quota}</Text>
                
                {/* 
                  Tombol Hapus (Trash icon) SUDAH DIHAPUS SEPENUHNYA dari sini. 
                  Tidak ada lagi opacity: 0. Hapus voucher bisa dilakukan lewat form edit.
                */}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Header section
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: SPACING.lg, paddingBottom: SPACING.sm },
  title: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
  subtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  addButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  
  // Empty state
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center", marginTop: 20 },
  
  // Card layout
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, ...CARD_SHADOW },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  
  // Typography
  code: { color: COLORS.text, fontWeight: "700", fontSize: 15, letterSpacing: 1 },
  value: { color: COLORS.primary, fontWeight: "700", fontSize: 16, marginTop: 6 },
  detail: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  
  // Badges
  badgeRow: { flexDirection: "row", gap: 6 },
  inactiveBadge: { color: COLORS.textFaint, fontSize: 9, fontWeight: "700", borderWidth: 1, borderColor: COLORS.textFaint, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  expiredBadge: { color: COLORS.primary, fontSize: 9, fontWeight: "700", borderWidth: 1, borderColor: COLORS.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
});