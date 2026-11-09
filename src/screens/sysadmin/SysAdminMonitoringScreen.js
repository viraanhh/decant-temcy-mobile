import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { getSystemStatus, getSystemLogs } from "../../services/adminService";

const SERVICES = [
  { key: "database", label: "Database", icon: "server-outline" },
  { key: "smtp", label: "Email (SMTP)", icon: "mail-outline" },
  { key: "ai_service", label: "AI Engine", icon: "hardware-chip-outline" },
];

const LEVELS = [
  { value: "", label: "SEMUA", icon: "list-outline" },
  { value: "info", label: "INFO", icon: "information-circle-outline" },
  { value: "warning", label: "WARNING", icon: "warning-outline" },
  { value: "error", label: "ERROR", icon: "alert-circle-outline" }
];

const LEVEL_COLOR = { info: "#3B82F6", warning: "#F59E0B", error: "#EF4444" };
const LEVEL_BG = { info: "rgba(59, 130, 246, 0.12)", warning: "rgba(245, 158, 11, 0.12)", error: "rgba(239, 68, 68, 0.12)" };

const statusColor = (s) => (s === "online" ? "#10B981" : s === "offline" ? "#EF4444" : "#F59E0B");
const statusBg = (s) => (s === "online" ? "rgba(16, 185, 129, 0.1)" : s === "offline" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)");

