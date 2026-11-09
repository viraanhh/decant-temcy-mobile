import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { SPACING } from "../constants/theme";
import { submitReview } from "../services/reviewService";
import AppTextInput from "../components/AppTextInput";

const RATING_LABEL = { 1: "Sangat buruk", 2: "Kurang", 3: "Cukup", 4: "Bagus", 5: "Sangat bagus" };
const TONES = {
  success: { color: "#3DBA6C", icon: "checkmark-circle-outline" },
  warning: { color: "#f59e0b", icon: "alert-circle-outline" },
};

export default function WriteReviewScreen({ route, navigation }) {
  const { productId, productName } = route.params;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialog, setDialog] = useState({ visible: false, tone: "warning", title: "", message: "", onClose: null });

  const showDialog = (tone, title, message, onClose = null) =>
    setDialog({ visible: true, tone, title, message, onClose });

  const closeDialog = () => {
    const cb = dialog.onClose;
    setDialog((d) => ({ ...d, visible: false }));
    if (cb) cb();
  };

  const handleSubmit = async () => {
    if (!comment.trim()) {
      showDialog("warning", "Ulasan masih kosong", "Tulis ulasan singkat dulu ya sebelum mengirim.");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitReview({ productId, rating, comment: comment.trim() });
      showDialog("success", "Terima kasih!", "Ulasanmu sudah terkirim.", () => navigation.goBack());
    } catch (err) {
      showDialog("warning", "Ulasan belum terkirim", err?.message || "Periksa koneksi internet lalu coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tone = TONES[dialog.tone] || TONES.warning;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.productName}>{productName}</Text>

        <Text style={styles.label}>Beri Rating</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => setRating(star)} hitSlop={6}>
              <Ionicons name={star <= rating ? "star" : "star-outline"} size={34} color={star <= rating ? COLORS.warning : COLORS.border} />
            </Pressable>
          ))}
        </View>
        <Text style={styles.ratingLabel}>{RATING_LABEL[rating]}</Text>

        <Text style={styles.label}>Ulasan Anda</Text>
        <AppTextInput
          style={styles.textArea}
          value={comment}
          onChangeText={setComment}
          placeholder="Bagaimana pengalaman Anda dengan produk ini?"
          multiline
          numberOfLines={5}
        />

        <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.submitButtonText}>Kirim Ulasan</Text>}
        </Pressable>
      </ScrollView>

      <Modal visible={dialog.visible} transparent animationType="fade" onRequestClose={closeDialog}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: `${tone.color}18` }]}>
              <Ionicons name={tone.icon} size={32} color={tone.color} />
            </View>
            <Text style={styles.dialogTitle}>{dialog.title}</Text>
            <Text style={styles.dialogText}>{dialog.message}</Text>
            <Pressable style={[styles.dialogButton, { backgroundColor: tone.color }]} onPress={closeDialog}>
              <Text style={styles.dialogButtonText}>{dialog.tone === "success" ? "Oke" : "Mengerti"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  productName: { color: COLORS.text, fontSize: 15, fontWeight: "600", marginBottom: 20 },
  label: { color: COLORS.textMuted, fontSize: 12, marginBottom: 8 },
  starRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  ratingLabel: { color: COLORS.warning, fontSize: 12, fontWeight: "600", marginBottom: 20 },
  textArea: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, padding: 12, color: COLORS.text, textAlignVertical: "top", minHeight: 100,
  },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24 },
  submitButtonText: { color: COLORS.text, fontWeight: "600" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: SPACING.lg },
  card: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center", elevation: 8 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  dialogTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  dialogText: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  dialogButton: { width: "100%", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  dialogButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});