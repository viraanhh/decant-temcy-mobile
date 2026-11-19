import { Linking } from "react-native";

export function buildWhatsAppUrl(number, message) {
  let digits = String(number || "").replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message || "")}`;
}

export async function openWhatsApp(number, message) {
  await Linking.openURL(buildWhatsAppUrl(number, message));
}

export async function openInstagram(username) {
  const cleanUsername = String(username || "").replace('@', '').trim();
  const url = cleanUsername.startsWith("http") ? cleanUsername : `https://instagram.com/${cleanUsername}`;
  await Linking.openURL(url);
}