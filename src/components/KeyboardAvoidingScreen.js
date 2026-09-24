import { View, ScrollView, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import useKeyboardHeight from "../hooks/useKeyboardHeight";

// FIX: dulu pakai KeyboardAvoidingView dengan behavior "undefined" di
// Android (mengandalkan native windowSoftInputMode yang TIDAK aktif di
// Expo Go — Expo Go tidak rebuild AndroidManifest.xml per project).
// Sekarang pakai useKeyboardHeight (murni JS lewat Keyboard event
// listener), reliable di Expo Go maupun build native nanti.
export default function KeyboardAvoidingScreen({ children, contentContainerStyle, style }) {
  const keyboardHeight = useKeyboardHeight();

  return (
    <View style={[styles.flex, style]}>
      <ScrollView
        keyboardDismissMode="on-drag"
        style={styles.flex}
        contentContainerStyle={[
          styles.contentContainer,
          contentContainerStyle,
          { paddingBottom: keyboardHeight },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  contentContainer: { flexGrow: 1 },
});