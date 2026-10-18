import { View, Text, Pressable, ScrollView, Image, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { getAvatarUrl } from "../constants/api";
import { deleteMyAccount } from "../services/userService";
import { useState } from "react";

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
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      "Hapus Akun Permanen",
      "Apakah Anda yakin ingin menghapus akun ini? Semua data, pesanan, dan wishlist akan hilang secara permanen dan tidak dapat dikembalikan.",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Ya, Hapus Akun", 
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteMyAccount();
              await logout();
            } catch (error) {
              Alert.alert("Gagal", error?.response?.data?.message || "Terjadi kesalahan saat menghapus akun.");
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.guestIconWrapper}>
          <Ionicons name="person" size={60} color={COLORS.primary} />
        </View>
        <Text style={styles.guestTitle}>Selamat Datang!</Text>
        <Text style={styles.guestSubtitle}>Masuk atau daftar sekarang untuk melacak pesanan, menyimpan wishlist, dan mengatur profil Anda.</Text>
        
        <View style={styles.guestActionRow}>
          <Pressable style={styles.guestLoginButton} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.guestLoginButtonText}>Masuk</Text>
          </Pressable>
          <Pressable style={styles.guestRegisterButton} onPress={() => navigation.navigate("Register")}>
            <Text style={styles.guestRegisterButtonText}>Daftar</Text>
          </Pressable>
        </View>

        <Pressable style={styles.guestAboutButton} onPress={() => navigation.navigate("About")}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.textMuted} />
          <Text style={styles.guestAboutText}>Tentang Kami</Text>
        </Pressable>
      </View>
    );
  }

  const avatarUrl = getAvatarUrl(user.avatar);
  
  // SOLUSI BLANK NAME: Cek name atau full_name
  const displayName = user.name || user.full_name || "Pengguna";

  return (
    <ScrollView keyboardDismissMode="on-drag" style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {/* Tampilkan displayName dengan margin yang sudah dirapikan */}
        <Text style={styles.userName}>{displayName}</Text>
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

      <Pressable style={styles.deleteAccountBtn} onPress={handleDeleteAccount} disabled={isDeleting}>
        {isDeleting ? (
          <ActivityIndicator color="#FF3B30" size="small" />
        ) : (
          <>
            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
            <Text style={styles.deleteAccountText}>Hapus Akun Permanen</Text>
          </>
        )}
      </Pressable>

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  guestContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: SPACING.xl },
  guestIconWrapper: { width: 120, height: 120, borderRadius: 60, backgroundColor: `${COLORS.primary}15`, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  guestTitle: { color: COLORS.text, fontSize: 24, fontWeight: "800", textAlign: "center" },
  guestSubtitle: { color: COLORS.textMuted, fontSize: 14, marginTop: 12, textAlign: "center", lineHeight: 22, paddingHorizontal: 20 },
  guestActionRow: { flexDirection: "row", gap: 12, marginTop: 32, width: "100%" },
  guestLoginButton: { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center" },
  guestLoginButtonText: { color: COLORS.text, fontWeight: "700", fontSize: 15 },
  guestRegisterButton: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center" },
  guestRegisterButtonText: { color: COLORS.primary, fontWeight: "700", fontSize: 15 },
  guestAboutButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 40, padding: 10 },
  guestAboutText: { color: COLORS.textMuted, fontSize: 13 },
  header: { alignItems: "center", paddingTop: 80, paddingBottom: SPACING.xl },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: COLORS.primary },
  avatarPlaceholder: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: COLORS.text, fontSize: 32, fontWeight: "700" },
  userName: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginTop: 8 },
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

  deleteAccountBtn: { 
    flexDirection: "row",
    alignItems: "center", 
    justifyContent: "center",
    gap: 6,
    marginHorizontal: SPACING.lg,
    marginTop: 20, 
    padding: 14,
    borderRadius: RADIUS.md,
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    borderColor: "#FF3B30"
  },
  deleteAccountText: { 
    color: "#FF3B30", 
    fontSize: 13, 
    fontWeight: "700"
  },
});