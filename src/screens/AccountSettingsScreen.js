import { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator, 
  Image, 
  Platform, 
  KeyboardAvoidingView, 
  Alert 
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useAuth } from "../context/AuthContext";
import { getMyProfile, updateProfile, changeMyPassword } from "../services/userService";
import PasswordInput from "../components/PasswordInput";
import AppTextInput from "../components/AppTextInput";
import { getAvatarUrl } from "../constants/api";

const TABS = [
  { key: "profile", label: "Profil", icon: "person-outline" },
  { key: "password", label: "Keamanan", icon: "lock-closed-outline" },
  { key: "preference", label: "Preferensi", icon: "options-outline" },
];

const GENDER_OPTIONS = [
  { value: "Male", label: "Pria" },
  { value: "Female", label: "Wanita" },
];

const PREF_GENDER_OPTIONS = [
  { value: "Male", label: "Pria" },
  { value: "Female", label: "Wanita" },
  { value: "Unisex", label: "Unisex" },
];

const AROMA_OPTIONS = ["Floral", "Woody", "Citrus", "Spicy", "Aquatic", "Fresh", "Vanilla", "Musky"];

const LONGEVITY_OPTIONS = [
  { value: "<4 jam", label: "< 4 Jam" },
  { value: "4-8 jam", label: "4-8 Jam" },
  { value: ">8 jam", label: "> 8 Jam" },
];

const formatDateInput = (text) => {
  if (!text) return "";
  const cleaned = text.replace(/[^0-9]/g, "");
  let formatted = cleaned;
  if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  if (cleaned.length > 4) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  return formatted;
};

