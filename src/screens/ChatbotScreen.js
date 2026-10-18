import { useState, useRef } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { sendChatMessage } from "../services/chatbotService";
import AppTextInput from "../components/AppTextInput";
import useKeyboardHeight from "../hooks/useKeyboardHeight";

const GREETING = "Halo! Saya asisten Decant Temcy. Ceritakan parfum seperti apa yang kamu cari 🌸";

const QUICK_PROMPTS = [
  "Rekomendasiin parfum fresh buat sehari-hari",
  "Parfum yang mirip Bleu de Chanel apa?",
  "Parfum cowok yang tahan lama",
  "Aroma floral yang cocok buat cewek",
];

function ChatBubble({ message }) {
  const isBot = message.sender === "bot";
  return (
    <View style={[styles.bubbleRow, isBot ? styles.bubbleRowLeft : styles.bubbleRowRight]}>
      <View style={[styles.bubble, isBot ? styles.bubbleBot : styles.bubbleUser]}>
        <Text style={styles.bubbleText}>{message.text}</Text>
      </View>
    </View>
  );
}

export default function ChatbotScreen({ navigation }) {
  const [messages, setMessages] = useState([{ id: "0", sender: "bot", text: GREETING }]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState(() => `session-${Date.now()}`);
  const listRef = useRef(null);

  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  // softwareKeyboardLayoutMode "pan" menggeser SELURUH jendela ke atas ~setinggi keyboard
  // (supaya field bawah tidak tertutup). Akibatnya bagian atas layar terpotong.
  // paddingTop setinggi keyboard mendorong konten turun, sehingga setelah digeser
  // header kembali terlihat di posisinya. Kalau ada celah/selisih kecil saat dites,
  // kurangi nilai ini (mis. keyboardHeight - 12).
  const panCompensation = Platform.OS === "android" ? keyboardHeight : 0;

  const handleResetChat = () => {
    setMessages([{ id: "0", sender: "bot", text: GREETING }]);
    setSessionId(`session-${Date.now()}`);
    setInput("");
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { id: Date.now().toString(), sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const { reply } = await sendChatMessage(input, sessionId);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), sender: "bot", text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "bot", text: "Maaf, terjadi kendala. Coba lagi ya." }]);
    } finally {
      setIsSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { paddingTop: insets.top + panCompensation }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Asisten Decant Temcy</Text>
            <Text style={styles.headerSubtitle}>Online · Siap bantu cari parfum</Text>
          </View>
          <Pressable style={styles.resetButton} onPress={handleResetChat}>
            <Ionicons name="refresh" size={13} color={COLORS.primary} />
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <ChatBubble message={item} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {isSending && (
          <View style={{ paddingLeft: 16, paddingBottom: 6 }}>
            <ActivityIndicator color={COLORS.primary} size="small" />
          </View>
        )}

        {messages.length === 1 && (
          <View style={styles.quickPromptWrap}>
            {QUICK_PROMPTS.map((prompt) => (
              <Pressable key={prompt} style={styles.quickPromptChip} onPress={() => setInput(prompt)}>
                <Text style={styles.quickPromptText} numberOfLines={2}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={[styles.inputRow, { paddingBottom: 12 + (keyboardHeight > 0 ? 0 : insets.bottom) }]}>
          <AppTextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Tulis pesan..."
            onSubmitEditing={handleSend}
          />
          <Pressable style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendButtonText}>Kirim</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  backButton: { padding: 4 },
  headerTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  headerSubtitle: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  resetButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  resetText: { color: COLORS.primary, fontSize: 12, fontWeight: "600" },
  bubbleRow: { flexDirection: "row" },
  bubbleRowLeft: { justifyContent: "flex-start" },
  bubbleRowRight: { justifyContent: "flex-end" },
  bubble: { maxWidth: "80%", borderRadius: 12, padding: 10 },
  bubbleBot: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  bubbleUser: { backgroundColor: COLORS.primary },
  bubbleText: { color: COLORS.text, fontSize: 13 },
  quickPromptWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  quickPromptChip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, maxWidth: "47%" },
  quickPromptText: { color: COLORS.textMuted, fontSize: 11 },
  inputRow: { flexDirection: "row", paddingHorizontal: 12, paddingTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  input: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.text },
  sendButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  sendButtonText: { color: COLORS.text, fontWeight: "600" },
});