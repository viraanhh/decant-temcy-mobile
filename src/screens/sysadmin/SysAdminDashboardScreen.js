import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING, RADIUS, CARD_SHADOW } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getSysAdminUsers, getSystemStatus, getSystemLogs } from "../../services/adminService";

const SERVICES = [
  { key: "database", label: "Database" },
  { key: "smtp", label: "Email (SMTP)" },
  { key: "ai_service", label: "AI Engine" },
];
const ROLE_CARDS = [
  { key: "customer", label: "Customer", icon: "people-outline", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.12)" },
  { key: "admin", label: "Admin Toko", icon: "storefront-outline", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.12)" },
  { key: "sysadmin", label: "SysAdmin", icon: "shield-checkmark-outline", color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.12)" },
];
const LEVEL_COLOR = { info: "#3B82F6", warning: "#F59E0B", error: "#EF4444" };
const LEVEL_BG = { info: "rgba(59, 130, 246, 0.12)", warning: "rgba(245, 158, 11, 0.12)", error: "rgba(239, 68, 68, 0.12)" };

const dotColor = (s) => (s === "online" ? "#10B981" : s === "offline" ? "#EF4444" : s === "unknown" ? "#F59E0B" : COLORS.textMuted);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
};

export default function SysAdminDashboardScreen({ navigation }) {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [status, setStatus] = useState(null); // null = sedang diperiksa
  const [logs, setLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(() => {
    const p1 = getSysAdminUsers({ page: 1, limit: 200 })
      .then((res) => {
        setUsers(res.users);
        setTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setUsersLoading(false));

    setStatus(null);
    const p2 = getSystemStatus()
      .then(setStatus)
      .catch(() => setStatus({ error: true }));

    const p3 = getSystemLogs({ page: 1, limit: 5 })
      .then((res) => setLogs(res.logs))
      .catch(() => setLogs([]));

    return Promise.all([p1, p2, p3]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const countRole = (role) => users.filter((u) => u.role === role).length;
  const inactive = users.filter((u) => !u.is_active).length;

  const goUsers = (role) =>
    navigation.navigate("Users", { screen: "SysAdminUserList", params: { role, t: Date.now() } });
  const goAddUser = () => navigation.navigate("Users", { screen: "SysAdminUserForm", initial: false });

  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.xl, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* HEADER / HERO SECTION */}
      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <View style={styles.heroTopRow}>
            <Text style={styles.date}>{today}</Text>
            <View style={styles.roleChip}>
              <Ionicons name="shield-checkmark" size={12} color="#8B5CF6" />
              <Text style={styles.roleChipText}>SysAdmin</Text>
            </View>
          </View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name} numberOfLines={1}>{user?.name || "Administrator"}</Text>
        </View>
      </View>

      {/* STATUS LAYANAN (SERVER HEALTH) */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kesehatan Server</Text>
          <Pressable onPress={() => navigation.navigate("Monitoring")} hitSlop={10}>
            <Text style={styles.link}>Detail Server</Text>
          </Pressable>
        </View>
        <Pressable 
          style={({ pressed }) => [styles.statusStrip, pressed && { opacity: 0.8 }]} 
          onPress={() => navigation.navigate("Monitoring")}
        >
          {SERVICES.map((s, index) => {
            const st = status && !status.error ? status.status?.[s.key]?.status : null;
            return (
              <View key={s.key} style={[styles.statusItem, index !== SERVICES.length - 1 && styles.statusBorder]}>
                <View style={[styles.dot, { backgroundColor: dotColor(st) }]} />
                <View>
                  <Text style={styles.statusLabel}>{s.label}</Text>
                  <Text style={[styles.statusValue, { color: dotColor(st) }]}>
                    {status === null ? "Loading…" : status.error ? "Error" : (st || "unknown").toUpperCase()}
                  </Text>
                </View>
              </View>
            );
          })}
        </Pressable>
      </View>

      {/* STATISTIK AKUN PENGGUNA */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Manajemen Pengguna</Text>
          <Pressable onPress={() => goUsers("")} hitSlop={10}>
            <Text style={styles.link}>Kelola Semua</Text>
          </Pressable>
        </View>
        
        {usersLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 30 }} />
        ) : (
          <>
            <View style={styles.roleRow}>
              {ROLE_CARDS.map((r) => (
                <Pressable 
                  key={r.key} 
                  style={({ pressed }) => [styles.roleCard, pressed && { transform: [{ scale: 0.97 }] }]} 
                  onPress={() => goUsers(r.key)}
                >
                  <View style={[styles.roleIcon, { backgroundColor: r.bg }]}>
                    <Ionicons name={r.icon} size={20} color={r.color} />
                  </View>
                  <Text style={styles.roleCount}>{countRole(r.key)}</Text>
                  <Text style={styles.roleLabel}>{r.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable 
              style={({ pressed }) => [styles.totalCard, pressed && { backgroundColor: "rgba(0,0,0,0.02)" }]} 
              onPress={() => goUsers("")}
            >
              <View style={[styles.totalIconBox, { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
                <Ionicons name="people" size={18} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.totalValue}>{total} Total Akun Terdaftar</Text>
                {inactive > 0 ? (
                  <Text style={styles.totalHintText}><Text style={{ color: "#EF4444", fontWeight: "700" }}>{inactive}</Text> akun dalam status nonaktif</Text>
                ) : (
                  <Text style={styles.totalHintText}>Semua akun aktif</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </Pressable>
          </>
        )}
      </View>

      {/* AKSI CEPAT */}
      <View>
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.actionRow}>
          <Pressable 
            style={({ pressed }) => [styles.actionCard, pressed && { backgroundColor: "rgba(0,0,0,0.02)" }]} 
            onPress={goAddUser}
          >
            <View style={styles.actionIconBox}>
              <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>Buat Akun</Text>
          </Pressable>
          
          <Pressable 
            style={({ pressed }) => [styles.actionCard, pressed && { backgroundColor: "rgba(0,0,0,0.02)" }]} 
            onPress={() => navigation.navigate("Monitoring")}
          >
            <View style={styles.actionIconBox}>
              <Ionicons name="pulse-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>Monitoring</Text>
          </Pressable>
          
          <Pressable 
            style={({ pressed }) => [styles.actionCard, pressed && { backgroundColor: "rgba(0,0,0,0.02)" }]} 
            onPress={() => navigation.navigate("Konfigurasi")}
          >
            <View style={styles.actionIconBox}>
              <Ionicons name="options-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>Konfigurasi</Text>
          </Pressable>
        </View>
      </View>

      {/* LOG AKTIVITAS TERBARU */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Log Aktivitas Sistem</Text>
          <Pressable onPress={() => navigation.navigate("Monitoring")} hitSlop={10}>
            <Text style={styles.link}>Selengkapnya</Text>
          </Pressable>
        </View>
        
        {logs.length === 0 ? (
          <View style={styles.emptyLogBox}>
            <Ionicons name="document-text-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Belum ada aktivitas tercatat hari ini</Text>
          </View>
        ) : (
          <View style={styles.logContainer}>
            {logs.map((log, index) => {
              const color = LEVEL_COLOR[log.level] || "#3B82F6";
              const bgColor = LEVEL_BG[log.level] || "rgba(59, 130, 246, 0.12)";
              return (
                <View key={log.log_id} style={[styles.logItem, index !== logs.length - 1 && styles.logBorderBottom]}>
                  <View style={[styles.logIconBox, { backgroundColor: bgColor }]}>
                    <Ionicons 
                      name={log.level === 'error' ? "warning" : log.level === 'warning' ? "alert-circle" : "information-circle"} 
                      size={16} 
                      color={color} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logMessage} numberOfLines={2}>{log.message}</Text>
                    <View style={styles.logMetaRow}>
                      <Text style={[styles.logLevel, { color }]}>{log.level.toUpperCase()}</Text>
                      <Text style={styles.logMetaDot}>•</Text>
                      <Text style={styles.logMetaDate}>
                        {new Date(log.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  hero: { marginBottom: 4 },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  date: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  roleChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(139, 92, 246, 0.1)", borderRadius: RADIUS.full, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: "rgba(139, 92, 246, 0.2)" },
  roleChipText: { color: "#8B5CF6", fontSize: 11, fontWeight: "800" },
  greeting: { color: COLORS.text, fontSize: 16, fontWeight: "600", marginBottom: 2 },
  name: { color: COLORS.primary, fontSize: 26, fontWeight: "800" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  link: { color: COLORS.primary, fontSize: 12, fontWeight: "750" },

  statusStrip: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, ...CARD_SHADOW },
  statusItem: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  statusBorder: { borderRightWidth: 1, borderRightColor: COLORS.border, marginRight: SPACING.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  statusValue: { fontSize: 12, fontWeight: "800", marginTop: 2 },

  roleRow: { flexDirection: "row", gap: SPACING.sm },
  roleCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, alignItems: "flex-start", ...CARD_SHADOW },
  roleIcon: { width: 40, height: 40, borderRadius: RADIUS.sm, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  roleCount: { color: COLORS.text, fontSize: 24, fontWeight: "800", marginBottom: 2 },
  roleLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  
  totalCard: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, ...CARD_SHADOW },
  totalIconBox: { width: 36, height: 36, borderRadius: RADIUS.full, alignItems: "center", justifyContent: "center" },
  totalValue: { color: COLORS.text, fontSize: 14, fontWeight: "750" },
  totalHintText: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  actionRow: { flexDirection: "row", gap: SPACING.sm, marginTop: 4 },
  actionCard: { flex: 1, alignItems: "center", backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.md, gap: 10, ...CARD_SHADOW },
  actionIconBox: { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: `${COLORS.primary}12`, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: `${COLORS.primary}20` },
  actionText: { color: COLORS.text, fontSize: 12, fontWeight: "700" },

  emptyLogBox: { alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 40, gap: 10, ...CARD_SHADOW },
  emptyText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "500" },
  
  logContainer: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, ...CARD_SHADOW },
  logItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: SPACING.md },
  logBorderBottom: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logIconBox: { width: 32, height: 32, borderRadius: RADIUS.sm, alignItems: "center", justifyContent: "center" },
  logMessage: { color: COLORS.text, fontSize: 13, fontWeight: "600", marginBottom: 6, lineHeight: 18 },
  logMetaRow: { flexDirection: "row", alignItems: "center" },
  logLevel: { fontSize: 10, fontWeight: "800" },
  logMetaDot: { color: COLORS.textMuted, fontSize: 10, marginHorizontal: 6 },
  logMetaDate: { color: COLORS.textMuted, fontSize: 11, fontWeight: "500" },
});