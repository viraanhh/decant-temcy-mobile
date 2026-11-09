import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const insets = useSafeAreaInsets();

  const loadVouchers = async () => {
    try {
      const data = await getAdminVouchers();
      setVouchers(Array.isArray(data) ? data : data.vouchers || []);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadVouchers();
    }, [])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadVouchers();
  };

  const isExpired = (v) => v.expired_at && new Date(v.expired_at) < new Date();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER UTAMA */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Kelola Voucher</Text>
          <Text style={styles.subtitle}>{vouchers.length} voucher terdaftar di sistem</Text>
        </View>
        <Pressable 
          style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.8 }]} 
          onPress={() => navigation.navigate("AdminVoucherForm")}
        >
          <Ionicons name="add" size={20} color={COLORS.surface} />
          <Text style={styles.addButtonText}>Buat</Text>
        </Pressable>
      </View>

      {/* KONTEN UTAMA */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={vouchers}
          keyExtractor={(item) => String(item.voucher_id || item.id)}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: 90 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="ticket-outline" size={48} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Voucher</Text>
              <Text style={styles.emptyText}>Tambahkan voucher diskon menarik untuk meningkatkan penjualan pelanggan.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const expired = isExpired(item);
            const quotaLeft = item.quota - (item.used_count || 0);
            const isInactive = !item.is_active || expired;

            return (
              <Pressable
                style={({ pressed }) => [
                  styles.card, 
                  isInactive && styles.cardInactive,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }
                ]}
                onPress={() => navigation.navigate("AdminVoucherForm", { voucher: item })}
              >
                {/* KODE & BADGE STATUS */}
                <View style={styles.cardHeader}>
                  <View style={styles.codeWrapper}>
                    <Ionicons name="ticket-outline" size={16} color={isInactive ? COLORS.textMuted : COLORS.primary} />
                    <Text style={[styles.code, isInactive && { color: COLORS.textMuted }]} numberOfLines={1}>{item.code}</Text>
                  </View>
                  
                  <View style={styles.badgeRow}>
                    {!item.is_active && (
                      <View style={[styles.badge, styles.inactiveBadge]}>
                        <Text style={styles.inactiveBadgeText}>NONAKTIF</Text>
                      </View>
                    )}
                    {expired && (
                      <View style={[styles.badge, styles.expiredBadge]}>
                        <Text style={styles.expiredBadgeText}>EXPIRED</Text>
                      </View>
                    )}
                    {item.is_active && !expired && (
                      <View style={[styles.badge, styles.activeBadge]}>
                        <Text style={styles.activeBadgeText}>AKTIF</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* NILAI / DISKON */}
                <View style={styles.valueRow}>
                  <Text style={[styles.value, isInactive && { color: COLORS.textMuted }]}>
                    {item.type === "percentage" ? `${item.value}%` : formatRupiah(item.value)}
                  </Text>
                  {item.max_discount ? (
                    <Text style={styles.maxDiscText}>Maks. diskon {formatRupiah(item.max_discount)}</Text>
                  ) : null}
                </View>

                <View style={styles.cardDivider} />

                {/* INFORMASI MINIMAL BELANJA & KUOTA */}
                <View style={styles.footerRow}>
                  <View style={styles.metaInfo}>
                    <Ionicons name="cart-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.detail}>Min. belanja {formatRupiah(item.min_purchase)}</Text>
                  </View>

                  <View style={styles.metaInfo}>
                    <Ionicons name="people-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.detail}>Sisa Kuota: <Text style={{ fontWeight: "750", color: COLORS.text }}>{quotaLeft}/{item.quota}</Text></Text>
                  </View>
                </View>
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
  
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: SPACING.lg, 
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm 
  },
  title: { color: COLORS.text, fontSize: 22, fontWeight: "800" },
  subtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  
  addButton: { 
    backgroundColor: COLORS.primary, 
    borderRadius: RADIUS.full, 
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 4,
    ...CARD_SHADOW
  },
  addButtonText: { color: COLORS.surface, fontWeight: "750", fontSize: 13 },
  
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },

  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 20 },
  emptyIconBox: { 
    width: 80, 
    height: 80, 
    borderRadius: RADIUS.full, 
    backgroundColor: COLORS.surface, 
    alignItems: "center", 
    justifyContent: "center", 
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border 
  },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center", lineHeight: 18 },
  
  card: { 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.md, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    padding: SPACING.md, 
    ...CARD_SHADOW 
  },
  cardInactive: {
    opacity: 0.7,
    backgroundColor: COLORS.background,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  
  codeWrapper: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  code: { color: COLORS.text, fontWeight: "800", fontSize: 15, letterSpacing: 0.8 },
  
  valueRow: { marginTop: 8, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  value: { color: COLORS.primary, fontWeight: "800", fontSize: 20 },
  maxDiscText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "600" },

  cardDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },

  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  detail: { color: COLORS.textMuted, fontSize: 11, fontWeight: "500" },
  
  badgeRow: { flexDirection: "row", gap: 6 },
  badge: { borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  activeBadge: { backgroundColor: "rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.3)" },
  activeBadgeText: { color: "#10B981", fontSize: 9, fontWeight: "800" },
  inactiveBadge: { backgroundColor: "rgba(107, 114, 128, 0.1)", borderColor: "rgba(107, 114, 128, 0.3)" },
  inactiveBadgeText: { color: COLORS.textMuted, fontSize: 9, fontWeight: "800" },
  expiredBadge: { backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.3)" },
  expiredBadgeText: { color: "#EF4444", fontSize: 9, fontWeight: "800" },
});