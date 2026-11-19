import { useState, useCallback, useEffect } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Keyboard, Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getAdminInventory, updateProductStock } from "../../services/adminService";
import AppTextInput from "../../components/AppTextInput";

const SIZES = [1, 2, 3, 5, 10];
const LOW_STOCK_ML = 20; // sama dengan backend
const PAGE_LIMIT = 12;
const QUICK_ADD = [10, 50, 100];

const stockOf = (p) => Number(p.stock_ml) || 0;
const fmt = (n) => String(Math.round(n * 100) / 100);
const stockStatus = (ml) => {
  if (ml < 1) return { label: "Habis", color: "#FF4B4B" };
  if (ml <= LOW_STOCK_ML) return { label: "Menipis", color: "#f59e0b" };
  return { label: "Aman", color: "#3DBA6C" };
};

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
  const [updateModal, setUpdateModal] = useState(null); // { product, oldMl, newMl }
  const [errorDialog, setErrorDialog] = useState(null); // { title, message }

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
      .catch((err) =>
        setErrorDialog({ title: "Inventori gagal dimuat", message: err.message || "Periksa koneksi internet lalu coba lagi." })
      )
      .finally(() => setIsLoading(false));
  }, [page, debounced, filter]);

  useFocusEffect(load);

  const changeFilter = (key) => {
    setFilter(key);
    setPage(1);
  };

  const setEdit = (id, value) => {
    // Hanya membolehkan angka dan maksimal 1 titik desimal
    const clean = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setEdits((prev) => ({ ...prev, [id]: clean }));
  };

  const parsedEdit = (id) => {
    const raw = edits[id];
    if (raw === undefined || raw === "" || raw === ".") return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const hasChange = (p) => {
    const n = parsedEdit(p.product_id);
    return n !== null && n !== stockOf(p);
  };

  const confirmUpdate = (product) => {
    const newMl = parsedEdit(product.product_id);
    if (newMl === null) return;
    Keyboard.dismiss();
    setUpdateModal({ product, oldMl: stockOf(product), newMl });
  };

  const doUpdate = async () => {
    const { product, newMl } = updateModal;
    setUpdateModal(null);
    setSavingId(product.product_id);
    try {
      await updateProductStock(product.product_id, { stock_ml: newMl });
      setEdits((prev) => {
        const next = { ...prev };
        delete next[product.product_id];
        return next;
      });
      load(); // Refresh data dari server
    } catch (err) {
      setErrorDialog({ title: "Stok gagal tersimpan", message: err.message || "Periksa koneksi internet lalu coba lagi." });
    } finally {
      setSavingId(null);
    }
  };

  const renderItem = ({ item }) => {
    const ml = stockOf(item);
    const st = stockStatus(ml);
    const changed = hasChange(item);
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

        {/* INFO STOK ML & UKURAN TERSEDIA */}
        <View style={styles.stockRow}>
          <View>
            <Text style={styles.stockLabel}>Sisa stok</Text>
            <Text style={[styles.stockValue, { color: st.color }]}>{fmt(ml)} ml</Text>
          </View>
          <View style={styles.sizeChips}>
            {SIZES.map((s) => {
              const ok = ml >= s;
              return (
                <View key={s} style={[styles.sizeChip, ok ? styles.sizeChipOk : styles.sizeChipOff]}>
                  <Text style={[styles.sizeChipText, ok ? { color: "#3DBA6C" } : { color: COLORS.textFaint, textDecorationLine: "line-through" }]}>
                    {s}ml
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* INPUT STOK BARU & QUICK ADD */}
        <View>
          <Text style={styles.inputLabel}>Perbarui stok (ml)</Text>
          <View style={styles.inputRow}>
            <AppTextInput
              style={[styles.stockInput, edits[item.product_id] !== undefined && edits[item.product_id] !== "" && styles.stockInputChanged]}
              value={edits[item.product_id] ?? ""}
              onChangeText={(v) => setEdit(item.product_id, v)}
              placeholder={fmt(ml)}
              keyboardType="decimal-pad"
            />
            <Text style={styles.unit}>ml</Text>
          </View>

          <View style={styles.quickRow}>
            {QUICK_ADD.map((n) => (
              <Pressable 
                key={n} 
                style={styles.quickChip} 
                onPress={() => setEdit(item.product_id, String(Math.round((ml + n) * 100) / 100))}
              >
                <Text style={styles.quickText}>+{n} ml</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* TOMBOL UPDATE */}
        <Pressable
          style={[styles.updateButton, !changed && styles.updateButtonOff]}
          disabled={!changed || saving}
          onPress={() => confirmUpdate(item)}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <Text style={[styles.updateText, !changed && { color: COLORS.textMuted }]}>Simpan Perubahan</Text>
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
            
            {/* SUMMARY CARDS */}
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

            {/* SEARCH BOX */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <View style={{ flex: 1 }}>
                <AppTextInput 
                  style={styles.searchInput} 
                  value={search} 
                  onChangeText={setSearch} 
                  placeholder="Cari parfum atau brand..." 
                />
              </View>
              {!!search && (
                <Pressable onPress={() => setSearch("")} hitSlop={12}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                </Pressable>
              )}
            </View>

            {/* FILTER CHIPS */}
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
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>Tidak ada produk ditemukan.</Text> : null}
        ListFooterComponent={
          <Pagination
            page={page}
            totalPages={totalPages}
            disabled={isLoading}
            onChangePage={(p) => { if (p >= 1 && p <= totalPages && p !== page) setPage(p); }}
          />
        }
      />

      {/* UPDATE CONFIRMATION MODAL */}
      <Modal visible={!!updateModal} transparent animationType="fade" onRequestClose={() => setUpdateModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="flask-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.modalTitle}>Konfirmasi Stok</Text>
            {updateModal && (
              <>
                <Text style={styles.modalSubtitle}>{updateModal.product.brand} - {updateModal.product.product_name}</Text>
                <Text style={styles.modalLinesText}>{fmt(updateModal.oldMl)} ml  →  {fmt(updateModal.newMl)} ml</Text>
              </>
            )}
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setUpdateModal(null)}>
                <Text style={styles.modalButtonCancelText}>Batal</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalButtonConfirm]} onPress={doUpdate}>
                <Text style={styles.modalButtonConfirmText}>Ya, Perbarui</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ERROR MODAL */}
      <Modal visible={!!errorDialog} transparent animationType="fade" onRequestClose={() => setErrorDialog(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconContainer, { backgroundColor: "rgba(239,68,68,0.1)" }]}>
              <Ionicons name="alert-circle-outline" size={32} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>{errorDialog?.title}</Text>
            <Text style={styles.modalText}>{errorDialog?.message}</Text>
            <Pressable style={[styles.modalButton, styles.modalButtonConfirm, { width: "100%", flex: 0 }]} onPress={() => setErrorDialog(null)}>
              <Text style={styles.modalButtonConfirmText}>Tutup</Text>
            </Pressable>
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
  chipTextActive: { color: COLORS.onPrimary },
  count: { marginLeft: "auto", color: COLORS.textMuted, fontSize: 11 },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: 12, ...CARD_SHADOW },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  brand: { color: COLORS.primary, fontSize: 11, fontWeight: "700" },
  name: { color: COLORS.text, fontSize: 14, fontWeight: "700", marginTop: 2 },
  hpp: { color: COLORS.textMuted, fontSize: 10, marginTop: 3 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: RADIUS.full, paddingVertical: 4, paddingHorizontal: 10 },
  statusText: { fontSize: 11, fontWeight: "700" },

  stockRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stockLabel: { color: COLORS.textMuted, fontSize: 10 },
  stockValue: { fontSize: 22, fontWeight: "800" },
  sizeChips: { flexDirection: "row", gap: 6 },
  sizeChip: { borderRadius: 8, borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8 },
  sizeChipOk: { borderColor: "#3DBA6C50", backgroundColor: "#3DBA6C10" },
  sizeChipOff: { borderColor: COLORS.border, backgroundColor: COLORS.background },
  sizeChipText: { fontSize: 11, fontWeight: "700" },

  inputLabel: { color: COLORS.text, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingRight: 12 },
  stockInput: { flex: 1, backgroundColor: "transparent", borderWidth: 0, padding: 10, color: COLORS.text, fontSize: 14 },
  stockInputChanged: { color: COLORS.primary, fontWeight: "700" },
  unit: { color: COLORS.textMuted, fontWeight: "600" },
  quickRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  quickChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: COLORS.background },
  quickText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },

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
  pageButtonTextActive: { color: COLORS.onPrimary, fontWeight: "700" },
  pageEllipsis: { color: COLORS.textMuted, fontSize: 13, marginHorizontal: 2 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: SPACING.lg },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center", elevation: 8 },
  modalIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(59,130,246,0.1)", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  modalSubtitle: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", marginBottom: 12, fontWeight: "600" },
  modalLinesText: { color: COLORS.primary, fontSize: 18, textAlign: "center", marginBottom: 24, fontWeight: "800" },
  modalText: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalButtonCancel: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  modalButtonCancelText: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  modalButtonConfirm: { backgroundColor: COLORS.primary },
  modalButtonConfirmText: { color: COLORS.onPrimary, fontWeight: "600", fontSize: 14 },
});