export default function SysAdminMonitoringScreen() {
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [level, setLevel] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = () => {
    setStatusLoading(true);
    setStatusError("");
    return getSystemStatus()
      .then(setStatus)
      .catch((e) => setStatusError(e.message || "Gagal terhubung ke server pemantauan"))
      .finally(() => setStatusLoading(false));
  };

  const loadLogs = (p, lv) => {
    setLogsLoading(true);
    return getSystemLogs({ page: p, limit: 10, level: lv || undefined })
      .then((res) => {
        setLogs(res.logs);
        setTotalPages(res.totalPages || 1);
      })
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false));
  };

  useFocusEffect(useCallback(() => { loadStatus(); }, []));
  useFocusEffect(useCallback(() => { loadLogs(page, level); }, [page, level]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStatus(), loadLogs(page, level)]);
    setRefreshing(false);
  };

  const server = status?.status?.server;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Ionicons name="pulse" size={14} color="#10B981" />
          <Text style={styles.headerBadgeText}>SYSTEM HEALTH</Text>
        </View>
        <Text style={styles.title}>Monitoring Server</Text>
        <Text style={styles.subtitle}>Pantau kesehatan dan log aktivitas backend secara real-time.</Text>
      </View>

      {statusLoading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Memeriksa status layanan...</Text>
        </View>
      ) : statusError ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
          <Text style={styles.errorText}>{statusError}</Text>
          <Pressable style={styles.retryButton} onPress={loadStatus}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : status ? (
        <>
          {/* LAYANAN UTAMA (SERVICES) */}
          <View>
            <Text style={styles.sectionTitle}>Status Layanan Core</Text>
            <View style={styles.serviceRow}>
              {SERVICES.map((s) => {
                const st = status.status?.[s.key]?.status;
                const activeColor = statusColor(st);
                return (
                  <View key={s.key} style={styles.serviceCard}>
                    <View style={[styles.iconBox, { backgroundColor: statusBg(st) }]}>
                      <Ionicons name={s.icon} size={24} color={activeColor} />
                    </View>
                    <Text style={styles.serviceLabel}>{s.label}</Text>
                    
                    <View style={[styles.statusBadge, { borderColor: activeColor, backgroundColor: statusBg(st) }]}>
                      <View style={[styles.statusDot, { backgroundColor: activeColor }]} />
                      <Text style={[styles.serviceStatus, { color: activeColor }]}>
                        {(st || "unknown").toUpperCase()}
                      </Text>
                    </View>
                    
                    {!!status.status?.[s.key]?.latency && (
                      <Text style={styles.latency}>{status.status[s.key].latency}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* INFORMASI LINGKUNGAN SERVER */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="hardware-chip-outline" size={18} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Spesifikasi Lingkungan</Text>
            </View>
            
            <View style={styles.infoGrid}>
              {[
                { k: "Sistem Operasi", v: server?.platform, i: "laptop-outline" },
                { k: "Runtime Node", v: server?.node_version, i: "logo-nodejs" },
                { k: "Memori Aktif", v: server?.memory, i: "save-outline" },
                { k: "Waktu Uptime", v: server?.uptime, i: "time-outline" },
                { k: "User Aktif Hari Ini", v: `${status.stats?.active_users_today ?? 0} Pengguna`, i: "people-outline" },
                { k: "Total Pelanggan Terdaftar", v: `${status.stats?.total_users ?? 0} Akun`, i: "person-add-outline" },
              ].map((item, idx) => (
                <View key={idx} style={[styles.infoRow, idx !== 5 && styles.infoBorderBottom]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name={item.i} size={16} color={COLORS.textMuted} />
                    <Text style={styles.infoKey}>{item.k}</Text>
                  </View>
                  <Text style={styles.infoValue}>{item.v || "—"}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}

      {/* LOG AKTIVITAS (LOGS) */}
      <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
        <View style={[styles.cardHeader, { padding: SPACING.md, paddingBottom: 0 }]}>
          <Ionicons name="terminal-outline" size={18} color={COLORS.text} />
          <Text style={styles.cardTitle}>Console Log Sistem</Text>
        </View>

        {/* FILTER CHIPS */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: 8 }}
        >
          {LEVELS.map((lv) => {
            const isActive = level === lv.value;
            const activeColor = lv.value ? LEVEL_COLOR[lv.value] : COLORS.primary;
            return (
              <Pressable
                key={lv.value || "all"}
                style={[
                  styles.chip, 
                  isActive && { backgroundColor: `${activeColor}15`, borderColor: activeColor }
                ]}
                onPress={() => { setLevel(lv.value); setPage(1); }}
              >
                <Ionicons name={lv.icon} size={14} color={isActive ? activeColor : COLORS.textMuted} />
                <Text style={[styles.chipText, isActive && { color: activeColor, fontWeight: "750" }]}>
                  {lv.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.logDivider} />

        {/* LOG LIST */}
        <View style={{ padding: SPACING.md, paddingTop: SPACING.sm }}>
          {logsLoading && !refreshing ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
          ) : logs.length === 0 ? (
            <View style={styles.emptyLogBox}>
              <Ionicons name="document-text-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Tidak ada catatan log ditemukan.</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {logs.map((log) => {
                const color = LEVEL_COLOR[log.level] || "#3B82F6";
                const bgColor = LEVEL_BG[log.level] || "rgba(59, 130, 246, 0.12)";
                
                return (
                  <View key={log.log_id} style={[styles.logItem, { borderColor: `${color}40` }]}>
                    <View style={[styles.logIconBox, { backgroundColor: bgColor }]}>
                      <Ionicons 
                        name={log.level === 'error' ? "warning" : log.level === 'warning' ? "alert-circle" : "information-circle"} 
                        size={16} 
                        color={color} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logMessage}>{log.message}</Text>
                      <View style={styles.logMetaRow}>
                        <Text style={[styles.logLevelText, { color }]}>{log.level.toUpperCase()}</Text>
                        <Text style={styles.logMetaDot}>•</Text>
                        <Text style={styles.logMetaText}>
                          {log.source ? `[${log.source}] ` : ""}
                          {new Date(log.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <View style={styles.pager}>
              <Pressable 
                style={({ pressed }) => [styles.pagerButton, page === 1 && styles.pagerButtonDisabled, pressed && page > 1 && { opacity: 0.7 }]} 
                disabled={page === 1} 
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              >
                <Ionicons name="chevron-back" size={16} color={page === 1 ? COLORS.textFaint : COLORS.text} />
                <Text style={[styles.pagerText, page === 1 && { color: COLORS.textFaint }]}>Prev</Text>
              </Pressable>
              
              <View style={styles.pagerBadge}>
                <Text style={styles.pagerInfo}>{page} dari {totalPages}</Text>
              </View>
              
              <Pressable 
                style={({ pressed }) => [styles.pagerButton, page === totalPages && styles.pagerButtonDisabled, pressed && page < totalPages && { opacity: 0.7 }]} 
                disabled={page === totalPages} 
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <Text style={[styles.pagerText, page === totalPages && { color: COLORS.textFaint }]}>Next</Text>
                <Ionicons name="chevron-forward" size={16} color={page === totalPages ? COLORS.textFaint : COLORS.text} />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  header: { marginBottom: SPACING.xs },
  headerBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(16, 185, 129, 0.1)", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, marginBottom: 8 },
  headerBadgeText: { color: "#10B981", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: "800", marginBottom: 2 },
  subtitle: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  
  loadingBox: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 12 },
  loadingText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  
  errorBox: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(239, 68, 68, 0.05)", padding: SPACING.xl, borderRadius: RADIUS.md, borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.2)" },
  errorText: { color: "#EF4444", fontSize: 14, fontWeight: "600", textAlign: "center", marginTop: 8, marginBottom: 16 },
  retryButton: { backgroundColor: "#EF4444", paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.sm },
  retryButtonText: { color: COLORS.surface, fontWeight: "700", fontSize: 13 },
  
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: "800", marginBottom: 12 },
  
  serviceRow: { flexDirection: "row", gap: SPACING.sm },
  serviceCard: { flex: 1, alignItems: "center", backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, ...CARD_SHADOW },
  iconBox: { width: 44, height: 44, borderRadius: RADIUS.full, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  serviceLabel: { color: COLORS.text, fontSize: 12, fontWeight: "600", marginBottom: 8, textAlign: "center" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  serviceStatus: { fontSize: 10, fontWeight: "800" },
  latency: { color: COLORS.textMuted, fontSize: 10, marginTop: 6, fontWeight: "500" },
  
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, ...CARD_SHADOW },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  cardTitle: { color: COLORS.text, fontWeight: "800", fontSize: 15 },
  
  infoGrid: { backgroundColor: COLORS.background, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 14 },
  infoBorderBottom: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoKey: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  infoValue: { color: COLORS.text, fontSize: 13, fontWeight: "750" },
  
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingVertical: 6, paddingHorizontal: 14 },
  chipText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "600" },
  logDivider: { height: 1, backgroundColor: COLORS.border },
  
  emptyLogBox: { alignItems: "center", justifyContent: "center", paddingVertical: 30, gap: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "500" },
  
  logItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, borderWidth: 1, padding: 12 },
  logIconBox: { width: 28, height: 28, borderRadius: RADIUS.xs, alignItems: "center", justifyContent: "center" },
  logMessage: { color: COLORS.text, fontSize: 13, fontWeight: "500", lineHeight: 20, marginBottom: 6 },
  logMetaRow: { flexDirection: "row", alignItems: "center" },
  logLevelText: { fontSize: 10, fontWeight: "800" },
  logMetaDot: { color: COLORS.border, marginHorizontal: 6 },
  logMetaText: { color: COLORS.textMuted, fontSize: 10, fontWeight: "500", flex: 1 },
  
  pager: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  pagerButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  pagerButtonDisabled: { backgroundColor: "transparent", borderColor: "transparent" },
  pagerText: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  pagerBadge: { backgroundColor: COLORS.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  pagerInfo: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
});