import { useState, useCallback, useEffect } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert, Keyboard, Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getAdminInventory, updateProductStock } from "../../services/adminService";
import AppTextInput from "../../components/AppTextInput";

const SIZES = [1, 2, 3, 5];
const STOCK_MIN_TOTAL = 10;
const PAGE_LIMIT = 12;

const totalStock = (p) => SIZES.reduce((sum, s) => sum + (p[`stock_${s}ml`] || 0), 0);
const stockStatus = (p) => {
  const t = totalStock(p);
  if (t <= 0) return { label: "Habis", color: "#FF4B4B" };
  if (t <= STOCK_MIN_TOTAL) return { label: "Menipis", color: "#f59e0b" };
  return { label: "Aman", color: "#3DBA6C" };
};
const sizeColor = (n) => (n <= 0 ? "#FF4B4B" : n <= 3 ? "#f59e0b" : COLORS.text);

const SUMMARY = [
  { key: "habis", label: "Habis", color: "#FF4B4B", filter: "habis" },
  { key: "menipis", label: "Menipis", color: "#f59e0b", filter: "menipis" },
  { key: "aman", label: "Aman", color: "#3DBA6C", filter: "aman" },
];
const FILTERS = [
  { key: "semua", label: "Semua" },
  { key: "restock", label: "Perlu Restock" },
  { key: "aman", label: "Aman" },
];

function Pagination({ page, totalPages, onChangePage, disabled }) {
  if (totalPages <= 1) return null;
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pageNumbers = [];
  for (let p = start; p <= end; p++) pageNumbers.push(p);

  return (
    <View style={styles.pagination}>
      <Pressable style={[styles.pageArrow, (page <= 1 || disabled) && styles.pageButtonDisabled]} onPress={() => onChangePage(page - 1)} disabled={page <= 1 || disabled}>
        <Ionicons name="chevron-back" size={16} color={page <= 1 ? COLORS.textFaint : COLORS.text} />
      </Pressable>
      {start > 1 && (
        <>
          <Pressable style={styles.pageButton} onPress={() => onChangePage(1)} disabled={disabled}><Text style={styles.pageButtonText}>1</Text></Pressable>
          {start > 2 && <Text style={styles.pageEllipsis}>…</Text>}
        </>
      )}
      {pageNumbers.map((p) => (
        <Pressable key={p} style={[styles.pageButton, p === page && styles.pageButtonActive]} onPress={() => onChangePage(p)} disabled={disabled}>
          <Text style={[styles.pageButtonText, p === page && styles.pageButtonTextActive]}>{p}</Text>
        </Pressable>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <Text style={styles.pageEllipsis}>…</Text>}
          <Pressable style={styles.pageButton} onPress={() => onChangePage(totalPages)} disabled={disabled}><Text style={styles.pageButtonText}>{totalPages}</Text></Pressable>
        </>
      )}
      <Pressable style={[styles.pageArrow, (page >= totalPages || disabled) && styles.pageButtonDisabled]} onPress={() => onChangePage(page + 1)} disabled={page >= totalPages || disabled}>
        <Ionicons name="chevron-forward" size={16} color={page >= totalPages ? COLORS.textFaint : COLORS.text} />
      </Pressable>
    </View>
  );
}

