import { View, Text, Pressable, ScrollView, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { getAvatarUrl } from "../constants/api";

const MENU_SECTIONS = [
  {
    title: "Akun",
    items: [
      { icon: "person-outline", label: "Edit Profil & Preferensi", route: "AccountSettings" },
      { icon: "location-outline", label: "Alamat Saya", route: "AddressBook" },
    ],
  },
  {
    title: "Belanja",
    items: [
      { icon: "receipt-outline", label: "Riwayat Pesanan", route: "OrderHistory" },
      { icon: "heart-outline", label: "Wishlist", route: "Wishlist" },
      { icon: "notifications-outline", label: "Notifikasi", route: "Notifications" },
    ],
  },
  {
    title: "Lainnya",
    items: [
      { icon: "information-circle-outline", label: "Tentang Kami", route: "About" },
    ],
  },
];

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <Ionicons name="person-circle-outline" size={72} color={COLORS.textFaint} />
        <Text style={styles.guestTitle}>Anda belum login</Text>
        <Text style={styles.guestSubtitle}>Masuk untuk akses profil, pesanan, dan wishlist</Text>
        <Pressable style={styles.loginButton} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.loginButtonText}>Masuk / Daftar</Text>
        </Pressable>
      </View>
    );
  }

  const avatarUrl = getAvatarUrl(user.avatar);

  return (
    <ScrollView keyboardDismissMode="on-drag" style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{user.name?.charAt(0)?.toUpperCase() || "?"}</Text>
          </View>
        )}
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      {MENU_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menuCard}>
            {section.items.map((item, index) => (
              <Pressable
                key={item.route}
                style={[styles.menuItem, index < section.items.length - 1 && styles.menuItemBorder]}
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
        </View>
      ))}

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color={COLORS.primary} />
        <Text style={styles.logoutText}>Keluar</Text>
      </Pressable>

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  guestContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: SPACING.xl },
  guestTitle: { color: COLORS.text, fontSize: 17, fontWeight: "700", marginTop: 16 },
  guestSubtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 6, textAlign: "center" },
  loginButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: 28, marginTop: 24 },
  loginButtonText: { color: COLORS.text, fontWeight: "600" },
  header: { alignItems: "center", paddingTop: SPACING.xxl, paddingBottom: SPACING.xl },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: COLORS.primary },
  avatarPlaceholder: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: COLORS.text, fontSize: 32, fontWeight: "700" },
  userName: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginTop: 14 },
  userEmail: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  sectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 },
  menuCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, ...CARD_SHADOW },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuItemText: { color: COLORS.text, fontSize: 14 },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: SPACING.lg, marginTop: SPACING.sm, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.primary },
  logoutText: { color: COLORS.primary, fontWeight: "600", fontSize: 14 },
});