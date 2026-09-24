import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS } from "../constants/colors";
import { submitReview } from "../services/reviewService";
import AppTextInput from "../components/AppTextInput";

export default function WriteReviewScreen({ route, navigation }) {
  const { orderItemId, productId, productName } = route.params;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      alert("Tulis ulasan singkat dulu ya");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitReview({ orderItemId, productId, rating, comment });
      navigation.goBack();
    } catch (err) {
      alert("Gagal mengirim ulasan, coba lagi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.productName}>{productName}</Text>

      <Text style={styles.label}>Beri Rating</Text>
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => setRating(star)}>
            <Text style={[styles.star, star <= rating && styles.starActive]}>★</Text>
          </Pressable>
        ))}
      </View>

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
        {isSubmitting ? (
          <ActivityIndicator color={COLORS.text} />
        ) : (
          <Text style={styles.submitButtonText}>Kirim Ulasan</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  productName: { color: COLORS.text, fontSize: 15, fontWeight: "600", marginBottom: 20 },
  label: { color: COLORS.textMuted, fontSize: 12, marginBottom: 8 },
  starRow: { flexDirection: "row", gap: 6, marginBottom: 20 },
  star: { fontSize: 32, color: COLORS.border },
  starActive: { color: COLORS.warning },
  textArea: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, padding: 12, color: COLORS.text, textAlignVertical: "top", minHeight: 100,
  },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24 },
  submitButtonText: { color: COLORS.text, fontWeight: "600" },
});