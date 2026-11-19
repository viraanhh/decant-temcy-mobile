import { DevSettings } from "react-native";

// true = aplikasi dimuat ulang otomatis (mode dev).
// false = build produksi: pengguna diminta menutup dan membuka aplikasi lagi.
export function reloadApp() {
  if (__DEV__ && DevSettings && typeof DevSettings.reload === "function") {
    setTimeout(() => DevSettings.reload(), 250);
    return true;
  }
  return false;
}