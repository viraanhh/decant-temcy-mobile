import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable, Modal, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getAdminReviews } from "../../services/adminService";
import AppTextInput from "../../components/AppTextInput";

const FETCH_LIMIT = 200;

const formatDateInput = (text) => {
  const cleaned = text.replace(/[^0-9]/g, "");
  let formatted = cleaned;
  if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  if (cleaned.length > 4) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  return formatted;
};

const TIME_FILTERS = [
  { value: "all", label: "Semua Waktu" },
  { value: "today", label: "Hari Ini" },
  { value: "week", label: "7 Hari Terakhir" },
  { value: "month", label: "Bulan Ini" },
  { value: "custom", label: "Rentang Tanggal Custom" },
];

export default function AdminReviewListScreen() {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [isTimeModalVisible, setTimeModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      getAdminReviews({ page: 1, limit: FETCH_LIMIT })
        .then((res) => setReviews(res.reviews))
        .finally(() => setIsLoading(false));
    }, [])
  );

  const clearSearch = () => {
    setSearchQuery("");
    Keyboard.dismiss();
  };

  const filteredReviews = reviews.filter((review) => {
    const brand = (review.product?.brand || "").toLowerCase();
    const productName = (review.product?.product_name || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = brand.includes(q) || productName.includes(q);

    if (!matchesSearch) return false;

    const reviewDateStr = review.createdAt || review.created_at;
    if (!reviewDateStr) return timeFilter === "all";
    const reviewDate = new Date(reviewDateStr);
    const now = new Date();

    if (timeFilter === "all") return true;
    if (timeFilter === "today") return reviewDate.toDateString() === now.toDateString();
    if (timeFilter === "week") return (now - reviewDate) / (1000 * 60 * 60 * 24) <= 7;
    if (timeFilter === "month") return reviewDate.getMonth() === now.getMonth() && reviewDate.getFullYear() === now.getFullYear();
    if (timeFilter === "custom") {
      if (customStart.length !== 10 || customEnd.length !== 10) return true;
      const [sDay, sMonth, sYear] = customStart.split("/");
      const [eDay, eMonth, eYear] = customEnd.split("/");
      const start = new Date(`${sYear}-${sMonth}-${sDay}T00:00:00`);
      const end = new Date(`${eYear}-${eMonth}-${eDay}T23:59:59`);
      return reviewDate >= start && reviewDate <= end;
    }

    return true;
  });

  const activeTimeLabel =
    timeFilter === "custom" && customStart && customEnd
      ? `${customStart} s/d ${customEnd}`
      : TIME_FILTERS.find((t) => t.value === timeFilter)?.label || "Waktu";

  return (
    <View style={styles.container}> 
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Review</Text>
          <Text style={styles.subtitle}>{filteredReviews.length} ulasan</Text>
        </View>
        <Pressable style={styles.timeFilterButton} onPress={() => setTimeModalVisible(true)}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.text} />
          <Text style={styles.timeFilterButtonText} numberOfLines={1}>{activeTimeLabel}</Text>
          <Ionicons name="chevron-down" size={12} color={COLORS.textMuted} />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <View style={{ flex: 1 }}>
          <AppTextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari brand atau produk..."
          />
        </View>
        {searchQuery ? (
          <Pressable onPress={clearSearch} style={styles.clearButton} hitSlop={15}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredReviews}
          keyExtractor={(item, index) => String(item.review_id || index)}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.sm, paddingTop: SPACING.sm }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchQuery || timeFilter !== "all" 
                ? "Review tidak ditemukan." 
                : "Belum ada ulasan."}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.reviewer}>{item.user?.full_name || "Pengguna"}</Text>
                <Text style={styles.stars}>{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</Text>
              </View>
              <Text style={styles.productName}>{item.product?.brand} · {item.product?.product_name}</Text>
              <Text style={styles.comment}>{item.comment}</Text>
              <Text style={styles.date}>{new Date(item.createdAt || item.created_at).toLocaleDateString("id-ID")}</Text>
            </View>
          )}
        />
      )}

      <Modal visible={isTimeModalVisible} animationType="fade" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setTimeModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Filter Berdasarkan Waktu</Text>
            {TIME_FILTERS.map((opt) => (
              <Pressable key={opt.value} style={styles.timeOptionRow} onPress={() => setTimeFilter(opt.value)}>
                <Text style={[styles.timeOptionText, timeFilter === opt.value && styles.timeOptionTextActive]}>
                  {opt.label}
                </Text>
                {timeFilter === opt.value && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
              </Pressable>
            ))}

            {timeFilter === "custom" && (
              <View style={{ marginTop: SPACING.sm, gap: 8 }}>
                <Text style={styles.modalLabel}>Dari Tanggal (DD/MM/YYYY)</Text>
                <AppTextInput 
                  style={styles.dateInput} 
                  value={customStart} 
                  onChangeText={(text) => setCustomStart(formatDateInput(text))} 
                  placeholder="01/09/2026" 
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <Text style={styles.modalLabel}>Sampai Tanggal (DD/MM/YYYY)</Text>
                <AppTextInput 
                  style={styles.dateInput} 
                  value={customEnd} 
                  onChangeText={(text) => setCustomEnd(formatDateInput(text))} 
                  placeholder="30/09/2026" 
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
            )}

            <Pressable style={styles.applyButton} onPress={() => setTimeModalVisible(false)}>
              <Text style={styles.applyButtonText}>Terapkan</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: SPACING.lg, paddingBottom: SPACING.sm },
  title: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
  subtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  
  timeFilterButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingVertical: 8, paddingHorizontal: 12, maxWidth: 160 },
  timeFilterButtonText: { color: COLORS.text, fontSize: 11, fontWeight: "600" },
  
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14 },
  searchInput: { backgroundColor: "transparent", borderWidth: 0, padding: 10, color: COLORS.text },
  clearButton: { padding: 4 },
  
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center", marginTop: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, ...CARD_SHADOW },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewer: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  stars: { color: COLORS.warning, fontSize: 12 },
  productName: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  comment: { color: COLORS.text, fontSize: 13, marginTop: 6, lineHeight: 18 },
  date: { color: COLORS.textFaint, fontSize: 10, marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: SPACING.xl },
  modalContent: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.lg, ...CARD_SHADOW },
  modalTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginBottom: SPACING.sm },
  modalLabel: { color: COLORS.textMuted, fontSize: 11 },
  dateInput: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, color: COLORS.text },
  timeOptionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  timeOptionText: { color: COLORS.text, fontSize: 14 },
  timeOptionTextActive: { color: COLORS.primary, fontWeight: "700" },
  applyButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14, alignItems: "center", marginTop: SPACING.md },
  applyButtonText: { color: COLORS.text, fontWeight: "600" },
});