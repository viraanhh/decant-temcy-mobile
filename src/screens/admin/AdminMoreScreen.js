import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

const MENU_ITEMS = [
  { icon: "receipt-outline", label: "Pesanan", route: "AdminOrders" },
  { icon: "people-outline", label: "Kelola Users", route: "AdminUsers" },
  { icon: "star-outline", label: "Kelola Review", route: "AdminReviews" },
  { icon: "pricetag-outline", label: "Voucher", route: "AdminVouchers" },
  { icon: "bar-chart-outline", label: "Laporan Penjualan", route: "AdminSalesReport" },
];

export default function AdminMoreScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{user?.name?.charAt(0)?.toUpperCase() || "A"}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
            <Text style={styles.roleBadgeText}>ADMINISTRATOR</Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <Pressable
              key={item.route}
              style={[styles.menuItem, index < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
              onPress={() => navigation.navigate(item.route)}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={19} color={COLORS.textMuted} />
                <Text style={styles.menuItemText}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textFaint} />
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.logoutButton}
          onPress={async () => {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.primary} />
          <Text style={styles.logoutText}>Keluar</Text>
        </Pressable>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { alignItems: "center", paddingTop: SPACING.xxl, paddingBottom: SPACING.xl },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: COLORS.text, fontSize: 26, fontWeight: "700" },
  userName: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginTop: 12 },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 5, paddingHorizontal: 12, marginTop: 8 },
  roleBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  menuCard: { marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, ...CARD_SHADOW },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuItemText: { color: COLORS.text, fontSize: 14 },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: SPACING.lg, marginTop: SPACING.lg, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.primary },
  logoutText: { color: COLORS.primary, fontWeight: "600", fontSize: 14 },
});