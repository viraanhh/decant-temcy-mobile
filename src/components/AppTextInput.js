import { useState } from "react";
import { TextInput, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";

export default function AppTextInput({ style, ...props }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TextInput
      {...props}
      onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
      placeholderTextColor={COLORS.textFaint}
      // PENTING: `style` dari pemanggil ditaruh SEBELUM inputFocused,
      // supaya borderColor fokus tidak ketiban style default (borderColor: COLORS.border)
      // yang dikirim tiap screen lewat prop `style`.
      style={[styles.input, style, isFocused && styles.inputFocused]}
    />
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text },
  inputFocused: { borderColor: COLORS.primary },
});