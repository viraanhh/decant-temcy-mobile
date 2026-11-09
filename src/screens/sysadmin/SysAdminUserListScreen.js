import { useState, useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Modal, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getSysAdminUsers, toggleSysAdminUserStatus } from "../../services/adminService";
import { useAuth } from "../../context/AuthContext";
import AppTextInput from "../../components/AppTextInput";

const FETCH_LIMIT = 200;
const ROLE_LABEL = { customer: "Customer", admin: "Admin", sysadmin: "SysAdmin" };
const ROLE_COLOR = { customer: "#3b82f6", admin: "#f59e0b", sysadmin: "#8b5cf6" };
const ROLE_FILTERS = [
  { key: "", label: "Semua" },
  { key: "customer", label: "Customer" },
  { key: "admin", label: "Admin" },
  { key: "sysadmin", label: "SysAdmin" },
];

const getInitials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

export default function SysAdminUserListScreen({ navigation, route }) {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [confirmConfig, setConfirmConfig] = useState({ visible: false, user: null, title: "", message: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  // Filter role dari Beranda (kartu role)
  useEffect(() => {
    if (route?.params?.role !== undefined) setRoleFilter(route.params.role);
  }, [route?.params?.t]);

  const loadUsers = useCallback(() => {
    setIsLoading(true);
    getSysAdminUsers({ page: 1, limit: FETCH_LIMIT })
      .then((res) => setUsers(res.users))
      .catch((err) => console.log("Error loading users:", err?.message))
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(loadUsers);

  const clearSearch = () => {
    setSearchQuery("");
    Keyboard.dismiss();
  };

  const showConfirmModal = (target) => {
    setConfirmPassword("");
    setConfirmError("");
    setConfirmConfig({
      visible: true,
      user: target,
      title: target.is_active ? "Nonaktifkan Akun" : "Aktifkan Akun",
      message: `Apakah Anda yakin ingin ${target.is_active ? "menonaktifkan" : "mengaktifkan"} akun milik "${target.full_name}"? ${target.is_active ? "User ini tidak akan bisa login sementara waktu." : "User ini akan dapat kembali login dan berbelanja."}`,
    });
  };

  const closeConfirmModal = () => {
    setConfirmConfig({ visible: false, user: null, title: "", message: "" });
    setConfirmPassword("");
    setConfirmError("");
  };

  const executeToggleStatus = async () => {
    const target = confirmConfig.user;
    if (!target) return;
    if (!confirmPassword) {
      setConfirmError("Password Anda wajib diisi");
      return;
    }

    setIsConfirming(true);
    setConfirmError("");
    try {
      const result = await toggleSysAdminUserStatus(target.user_id, confirmPassword);
      setUsers((prev) => prev.map((u) => (u.user_id === target.user_id ? result.user : u)));
      closeConfirmModal();
    } catch (err) {
      setConfirmError(err?.message || "Gagal mengubah status");
    } finally {
      setIsConfirming(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchText = `${u.full_name} ${u.email}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchText && matchRole;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kelola Users</Text>
        <Text style={styles.subtitle}>{filteredUsers.length} akun</Text>
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

      <View style={styles.filterRow}>
        {ROLE_FILTERS.map((f) => (
          <Pressable
            key={f.key || "all"}
            style={[styles.filterChip, roleFilter === f.key && styles.filterChipActive]}
            onPress={() => setRoleFilter(f.key)}
          >
            <Text style={[styles.filterText, roleFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => String(item.user_id)}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada user ditemukan.</Text>}
          renderItem={({ item }) => {
            const isMe = item.user_id === user?.id;
            const roleColor = ROLE_COLOR[item.role] || ROLE_COLOR.customer;
            return (
              <View style={styles.card}>
                <Pressable
                  style={styles.cardMain}
                  onPress={() => navigation.navigate("SysAdminUserForm", { user: item })}
                >
                  <View style={[styles.avatar, { backgroundColor: `${roleColor}25`, borderColor: roleColor }]}>
                    <Text style={[styles.avatarText, { color: roleColor }]}>{getInitials(item.full_name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>{item.full_name}</Text>
                      {isMe && <Text style={styles.meTag}>Anda</Text>}
                    </View>
                    <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
                    <Text style={[styles.roleBadge, { color: roleColor, borderColor: roleColor }]}>
                      {ROLE_LABEL[item.role] || item.role}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  style={[
                    styles.statusButton,
                    item.is_active ? styles.statusActive : styles.statusInactive,
                    isMe && { opacity: 0.4 },
                  ]}
                  onPress={() => showConfirmModal(item)}
                  disabled={isMe}
                >
                  <Text style={[styles.statusButtonText, { color: item.is_active ? COLORS.success : COLORS.primary }]}>
                    {item.is_active ? "Aktif" : "Nonaktif"}
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}

      {/* Tombol melayang: tambah user */}
      <Pressable style={styles.fab} onPress={() => navigation.navigate("SysAdminUserForm")}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      <Modal visible={confirmConfig.visible} animationType="fade" transparent>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.confirmModalContent}>
            <View
              style={[
                styles.confirmIconContainer,
                confirmConfig.user?.is_active ? styles.confirmDangerIconBg : styles.confirmSuccessIconBg,
              ]}
            >
              <Ionicons
                name={confirmConfig.user?.is_active ? "lock-closed-outline" : "lock-open-outline"}
                size={32}
                color={confirmConfig.user?.is_active ? "#FF4B4B" : "#3DBA6C"}
              />
            </View>

            <Text style={styles.confirmTitle}>{confirmConfig.title}</Text>
            <Text style={styles.confirmMessage}>{confirmConfig.message}</Text>

            <View style={{ width: "100%", marginBottom: SPACING.md }}>
              <Text style={styles.reauthLabel}>Password Anda (Re-autentikasi)</Text>
              <AppTextInput
                style={styles.reauthInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Password akun sysadmin Anda"
                secureTextEntry
              />
            </View>

            {!!confirmError && <Text style={styles.confirmError}>{confirmError}</Text>}

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.modalCancel]} onPress={closeConfirmModal} disabled={isConfirming}>
                <Text style={styles.modalCancelText}>Kembali</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  confirmConfig.user?.is_active ? styles.confirmDangerButton : styles.confirmSuccessButton,
                ]}
                onPress={executeToggleStatus}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>
                    {confirmConfig.user?.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Text>
                )}
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

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
  },
  searchInput: { backgroundColor: "transparent", borderWidth: 0, padding: 10, color: COLORS.text, fontSize: 13 },
  clearButton: { padding: 4 },

  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: SPACING.lg, marginBottom: SPACING.xs },
  filterChip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingVertical: 6, paddingHorizontal: 14 },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  filterTextActive: { color: COLORS.text },

  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center", marginTop: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...CARD_SHADOW,
  },
  cardMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "800" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { color: COLORS.text, fontWeight: "700", fontSize: 13, flexShrink: 1 },
  meTag: { color: COLORS.textMuted, fontSize: 10, fontStyle: "italic" },
  email: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  roleBadge: { alignSelf: "flex-start", marginTop: 4, fontSize: 9, fontWeight: "800", borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 1 },

  statusButton: {
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  statusActive: { borderColor: COLORS.success, backgroundColor: `${COLORS.success}10` },
  statusInactive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  statusButtonText: { fontSize: 11, fontWeight: "700" },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  confirmModalContent: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    width: "100%",
    alignItems: "center",
    ...CARD_SHADOW,
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  confirmDangerIconBg: { backgroundColor: "#FF4B4B15" },
  confirmSuccessIconBg: { backgroundColor: "#3DBA6C15" },
  confirmTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  confirmMessage: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  reauthLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  reauthInput: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text },
  confirmError: { color: "#FF4B4B", fontSize: 12, marginBottom: SPACING.sm, textAlign: "center" },

  modalActions: { flexDirection: "row", gap: SPACING.sm, width: "100%" },
  modalButton: { flex: 1, padding: 14, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center" },
  modalCancel: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  confirmDangerButton: { backgroundColor: "#FF4B4B" },
  confirmSuccessButton: { backgroundColor: "#3DBA6C" },
  modalCancelText: { color: COLORS.text, fontWeight: "600" },
  modalSubmitText: { color: "#FFFFFF", fontWeight: "700" },
});