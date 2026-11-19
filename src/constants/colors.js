import { Appearance } from "react-native";
import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "themeMode";
const VALID = ["system", "light", "dark"];

const DARK = {
  background: "#06060a",
  surface: "#111118",
  surfaceLight: "#16161f",
  surfaceInput: "#13131a",
  border: "#1e1e2e",
  borderHover: "#2e2e42",
  primary: "#F02E29",
  primaryHover: "#e11d18",
  primaryLight: "rgba(240, 46, 41, 0.1)",
  primaryDark: "#A2120E",
  primaryDark2: "#830E0B",
  text: "#f0ede8",
  textMuted: "#9994a0",
  textFaint: "#5a5565",
  success: "#2e7d32",
  warning: "#b8860b",
  onPrimary: "#FFFFFF",
};

const LIGHT = {
  background: "#f6f5f3",
  surface: "#ffffff",
  surfaceLight: "#efede9",
  surfaceInput: "#f3f1ee",
  border: "#e3e0dc",
  borderHover: "#cfcac4",
  primary: "#D4231E", // sedikit lebih gelap agar teks merah terbaca di latar terang
  primaryHover: "#bd1c18",
  primaryLight: "rgba(212, 35, 30, 0.1)",
  primaryDark: "#A2120E",
  primaryDark2: "#830E0B",
  text: "#1a1820",
  textMuted: "#5f5a66",
  textFaint: "#7a7582",
  success: "#2e7d32",
  warning: "#946a00",
  onPrimary: "#FFFFFF",
};

function readPreference() {
  try {
    const v = SecureStore.getItem(STORAGE_KEY);
    return VALID.includes(v) ? v : "dark";
  } catch {
    return "dark";
  }
}

function readSystemScheme() {
  try {
    return Appearance.getColorScheme();
  } catch {
    return null;
  }
}

// Dibaca sekali saat aplikasi dimuat
export const themePreference = readPreference(); // "system" | "light" | "dark"
export const isDark =
  themePreference === "system" ? readSystemScheme() !== "light" : themePreference === "dark";
export const COLORS = isDark ? DARK : LIGHT;

// Simpan pilihan. Berlaku setelah aplikasi dimuat ulang.
export function setThemePreference(mode) {
  if (!VALID.includes(mode)) return false;
  try {
    SecureStore.setItem(STORAGE_KEY, mode);
    return true;
  } catch {
    return false;
  }
}