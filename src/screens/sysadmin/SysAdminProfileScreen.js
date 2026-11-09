import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

export default function SysAdminProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logout();
      navigation.replace("Login");
    } catch (error) {
      console.log("Gagal keluar dari akun.");
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Data user tidak ditemukan.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="shield-checkmark" size={50} color={COLORS.text} />
        </View>
        <Text style={styles.userName}>{user.full_name || "System Administrator"}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>SysAdmin</Text>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.primary} />
          <Text style={styles.logoutText}>Keluar</Text>
        </Pressable>
      </View>

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={32} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Keluar Akun</Text>
            <Text style={styles.modalText}>
              Apakah Anda yakin ingin keluar dari akun administrator sistem?
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.modalButtonCancelText}>Kembali</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalButtonConfirm]} onPress={handleConfirmLogout}>
                <Text style={styles.modalButtonConfirmText}>Keluar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg
  },
  profileHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  userName: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4
  },
  userEmail: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 12
  },
  roleBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)'
  },
  roleText: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center'
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface
  },
  logoutText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 16
  },
  errorText: {
    color: COLORS.primary,
    fontSize: 14,
    textAlign: 'center'
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: SPACING.lg },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  modalIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(239, 68, 68, 0.1)", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  modalText: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalButtonCancel: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  modalButtonCancelText: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  modalButtonConfirm: { backgroundColor: "#ef4444" },
  modalButtonConfirmText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});