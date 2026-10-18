import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Image, Platform, KeyboardAvoidingView, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "../constants/colors";
import { useAuth } from "../context/AuthContext";
import { getMyProfile, updateProfile, changeMyPassword } from "../services/userService";
import PasswordInput from "../components/PasswordInput";
import AppTextInput from "../components/AppTextInput";
import { getAvatarUrl } from "../constants/api";

const TABS = [
  { key: "profile", label: "PROFIL" },
  { key: "password", label: "PASSWORD" },
  { key: "preference", label: "PREFERENSI" },
];

const GENDER_OPTIONS = [
  { value: "Male", label: "Pria" },
  { value: "Female", label: "Wanita" },
  { value: "Other", label: "Lainnya" },
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
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
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
        phone: user.phone || "",
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
            text: 'Tetap Kembali',
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
    setTimeout(() => setMessage(""), 3000);
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
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {!!message && (
        <View style={styles.messageBanner}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
          {activeTab === "profile" && (
            <>
              <Pressable style={styles.avatarWrapper} onPress={pickAvatar}>
                {avatarUri || getAvatarUrl(currentAvatar) ? (
                  <Image source={{ uri: avatarUri || getAvatarUrl(currentAvatar) }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>Ubah Foto</Text>
                  </View>
                )}
              </Pressable>

              <Text style={styles.label}>Nama Lengkap</Text>
              <AppTextInput style={styles.input} value={profile.full_name} onChangeText={(v) => setProfile({ ...profile, full_name: v })} />

              <Text style={styles.label}>Username</Text>
              <AppTextInput style={styles.input} value={profile.username} onChangeText={(v) => setProfile({ ...profile, username: v })} autoCapitalize="none" />

              <Text style={styles.label}>No. Telepon</Text>
              <AppTextInput style={styles.input} value={profile.phone} onChangeText={(v) => setProfile({ ...profile, phone: v })} keyboardType="phone-pad" />

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
                  <Chip key={opt.value} label={opt.label} active={profile.gender === opt.value} onPress={() => setProfile({ ...profile, gender: opt.value })} />
                ))}
              </View>

              <Text style={styles.label}>Bio</Text>
              <AppTextInput style={[styles.input, { height: 80 }]} value={profile.bio} onChangeText={(v) => setProfile({ ...profile, bio: v })} multiline />

              <Pressable style={styles.saveButton} onPress={handleSaveProfile} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.saveButtonText}>Simpan Profil</Text>}
              </Pressable>
            </>
          )}

          {activeTab === "password" && (
            <>
              <Text style={styles.label}>Password Lama</Text>
              <PasswordInput value={oldPassword} onChangeText={setOldPassword} placeholder="Password lama" />

              <Text style={styles.label}>Password Baru</Text>
              <PasswordInput value={newPassword} onChangeText={setNewPassword} placeholder="Password baru" />

              <Text style={styles.label}>Konfirmasi Password Baru</Text>
              <PasswordInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Konfirmasi password baru" />

              <Pressable style={styles.saveButton} onPress={handleChangePassword} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.saveButtonText}>Ubah Password</Text>}
              </Pressable>
            </>
          )}

          {activeTab === "preference" && (
            <>
              <Text style={styles.label}>Preferensi Gender Parfum (pilih satu)</Text>
              <View style={styles.chipRow}>
                {PREF_GENDER_OPTIONS.map((opt) => (
                  <Chip key={opt.value} label={opt.label} active={profile.pref_gender === opt.value} onPress={() => setProfile({ ...profile, pref_gender: opt.value })} />
                ))}
              </View>

              <Text style={styles.label}>Aroma Favorit (boleh lebih dari satu)</Text>
              <View style={styles.chipRow}>
                {AROMA_OPTIONS.map((aroma) => (
                  <Chip key={aroma} label={aroma} active={isMultiValueActive("pref_aroma", aroma)} onPress={() => toggleMultiValue("pref_aroma", aroma)} />
                ))}
              </View>

              <Text style={styles.label}>Daya Tahan yang Disukai (boleh lebih dari satu)</Text>
              <View style={styles.chipRow}>
                {LONGEVITY_OPTIONS.map((opt) => (
                  <Chip key={opt.value} label={opt.label} active={isMultiValueActive("pref_longevity", opt.value)} onPress={() => toggleMultiValue("pref_longevity", opt.value)} />
                ))}
              </View>

              <Pressable style={styles.saveButton} onPress={handleSavePreference} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.saveButtonText}>Simpan Preferensi</Text>}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabButton: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  tabTextActive: { color: COLORS.primary },
  messageBanner: { backgroundColor: COLORS.surface, padding: 10, alignItems: "center" },
  messageText: { color: COLORS.text, fontSize: 12 },
  avatarWrapper: { alignSelf: "center", marginBottom: 20 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  label: { color: COLORS.textMuted, fontSize: 12, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 12 },
  chipTextActive: { color: COLORS.text, fontWeight: "600" },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24, marginBottom: 40 },
  saveButtonText: { color: COLORS.text, fontWeight: "600" },
});