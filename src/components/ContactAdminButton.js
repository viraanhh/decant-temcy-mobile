import { useEffect, useState } from "react";
import { View, Pressable, Text, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useAuth } from "../context/AuthContext";
import { getPublicContacts } from "../services/adminService";
import { openWhatsApp, openInstagram } from "../utils/whatsapp";

export default function ContactAdminButton({ orderCode, label = "Tanya Admin", compact = false }) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState({ whatsapp: "", instagram: "" });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getPublicContacts()
      .then((res) => {
        if (alive && res) setContacts(res);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!contacts.whatsapp && !contacts.instagram) return null;

  const name = user?.full_name || user?.name || "pelanggan";
  const message = orderCode
    ? `Halo admin Decant Temcy, saya ${name}. Saya ingin bertanya tentang pesanan ${orderCode}.`
    : `Halo admin Decant Temcy, saya ${name}. Saya ingin bertanya sebelum menyelesaikan pesanan.`;

  const handleWa = async () => {
    try { await openWhatsApp(contacts.whatsapp, message); } 
    catch { setFailed(true); }
  };

  const handleIg = async () => {
    try { await openInstagram(contacts.instagram); } 
    catch { setFailed(true); }
  };

  return (
    <>
      <View style={styles.container}>
        {!!contacts.whatsapp && (
          <Pressable style={[styles.waBtn, compact && styles.btnCompact]} onPress={handleWa}>
            <Ionicons name="logo-whatsapp" size={compact ? 16 : 20} color="#25D366" />
            <Text style={[styles.waText, compact && styles.textCompact]}>{label}</Text>
          </Pressable>
        )}
        {!!contacts.instagram && (
          <Pressable style={[styles.igBtn, compact && styles.btnCompact]} onPress={handleIg}>
            <Ionicons name="logo-instagram" size={compact ? 16 : 20} color="#E1306C" />
            <Text style={[styles.igText, compact && styles.textCompact]}>Instagram</Text>
          </Pressable>
        )}
      </View>

      <Modal visible={failed} transparent animationType="fade" onRequestClose={() => setFailed(false)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.icon}>
              <Ionicons name="alert-circle-outline" size={32} color="#f59e0b" />
            </View>
            <Text style={styles.title}>Aplikasi tidak ditemukan</Text>
            <Text style={styles.message}>Pastikan aplikasi terpasang di perangkat ini.</Text>
            <Pressable style={styles.ok} onPress={() => setFailed(false)}>
              <Text style={styles.okText}>Mengerti</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", gap: 10, width: "100%" },
  waBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#25D36660", backgroundColor: "#25D36612", borderRadius: 10, padding: 14 },
  igBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#E1306C60", backgroundColor: "#E1306C12", borderRadius: 10, padding: 14, paddingHorizontal: 16 },
  btnCompact: { padding: 10, borderRadius: 8, gap: 6 },
  waText: { color: "#25D366", fontWeight: "700", fontSize: 14 },
  igText: { color: "#E1306C", fontWeight: "700", fontSize: 14 },
  textCompact: { fontSize: 12 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center" },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#f59e0b18", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  title: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  message: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: 20, lineHeight: 22 },
  ok: { width: "100%", paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: COLORS.primary },
  okText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});