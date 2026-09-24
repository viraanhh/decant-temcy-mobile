import { useState } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";

export default function PasswordInput({ value, onChangeText, placeholder, style }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.wrapper, isFocused && styles.wrapperFocused, style]}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textFaint}
        secureTextEntry={!isVisible}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      <Pressable onPress={() => setIsVisible((v) => !v)} style={styles.iconButton}>
        <Ionicons name={isVisible ? "eye-off-outline" : "eye-outline"} size={18} color={COLORS.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 },
  wrapperFocused: { borderColor: COLORS.primary },
  input: { flex: 1, padding: 12, color: COLORS.text },
  iconButton: { paddingHorizontal: 12 },
});