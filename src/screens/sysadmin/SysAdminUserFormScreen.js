import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { createSysAdminUser, updateSysAdminUser, setSysAdminUserRole, resetSysAdminUserPassword } from "../../services/adminService";
import { useAuth } from "../../context/AuthContext";
import AppTextInput from "../../components/AppTextInput";

const ROLE_OPTIONS = ["customer", "admin", "sysadmin"];
const ROLE_LABEL = { customer: "Customer", admin: "Admin Toko", sysadmin: "System Admin" };
const ROLE_ICON = { customer: "people", admin: "storefront", sysadmin: "shield-checkmark" };

const formatPhoneNumber = (text) => {
  const cleaned = text.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{0,4})(\d{0,4})(\d{0,4})$/);
  if (match) {
    return [match[1], match[2], match[3]].filter(Boolean).join("-");
  }
  return text;
};

export default function SysAdminUserFormScreen({ route, navigation }) {
  const { user: me } = useAuth();
  const existing = route?.params?.user;
  const isEdit = !!existing;
  const isSelf = isEdit && existing.user_id === me?.id;

  const [initialForm] = useState({
    full_name: existing?.full_name || "",
    email: existing?.email || "",
    phone: existing?.phone ? formatPhoneNumber(existing.phone) : "",
    role: existing?.role || "customer",
    password: "",
  });

  const [form, setForm] = useState(initialForm);
  const [roleAuth, setRoleAuth] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isSavedRef = useRef(false);

  const [resetForm, setResetForm] = useState({ new_password: "", sysadmin_password: "" });
  const [isResetting, setIsResetting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showRoleAuth, setShowRoleAuth] = useState(false);
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetSysadminPassword, setShowResetSysadminPassword] = useState(false);

  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const roleChanged = isEdit && form.role !== existing.role;

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(initialForm);
      if (!hasUnsavedChanges || isSavedRef.current) return;

      e.preventDefault();
      setPendingAction(e.data.action);
      setShowExitModal(true);
    });
    return unsubscribe;
  }, [navigation, form, initialForm]);

  const handleConfirmExit = () => {
    setShowExitModal(false);
    if (pendingAction) {
      navigation.dispatch(pendingAction);
    }
  };

  const setField = (key, value) => {
    if (key === "phone") {
      setForm((prev) => ({ ...prev, [key]: formatPhoneNumber(value) }));
    } else {
      setForm((prev) => ({ ...prev, [key]: value }));
    }
  };
  
  const errMsg = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

  const handleSave = async () => {
    if (!form.full_name || !form.email) return; 
    if (!isEdit && (!form.password || form.password.length < 8)) return; 
    if (roleChanged && !roleAuth) return; 

    setIsSaving(true);
    try {
      if (isEdit) {
        if (roleChanged) {
          await setSysAdminUserRole(existing.user_id, form.role, roleAuth);
        }
        await updateSysAdminUser(existing.user_id, {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone.replace(/-/g, "") || null,
        });
      } else {
        await createSysAdminUser({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone.replace(/-/g, "") || null,
          role: form.role,
          password: form.password,
        });
      }

      isSavedRef.current = true;
      navigation.goBack();
    } catch (err) {
      console.log(errMsg(err, "Gagal menyimpan data pengguna"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetForm.new_password || !resetForm.sysadmin_password) return;
    if (resetForm.new_password.length < 8) return;
    
    setIsResetting(true);
    try {
      await resetSysAdminUserPassword(existing.user_id, resetForm);
      setResetForm({ new_password: "", sysadmin_password: "" });
      alert("Password berhasil direset!");
    } catch (err) {
      console.log(errMsg(err, "Gagal mereset password"));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: 60 }}
        >
          {/* SECTION: IDENTITAS PENGGUNA */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Identitas Pengguna</Text>
            
            <Text style={styles.label}>Nama Lengkap <Text style={{ color: "#EF4444" }}>*</Text></Text>
            <AppTextInput 
              style={styles.input} 
              value={form.full_name} 
              onChangeText={(v) => setField("full_name", v)} 
              placeholder="Masukkan nama lengkap" 
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.label}>Alamat Email <Text style={{ color: "#EF4444" }}>*</Text></Text>
            <AppTextInput 
              style={styles.input} 
              value={form.email} 
              onChangeText={(v) => setField("email", v)} 
              placeholder="email@example.com" 
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address" 
              autoCapitalize="none" 
            />

            <Text style={styles.label}>Nomor Telepon (Opsional)</Text>
            <AppTextInput 
              style={styles.input} 
              value={form.phone} 
              onChangeText={(v) => setField("phone", v)} 
              placeholder="0812-3456-7890" 
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad" 
              maxLength={15} 
            />
          </View>

          {/* SECTION: PENGATURAN ROLE (HAK AKSES) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Hak Akses (Role)</Text>
            <View style={styles.chipRow}>
              {ROLE_OPTIONS.map((r) => {
                const isActive = form.role === r;
                return (
                  <Pressable
                    key={r}
                    style={[
                      styles.chip, 
                      isActive && styles.chipActive, 
                      isSelf && styles.chipDisabled
                    ]}
                    onPress={() => setField("role", r)}
                    disabled={isSelf}
                  >
                    <Ionicons 
                      name={ROLE_ICON[r]} 
                      size={18} 
                      color={isActive ? COLORS.primary : COLORS.textMuted} 
                    />
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {ROLE_LABEL[r]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {isSelf && (
              <View style={styles.hintBox}>
                <Ionicons name="information-circle" size={16} color={COLORS.primary} />
                <Text style={styles.hintText}>Anda tidak dapat mengubah hak akses akun Anda sendiri.</Text>
              </View>
            )}

            {roleChanged && (
              <View style={styles.reauthBox}>
                <Text style={styles.warningTitle}>Perubahan Hak Akses Dideteksi</Text>
                <Text style={styles.label}>Masukkan Password Sysadmin Anda <Text style={{ color: "#EF4444" }}>*</Text></Text>
                <View style={styles.passwordContainer}>
                  <AppTextInput
                    style={styles.passwordInput}
                    value={roleAuth}
                    onChangeText={setRoleAuth}
                    placeholder="Ketik password Anda..."
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showRoleAuth}
                  />
                  <Pressable onPress={() => setShowRoleAuth(!showRoleAuth)} style={styles.eyeIcon}>
                    <Ionicons name={showRoleAuth ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textMuted} />
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* SECTION: PASSWORD AWAL (KHUSUS TAMBAH AKUN BARU) */}
          {!isEdit && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Kata Sandi Awal</Text>
              <Text style={styles.label}>Password <Text style={{ color: "#EF4444" }}>*</Text></Text>
              <View style={styles.passwordContainer}>
                <AppTextInput
                  style={styles.passwordInput}
                  value={form.password}
                  onChangeText={(v) => setField("password", v)}
                  placeholder="Minimal 8 karakter"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textMuted} />
                </Pressable>
              </View>
            </View>
          )}

          {/* TOMBOL SIMPAN UTAMA */}
          <Pressable 
            style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.8 }]} 
            onPress={handleSave} 
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <>
                <Ionicons name={isEdit ? "save-outline" : "person-add-outline"} size={20} color={COLORS.surface} />
                <Text style={styles.saveButtonText}>{isEdit ? "Simpan Perubahan" : "Buat Akun Pengguna"}</Text>
              </>
            )}
          </Pressable>

          {/* SECTION: RESET PASSWORD (KHUSUS EDIT) */}
          {isEdit && (
            <View style={[styles.sectionCard, { borderColor: "rgba(245, 158, 11, 0.3)" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Ionicons name="key-outline" size={20} color="#F59E0B" />
                <Text style={styles.resetTitle}>Reset Password Pengguna</Text>
              </View>
              <Text style={styles.resetHint}>Ubah password untuk <Text style={{ fontWeight: "750", color: COLORS.text }}>{existing.email}</Text></Text>

              <Text style={styles.label}>Password Baru Pengguna <Text style={{ color: "#EF4444" }}>*</Text></Text>
              <View style={styles.passwordContainer}>
                <AppTextInput
                  style={styles.passwordInput}
                  value={resetForm.new_password}
                  onChangeText={(v) => setResetForm((p) => ({ ...p, new_password: v }))}
                  placeholder="Minimal 8 karakter"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showResetNewPassword}
                />
                <Pressable onPress={() => setShowResetNewPassword(!showResetNewPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showResetNewPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.label}>Otorisasi: Password Sysadmin Anda <Text style={{ color: "#EF4444" }}>*</Text></Text>
              <View style={styles.passwordContainer}>
                <AppTextInput
                  style={styles.passwordInput}
                  value={resetForm.sysadmin_password}
                  onChangeText={(v) => setResetForm((p) => ({ ...p, sysadmin_password: v }))}
                  placeholder="Ketik password Anda untuk otorisasi"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showResetSysadminPassword}
                />
                <Pressable onPress={() => setShowResetSysadminPassword(!showResetSysadminPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showResetSysadminPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textMuted} />
                </Pressable>
              </View>

              <Pressable 
                style={({ pressed }) => [styles.resetButton, pressed && { opacity: 0.8 }]} 
                onPress={handleResetPassword} 
                disabled={isResetting}
              >
                {isResetting ? (
                  <ActivityIndicator color={COLORS.surface} size="small" />
                ) : (
                  <Text style={styles.resetButtonText}>Terapkan Reset Password</Text>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL PERINGATAN KELUAR */}
      <Modal visible={showExitModal} transparent animationType="fade" onRequestClose={() => setShowExitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="alert-circle" size={36} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Perubahan Belum Disimpan</Text>
            <Text style={styles.modalText}>
              Anda memiliki data yang belum disimpan. Yakin ingin keluar dan membuang perubahan ini?
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowExitModal(false)}>
                <Text style={styles.modalButtonCancelText}>Kembali</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalButtonConfirm]} onPress={handleConfirmExit}>
                <Text style={styles.modalButtonConfirmText}>Buang</Text>
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
  
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...CARD_SHADOW,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  
  label: { color: COLORS.text, fontSize: 12, fontWeight: "600", marginTop: 10, marginBottom: 4 },
  
  input: { 
    backgroundColor: COLORS.background, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: RADIUS.sm, 
    paddingHorizontal: 12,
    paddingVertical: 10, 
    color: COLORS.text,
    fontSize: 14,
  },
  
  passwordContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: COLORS.background, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: RADIUS.sm 
  },
  passwordInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 14, borderWidth: 0, backgroundColor: "transparent" },
  eyeIcon: { paddingHorizontal: 14, paddingVertical: 10 },
  
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  chip: { 
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.background, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: RADIUS.sm, 
    paddingVertical: 10, 
    paddingHorizontal: 8,
    minWidth: "30%",
  },
  chipActive: { backgroundColor: "rgba(16, 185, 129, 0.1)", borderColor: "#10B981" },
  chipDisabled: { opacity: 0.5, backgroundColor: COLORS.background },
  chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#10B981", fontWeight: "750" },
  
  hintBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: `${COLORS.primary}10`, padding: 10, borderRadius: RADIUS.sm, marginTop: 12 },
  hintText: { color: COLORS.text, fontSize: 11, fontWeight: "500", flex: 1 },
  
  reauthBox: { marginTop: 12, padding: 12, backgroundColor: "rgba(239, 68, 68, 0.05)", borderRadius: RADIUS.sm, borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.3)" },
  warningTitle: { color: "#EF4444", fontSize: 13, fontWeight: "750", marginBottom: 2 },

  saveButton: { 
    backgroundColor: COLORS.primary, 
    borderRadius: RADIUS.md, 
    paddingVertical: 14, 
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center", 
    gap: 8,
    marginVertical: SPACING.xs,
    ...CARD_SHADOW 
  },
  saveButtonText: { color: COLORS.surface, fontWeight: "800", fontSize: 15 },
  
  resetTitle: { color: COLORS.text, fontWeight: "800", fontSize: 15 },
  resetHint: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  resetButton: { 
    backgroundColor: "#F59E0B", 
    borderRadius: RADIUS.md, 
    paddingVertical: 12, 
    alignItems: "center", 
    marginTop: 16,
    ...CARD_SHADOW
  },
  resetButtonText: { color: COLORS.surface, fontWeight: "800", fontSize: 14 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: SPACING.lg },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 24, width: "100%", maxWidth: 320, alignItems: "center", borderWidth: 1, borderColor: COLORS.border, ...CARD_SHADOW },
  modalIconContainer: { width: 64, height: 64, borderRadius: RADIUS.full, backgroundColor: "rgba(239, 68, 68, 0.1)", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  modalText: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", ...CARD_SHADOW },
  modalButtonCancel: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  modalButtonCancelText: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  modalButtonConfirm: { backgroundColor: "#EF4444" },
  modalButtonConfirmText: { color: COLORS.surface, fontWeight: "700", fontSize: 13 },
});