export default function AdminInventoryScreen() {
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState({ habis: 0, menipis: 0, aman: 0 });
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("semua");
  const [isLoading, setIsLoading] = useState(true);
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setIsLoading(true);
    getAdminInventory({
      page,
      limit: PAGE_LIMIT,
      search: debounced || undefined,
      stock: filter === "semua" ? undefined : filter,
    })
      .then((res) => {
        setProducts(res.products || []);
        setSummary(res.summary || { habis: 0, menipis: 0, aman: 0 });
        setTotalPages(res.totalPages || 1);
        setTotal(res.total || 0);
      })
      .catch((err) => Alert.alert("Error", err.message || "Gagal memuat inventori"))
      .finally(() => setIsLoading(false));
  }, [page, debounced, filter]);

  useFocusEffect(load);

  const changeFilter = (key) => {
    setFilter(key);
    setPage(1);
  };

  const setEdit = (id, size, value) => {
    const clean = value.replace(/[^0-9]/g, "");
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [size]: clean } }));
  };

  const hasChange = (id) => SIZES.some((s) => (edits[id]?.[s] ?? "") !== "");

  const confirmUpdate = (product) => {
    const edit = edits[product.product_id] || {};
    const lines = SIZES.filter((s) => (edit[s] ?? "") !== "").map((s) => `${s}ml → ${edit[s]} pcs`).join("\n");
    Keyboard.dismiss();
    setModalData({ product, edit, lines });
    setShowUpdateModal(true);
  };

  const doUpdate = async () => {
    const { product, edit } = modalData;
    setShowUpdateModal(false);
    
    const payload = {};
    SIZES.forEach((s) => {
      if ((edit[s] ?? "") !== "") payload[`stock_${s}ml`] = parseInt(edit[s], 10);
    });
    setSavingId(product.product_id);
    try {
      const res = await updateProductStock(product.product_id, payload);
      setProducts((prev) => prev.map((p) => (p.product_id === product.product_id ? { ...p, ...res.product } : p)));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[product.product_id];
        return next;
      });
      load(); 
    } catch (err) {
      Alert.alert("Error", err.message || "Gagal update stok");
    } finally {
      setSavingId(null);
      setModalData(null);
    }
  };

  const handleChangePage = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === page || isLoading) return;
    setPage(newPage);
  };

  const renderItem = ({ item }) => {
    const st = stockStatus(item);
    const edit = edits[item.product_id] || {};
    const changed = hasChange(item.product_id);
    const saving = savingId === item.product_id;
    return (
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>{item.brand}</Text>
            <Text style={styles.name} numberOfLines={2}>{item.product_name}</Text>
            {!!item.cost_price_per_ml && <Text style={styles.hpp}>HPP Rp {item.cost_price_per_ml.toLocaleString("id-ID")}/ml</Text>}
          </View>
          <View style={[styles.statusPill, { backgroundColor: `${st.color}18` }]}>
            <View style={[styles.statusDot, { backgroundColor: st.color }]} />
            <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>

        <View style={styles.sizeRow}>
          {SIZES.map((s) => {
            const cur = item[`stock_${s}ml`] || 0;
            const changedField = (edit[s] ?? "") !== "";
            return (
              <View key={s} style={styles.sizeCol}>
                <Text style={styles.sizeLabel}>{s}ml</Text>
                <Text style={[styles.sizeStock, { color: sizeColor(cur) }]}>{cur}</Text>
                <AppTextInput
                  style={[styles.sizeInput, changedField && styles.sizeInputChanged]}
                  value={edit[s] ?? ""}
                  onChangeText={(v) => setEdit(item.product_id, s, v)}
                  placeholder="baru"
                  keyboardType="number-pad"
                />
              </View>
            );
          })}
        </View>

        <Pressable
          style={[styles.updateButton, !changed && styles.updateButtonOff]}
          disabled={!changed || saving}
          onPress={() => confirmUpdate(item)}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <Text style={[styles.updateText, !changed && { color: COLORS.textMuted }]}>Perbarui Stok</Text>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={isLoading ? [] : products}
        keyExtractor={(item) => String(item.product_id)}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ gap: SPACING.md }}>
            <View style={styles.summaryRow}>
              {SUMMARY.map((s) => {
                const active = filter === s.filter;
                return (
                  <Pressable
                    key={s.key}
                    style={[styles.summaryCard, active && { borderColor: s.color }]}
                    onPress={() => changeFilter(active ? "semua" : s.filter)}
                  >
                    <View style={[styles.statusDot, { backgroundColor: s.color }]} />
                    <Text style={[styles.summaryValue, active && { color: s.color }]}>{summary[s.key]}</Text>
                    <Text style={styles.summaryLabel}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <View style={{ flex: 1 }}>
                <AppTextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Cari produk atau brand..." />
              </View>
              {!!search && (
                <Pressable onPress={() => setSearch("")} hitSlop={12}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                </Pressable>
              )}
            </View>

            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <Pressable key={f.key} style={[styles.chip, filter === f.key && styles.chipActive]} onPress={() => changeFilter(f.key)}>
                  <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
                </Pressable>
              ))}
              <Text style={styles.count}>{total} produk</Text>
            </View>

            {isLoading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}
          </View>
        }
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>Tidak ada produk.</Text> : null}
        ListFooterComponent={<Pagination page={page} totalPages={totalPages} onChangePage={handleChangePage} disabled={isLoading} />}
      />

      <Modal visible={showUpdateModal} transparent animationType="fade" onRequestClose={() => setShowUpdateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="layers-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.modalTitle}>Perbarui Stok?</Text>
            {modalData && (
              <>
                <Text style={styles.modalSubtitle}>{modalData.product.brand} - {modalData.product.product_name}</Text>
                <Text style={styles.modalLinesText}>{modalData.lines}</Text>
              </>
            )}
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowUpdateModal(false)}>
                <Text style={styles.modalButtonCancelText}>Batal</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalButtonConfirm]} onPress={doUpdate}>
                <Text style={styles.modalButtonConfirmText}>Ya, Perbarui</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  summaryRow: { flexDirection: "row", gap: SPACING.sm },
  summaryCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, gap: 4, ...CARD_SHADOW },
  summaryValue: { color: COLORS.text, fontSize: 24, fontWeight: "800" },
  summaryLabel: { color: COLORS.textMuted, fontSize: 11 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14 },
  searchInput: { backgroundColor: "transparent", borderWidth: 0, padding: 10, color: COLORS.text, fontSize: 13 },
  filterRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingVertical: 6, paddingHorizontal: 14 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: COLORS.text },
  count: { marginLeft: "auto", color: COLORS.textMuted, fontSize: 11 },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: 12, ...CARD_SHADOW },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  brand: { color: COLORS.primary, fontSize: 11, fontWeight: "700" },
  name: { color: COLORS.text, fontSize: 14, fontWeight: "700", marginTop: 2 },
  hpp: { color: COLORS.textMuted, fontSize: 10, marginTop: 3 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: RADIUS.full, paddingVertical: 4, paddingHorizontal: 10 },
  statusText: { fontSize: 11, fontWeight: "700" },

  sizeRow: { flexDirection: "row", gap: 8 },
  sizeCol: { flex: 1, alignItems: "center", gap: 4 },
  sizeLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: "700" },
  sizeStock: { fontSize: 18, fontWeight: "800" },
  sizeInput: { width: "100%", textAlign: "center", backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 4, color: COLORS.text, fontSize: 13 },
  sizeInputChanged: { borderColor: COLORS.primary },

  updateButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 12, alignItems: "center" },
  updateButtonOff: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  updateText: { color: COLORS.text, fontWeight: "700", fontSize: 13 },

  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center", marginTop: 20 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: SPACING.sm, marginBottom: SPACING.lg },
  pageArrow: { width: 32, height: 32, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  pageButton: { minWidth: 32, height: 32, paddingHorizontal: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  pageButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pageButtonDisabled: { opacity: 0.4 },
  pageButtonText: { color: COLORS.text, fontSize: 13, fontWeight: "500" },
  pageButtonTextActive: { color: COLORS.text, fontWeight: "700" },
  pageEllipsis: { color: COLORS.textMuted, fontSize: 13, marginHorizontal: 2 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: SPACING.lg },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  modalIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(59, 130, 246, 0.1)", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  modalSubtitle: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", marginBottom: 12, fontWeight: "600" },
  modalLinesText: { color: COLORS.text, fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 22, fontWeight: "800" },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalButtonCancel: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  modalButtonCancelText: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  modalButtonConfirm: { backgroundColor: COLORS.primary },
  modalButtonConfirmText: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
});