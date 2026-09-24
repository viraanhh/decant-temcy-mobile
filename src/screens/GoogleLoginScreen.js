import { useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { COLORS } from "../constants/colors";
import { SERVER_BASE_URL } from "../constants/api";
import { useAuth } from "../context/AuthContext";

export default function GoogleLoginScreen({ navigation }) {
  const { loginWithGoogleToken } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNavigationChange = async (navState) => {
    const { url } = navState;
    if (isProcessing) return;

    // Backend redirect akhir: {CLIENT_URL}/auth/google/callback?token=xxx
    if (url.includes("/auth/google/callback")) {
      const tokenMatch = url.match(/[?&]token=([^&]+)/);
      if (tokenMatch) {
        setIsProcessing(true);
        try {
          // FIX: dulu ada baris nyasar `login(email, password)` copy-paste
          // dari LoginScreen.js — email/password tidak pernah ada di file
          // ini, dan `login` juga tidak di-destructure dari useAuth().
          // Yang benar: pakai hasil return loginWithGoogleToken langsung.
          const loggedInUser = await loginWithGoogleToken(decodeURIComponent(tokenMatch[1]));
          navigation.replace(loggedInUser?.role === "admin" ? "AdminTabs" : "MainTabs");
        } catch (err) {
          navigation.goBack();
        }
      }
    }
    // Login gagal/dibatalkan -> backend redirect ke /login?error=google
    if (url.includes("error=google")) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: `${SERVER_BASE_URL}/api/auth/google` }}
        style={{ flex: 1 }}
        onNavigationStateChange={handleNavigationChange}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        )}
      />
      {isProcessing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" },
});