// Fungsi untuk memformat nomor telepon otomatis (misal: 0812-3456-7890)
const formatPhoneInput = (text) => {
  if (!text) return "";
  const cleaned = text.replace(/[^0-9]/g, "");
  let formatted = cleaned;
  if (cleaned.length > 4 && cleaned.length <= 8) {
    formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  } else if (cleaned.length > 8) {
    formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 13)}`;
  }
  return formatted;
};

const backendToDisplayDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

const displayToBackendDate = (dateStr) => {
  if (!dateStr || dateStr.length !== 10) return dateStr;
  const [day, month, year] = dateStr.split("/");
  if (day && month && year) return `${year}-${month}-${day}`;
  return dateStr;
};

function Chip({ label, active, onPress }) {
  return (
    <Pressable 
      style={[styles.chip, active && styles.chipActive]} 
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function AccountSettingsScreen({ navigation }) {
  const { refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [initialProfile, setInitialProfile] = useState(null);
  const [profile, setProfile] = useState({
    full_name: "", phone: "", username: "", birth_date: "", gender: "", bio: "",
    pref_gender: "", pref_aroma: "", pref_longevity: "",
  });
  
  const [avatarUri, setAvatarUri] = useState(null);
  const [currentAvatar, setCurrentAvatar] = useState(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isSavedRef = useRef(false);

  useEffect(() => {
    getMyProfile().then((user) => {
      const loadedProfile = {
        full_name: user.full_name || "",
        phone: user.phone ? formatPhoneInput(user.phone) : "",
        username: user.username || "",
        birth_date: backendToDisplayDate(user.birth_date) || "",
        gender: user.gender || "",
        bio: user.bio || "",
        pref_gender: user.pref_gender || "",
        pref_aroma: user.pref_aroma || "",
        pref_longevity: user.pref_longevity || "",
      };
      setProfile(loadedProfile);
      setInitialProfile(loadedProfile);
      setCurrentAvatar(user.avatar);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const hasProfileChanges = initialProfile && JSON.stringify(profile) !== JSON.stringify(initialProfile);
      const hasAvatarChanges = avatarUri !== null;
      const hasPasswordChanges = oldPassword !== "" || newPassword !== "" || confirmPassword !== "";
      
      const hasUnsavedChanges = hasProfileChanges || hasAvatarChanges || hasPasswordChanges;

      if (!hasUnsavedChanges || isSavedRef.current) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Perubahan Belum Disimpan',
        'Anda memiliki perubahan yang belum disimpan. Yakin ingin kembali dan membuang perubahan?',
        [
          { text: 'Batal', style: 'cancel', onPress: () => {} },
          {
            text: 'Buang Perubahan',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, profile, initialProfile, avatarUri, oldPassword, newPassword, confirmPassword]);

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 3500);
  };

  const toggleMultiValue = (field, value) => {
    const current = profile[field] ? profile[field].split(",") : [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setProfile({ ...profile, [field]: updated.join(",") });
  };

  const isMultiValueActive = (field, value) => {
    const current = profile[field] ? profile[field].split(",") : [];
    return current.includes(value);
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...profile,
        birth_date: displayToBackendDate(profile.birth_date)
      };

      await updateProfile(payload, avatarUri);
      await refreshUser();
      showMessage("Profil berhasil disimpan");
      
      setTimeout(() => {
        isSavedRef.current = true;
        if (navigation.canGoBack()) navigation.goBack();
      }, 1000);

    } catch (err) {
      showMessage(err?.response?.data?.message || "Gagal menyimpan profil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreference = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        pref_gender: profile.pref_gender,
        pref_aroma: profile.pref_aroma,
        pref_longevity: profile.pref_longevity,
      });
      showMessage("Preferensi berhasil disimpan");

      setTimeout(() => {
        isSavedRef.current = true;
        if (navigation.canGoBack()) navigation.goBack();
      }, 1000);

    } catch (err) {
      showMessage(err?.response?.data?.message || "Gagal menyimpan preferensi");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      showMessage("Password lama & baru wajib diisi");
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage("Konfirmasi password tidak cocok");
      return;
    }
    setIsSaving(true);
    try {
      await changeMyPassword(oldPassword, newPassword);
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      showMessage("Password berhasil diubah");
    } catch (err) {
      showMessage(err?.response?.data?.message || "Gagal mengubah password");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Segmented Control Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons 
                name={tab.icon} 
                size={16} 
                color={isActive ? COLORS.background : COLORS.textMuted} 
                style={{ marginRight: 6 }} 
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Floating Toast Message */}
      {!!message && (
        <View style={styles.toastBanner}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.toastText}>{message}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "profile" && (
            <View style={styles.formCard}>
              <View style={styles.avatarSection}>
                <Pressable onPress={pickAvatar} style={styles.avatarWrapper}>
                  {avatarUri || getAvatarUrl(currentAvatar) ? (
                    <Image source={{ uri: avatarUri || getAvatarUrl(currentAvatar) }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={40} color={COLORS.border} />
                    </View>
                  )}
                  {/* Camera Icon Badge */}
                  <View style={styles.avatarBadge}>
                    <Ionicons name="camera" size={14} color="#FFF" />
                  </View>
                </Pressable>
                <Text style={styles.avatarHelperText}>Ketuk untuk mengubah foto</Text>
              </View>

              <Text style={styles.label}>Nama Lengkap</Text>
              <AppTextInput 
                style={styles.input} 
                value={profile.full_name} 
                onChangeText={(v) => setProfile({ ...profile, full_name: v })} 
                placeholder="Masukkan nama lengkap"
              />

              <Text style={styles.label}>Username</Text>
              <AppTextInput 
                style={styles.input} 
                value={profile.username} 
                onChangeText={(v) => setProfile({ ...profile, username: v })} 
                autoCapitalize="none" 
                placeholder="username123"
              />

              <Text style={styles.label}>No. Telepon</Text>
              <AppTextInput 
                style={styles.input} 
                value={profile.phone} 
                onChangeText={(v) => setProfile({ ...profile, phone: formatPhoneInput(v) })} 
                keyboardType="phone-pad" 
                placeholder="0812-3456-7890"
                maxLength={14}
              />

              <Text style={styles.label}>Tanggal Lahir (DD/MM/YYYY)</Text>
              <AppTextInput 
                style={styles.input} 
                value={profile.birth_date} 
                onChangeText={(v) => setProfile({ ...profile, birth_date: formatDateInput(v) })} 
                placeholder="20/05/1998" 
                keyboardType="number-pad"
                maxLength={10}
              />

              <Text style={styles.label}>Gender</Text>
              <View style={styles.chipRow}>
                {GENDER_OPTIONS.map((opt) => (
                  <Chip 
                    key={opt.value} 
                    label={opt.label} 
                    active={profile.gender === opt.value} 
                    onPress={() => setProfile({ ...profile, gender: opt.value })} 
                  />
                ))}
              </View>

              <Text style={styles.label}>Bio Singkat</Text>
              <AppTextInput 
                style={[styles.input, styles.textArea]} 
                value={profile.bio} 
                onChangeText={(v) => setProfile({ ...profile, bio: v })} 
                multiline 
                placeholder="Tulis sedikit tentang dirimu..."
              />

              <Pressable 
                style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]} 
                onPress={handleSaveProfile} 
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color={COLORS.background} style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>Simpan Profil</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {activeTab === "password" && (
            <View style={styles.formCard}>
              <View style={styles.iconHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name="shield-checkmark" size={32} color={COLORS.primary} />
                </View>
                <Text style={styles.iconHeaderTitle}>Perbarui Keamanan</Text>
                <Text style={styles.iconHeaderSub}>Gunakan password yang kuat demi keamanan akunmu.</Text>
              </View>

              <Text style={styles.label}>Password Lama</Text>
              <PasswordInput 
                value={oldPassword} 
                onChangeText={setOldPassword} 
                placeholder="Masukkan password lama" 
              />

              <Text style={styles.label}>Password Baru</Text>
              <PasswordInput 
                value={newPassword} 
                onChangeText={setNewPassword} 
                placeholder="Minimal 6 karakter" 
              />

              <Text style={styles.label}>Konfirmasi Password Baru</Text>
              <PasswordInput 
                value={confirmPassword} 
                onChangeText={setConfirmPassword} 
                placeholder="Ulangi password baru" 
              />

              <Pressable 
                style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]} 
                onPress={handleChangePassword} 
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.saveButtonText}>Ubah Password</Text>}
              </Pressable>
            </View>
          )}

          {activeTab === "preference" && (
            <View style={styles.formCard}>
              <View style={styles.iconHeader}>
                <View style={[styles.iconCircle, { backgroundColor: `${COLORS.primary}15` }]}>
                  <Ionicons name="sparkles" size={32} color={COLORS.primary} />
                </View>
                <Text style={styles.iconHeaderTitle}>Personalisasi Parfum</Text>
                <Text style={styles.iconHeaderSub}>Bantu kami memberikan rekomendasi yang paling cocok untuk seleramu.</Text>
              </View>

              <Text style={styles.label}>Preferensi Gender Parfum (Pilih Satu)</Text>
              <View style={styles.chipRow}>
                {PREF_GENDER_OPTIONS.map((opt) => (
                  <Chip 
                    key={opt.value} 
                    label={opt.label} 
                    active={profile.pref_gender === opt.value} 
                    onPress={() => setProfile({ ...profile, pref_gender: opt.value })} 
                  />
                ))}
              </View>

              <Text style={styles.label}>Aroma Favorit (Boleh Lebih Dari Satu)</Text>
              <View style={styles.chipRow}>
                {AROMA_OPTIONS.map((aroma) => (
                  <Chip 
                    key={aroma} 
                    label={aroma} 
                    active={isMultiValueActive("pref_aroma", aroma)} 
                    onPress={() => toggleMultiValue("pref_aroma", aroma)} 
                  />
                ))}
              </View>

              <Text style={styles.label}>Daya Tahan yang Disukai (Boleh Lebih Dari Satu)</Text>
              <View style={styles.chipRow}>
                {LONGEVITY_OPTIONS.map((opt) => (
                  <Chip 
                    key={opt.value} 
                    label={opt.label} 
                    active={isMultiValueActive("pref_longevity", opt.value)} 
                    onPress={() => toggleMultiValue("pref_longevity", opt.value)} 
                  />
                ))}
              </View>

              <Pressable 
                style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]} 
                onPress={handleSavePreference} 
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.saveButtonText}>Simpan Preferensi</Text>}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" },
  
  // Segmented Tabs
  tabContainer: { 
    flexDirection: "row", 
    backgroundColor: COLORS.surface, 
    margin: 16, 
    padding: 4, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabButton: { 
    flex: 1, 
    flexDirection: "row",
    paddingVertical: 10, 
    alignItems: "center", 
    justifyContent: "center",
    borderRadius: 8,
  },
  tabButtonActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: COLORS.background, fontWeight: "700" },

  // Toast / Floating Message
  toastBanner: { 
    position: "absolute",
    top: 70,
    alignSelf: "center",
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface, 
    paddingVertical: 12,
    paddingHorizontal: 20, 
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toastText: { color: COLORS.text, fontSize: 13, fontWeight: "600", marginLeft: 8 },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  // Form Card / Container
  formCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },

  // Avatar Area
  avatarSection: { alignItems: "center", marginBottom: 24, marginTop: 8 },
  avatarWrapper: { position: "relative" },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { 
    width: 100, height: 100, borderRadius: 50, 
    backgroundColor: COLORS.background, 
    borderWidth: 1, borderColor: COLORS.border, 
    alignItems: "center", justifyContent: "center" 
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  avatarHelperText: { color: COLORS.textMuted, fontSize: 12, marginTop: 12 },

  // Header Icons for sub-tabs
  iconHeader: { alignItems: "center", marginBottom: 24, marginTop: 8 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${COLORS.primary}15`, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  iconHeaderTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  iconHeaderSub: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20, paddingHorizontal: 10 },

  // Typography & Inputs
  label: { color: COLORS.text, fontSize: 13, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  input: { 
    backgroundColor: COLORS.background, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 10, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    color: COLORS.text,
    fontSize: 14,
  },
  textArea: { height: 100, textAlignVertical: "top" },

  // Chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { 
    backgroundColor: COLORS.background, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 20, 
    paddingVertical: 8, 
    paddingHorizontal: 16 
  },
  chipActive: { backgroundColor: `${COLORS.primary}15`, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "500" },
  chipTextActive: { color: COLORS.primary, fontWeight: "700" },

  // Button
  saveButton: { 
    flexDirection: "row",
    backgroundColor: COLORS.primary, 
    borderRadius: 12, 
    paddingVertical: 16, 
    alignItems: "center",
    justifyContent: "center", 
    marginTop: 32, 
    marginBottom: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  saveButtonText: { color: COLORS.background, fontWeight: "700", fontSize: 15 },
});