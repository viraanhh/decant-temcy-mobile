import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Modal, Platform, StatusBar, Keyboard } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context"; // HAPUS INI
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getAdminUsers, toggleUserStatus } from "../../services/adminService";
import AppTextInput from "../../components/AppTextInput";

const FETCH_LIMIT = 200;

export default function AdminUserListScreen() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // State untuk Custom Confirm Modal
  const [confirmConfig, setConfirmConfig] = useState({ 
    visible: false, 
    user: null,
    title: "", 
    message: "" 
  });

  // const insets = useSafeAreaInsets(); // HAPUS INI
  // const safeTopPadding = insets.top > 0 ? insets.top : (Platform.OS === "android" ? StatusBar.currentHeight : 44); // HAPUS INI

  const loadUsers = useCallback(() => {
    setIsLoading(true);
    getAdminUsers({ page: 1, limit: FETCH_LIMIT })
      .then((res) => setUsers(res.users))
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(loadUsers);

  const clearSearch = () => {
    setSearchQuery("");
    Keyboard.dismiss();
  };

  const showConfirmModal = (user) => {
    setConfirmConfig({
      visible: true,
      user: user,
      title: user.is_active ? "Nonaktifkan Akun" : "Aktifkan Akun",
      message: `Apakah Anda yakin ingin ${user.is_active ? "menonaktifkan" : "mengaktifkan"} akun milik "${user.full_name}"? ${user.is_active ? "User ini tidak akan bisa login sementara waktu." : "User ini akan dapat kembali login dan berbelanja."}`
    });
  };

  const closeConfirmModal = () => {
    setConfirmConfig({ visible: false, user: null, title: "", message: "" });
  };

  const executeToggleStatus = async () => {
    const userToUpdate = confirmConfig.user;
    if (!userToUpdate) return;
    
    closeConfirmModal();
    setUpdatingId(userToUpdate.user_id);
    
    try {
      const result = await toggleUserStatus(userToUpdate.user_id);
      setUsers((prev) => prev.map((u) => (u.user_id === userToUpdate.user_id ? result.user : u)));
    } catch (err) {
      console.log("Error toggling user status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((u) =>
    `${u.full_name} ${u.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    // UBAH VIEW INI -> hapus { paddingTop: safeTopPadding }
    <View style={styles.container}> 
      <View style={styles.header}>
        <Text style={styles.title}>Kelola Users</Text>
        <Text style={styles.subtitle}>{filteredUsers.length} pelanggan</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <View style={{ flex: 1 }}>
          <AppTextInput 
            style={styles.searchInput} 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
            placeholder="Cari nama atau email..." 
          />
        </View>
        {searchQuery ? (
          <Pressable onPress={clearSearch} style={styles.clearButton} hitSlop={15}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => String(item.user_id)}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.sm }}
          ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada pelanggan ditemukan.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.email}>{item.email}</Text>
                {!!item.phone && <Text style={styles.phone}>{item.phone}</Text>}
              </View>
              <Pressable
                style={[styles.statusButton, item.is_active ? styles.statusActive : styles.statusInactive]}
                onPress={() => showConfirmModal(item)}
                disabled={updatingId === item.user_id}
              >
                {updatingId === item.user_id ? (
                  <ActivityIndicator size="small" color={item.is_active ? COLORS.success : COLORS.primary} />
                ) : (
                  <Text style={[styles.statusButtonText, { color: item.is_active ? COLORS.success : COLORS.primary }]}>
                    {item.is_active ? "Aktif" : "Nonaktif"}
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        />
      )}

      {/* Modal Custom: Konfirmasi Status User */}
      <Modal visible={confirmConfig.visible} animationType="fade" transparent>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.confirmModalContent}>
            
            {/* Ikon Dinamis (Merah/Gembok untuk nonaktif, Hijau/Buka untuk aktif) */}
            <View style={[
                styles.confirmIconContainer, 
                confirmConfig.user?.is_active ? styles.confirmDangerIconBg : styles.confirmSuccessIconBg
              ]}>
              <Ionicons 
                name={confirmConfig.user?.is_active ? "lock-closed-outline" : "lock-open-outline"} 
                size={32} 
                color={confirmConfig.user?.is_active ? "#FF4B4B" : "#3DBA6C"} 
              />
            </View>
            
            <Text style={styles.confirmTitle}>{confirmConfig.title}</Text>
            <Text style={styles.confirmMessage}>{confirmConfig.message}</Text>
            
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.modalCancel]} onPress={closeConfirmModal}>
                <Text style={styles.modalCancelText}>Kembali</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, confirmConfig.user?.is_active ? styles.confirmDangerButton : styles.confirmSuccessButton]} 
                onPress={executeToggleStatus}
              >
                <Text style={styles.modalSubmitText}>{confirmConfig.user?.is_active ? "Nonaktifkan" : "Aktifkan"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingBottom: SPACING.sm },
  title: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
  subtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14 },
  searchInput: { backgroundColor: "transparent", borderWidth: 0, padding: 10, color: COLORS.text, fontSize: 13 },
  clearButton: { padding: 4 },
  
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center", marginTop: 20 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, ...CARD_SHADOW },
  name: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  email: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  phone: { color: COLORS.textFaint, fontSize: 11, marginTop: 2 },
  
  statusButton: { borderRadius: RADIUS.full, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, minWidth: 70, alignItems: "center", justifyContent: "center" },
  statusActive: { borderColor: COLORS.success, backgroundColor: `${COLORS.success}10` },
  statusInactive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  statusButtonText: { fontSize: 11, fontWeight: "700" },

  // Styles untuk Custom Confirm Modal
  modalOverlayCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: SPACING.xl },
  confirmModalContent: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.xl, width: "100%", alignItems: "center", ...CARD_SHADOW },
  confirmIconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: SPACING.md },
  confirmDangerIconBg: { backgroundColor: "#FF4B4B15" },
  confirmSuccessIconBg: { backgroundColor: "#3DBA6C15" },
  confirmTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  confirmMessage: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", marginBottom: SPACING.xl, lineHeight: 20 },
  
  modalActions: { flexDirection: "row", gap: SPACING.sm, width: "100%" },
  modalButton: { flex: 1, padding: 14, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center" },
  modalCancel: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  confirmDangerButton: { backgroundColor: "#FF4B4B" },
  confirmSuccessButton: { backgroundColor: "#3DBA6C" },
  modalCancelText: { color: COLORS.text, fontWeight: "600" },
  modalSubmitText: { color: "#FFFFFF", fontWeight: "700" }, 
});