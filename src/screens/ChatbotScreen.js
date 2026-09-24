import { useState, useRef } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { sendChatMessage } from "../services/chatbotService";
import AppTextInput from "../components/AppTextInput";
import useKeyboardHeight from "../hooks/useKeyboardHeight";

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

function ProductSuggestionCard({ product, onPress }) {
  return (
    <Pressable style={styles.suggestionCard} onPress={onPress}>
      <View style={styles.suggestionImagePlaceholder} />
      <Text style={styles.suggestionName} numberOfLines={1}>{product.product_name}</Text>
      <Text style={styles.suggestionBrand}>{product.brand}</Text>
    </Pressable>
  );
}

export default function ChatbotScreen({ navigation }) {
  const [messages, setMessages] = useState([
    { id: "0", sender: "bot", text: "Halo! Saya asisten Decant Temcy. Ceritakan parfum seperti apa yang kamu cari 🌸" },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const keyboardHeight = useKeyboardHeight();

  // Generate sessionId yang unik, juga bisa direset agar backend merefresh konteks
  const [sessionId, setSessionId] = useState(() => `session-${Date.now()}`);
  const listRef = useRef(null);

  const handleResetChat = () => {
    setMessages([{ id: "0", sender: "bot", text: "Halo! Saya asisten Decant Temcy. Ceritakan parfum seperti apa yang kamu cari 🌸" }]);
    setSessionId(`session-${Date.now()}`); // Generate session id baru untuk merefresh konteks AI
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
    <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
      <View style={styles.headerRow}>
        <View>
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
        renderItem={({ item }) => (
          <View>
            <ChatBubble message={item} />
            {item.products?.length > 0 && (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={item.products}
                keyExtractor={(p) => `sug-${p.id}`}
                contentContainerStyle={{ gap: 8, marginTop: 6, marginLeft: 8 }}
                renderItem={({ item: product }) => (
                  <ProductSuggestionCard
                    product={product}
                    onPress={() => navigation.navigate("ProductDetail", { productId: product.id })}
                  />
                )}
              />
            )}
          </View>
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {isSending && (
        <View style={{ paddingLeft: 16, paddingBottom: 6 }}>
          <ActivityIndicator color={COLORS.primary} size="small" />
        </View>
      )}

      {/* Quick Prompts dirender hanya jika belum ada percakapan (messages.length === 1) */}
      {messages.length === 1 && (
        <View style={styles.quickPromptWrap}>
          {QUICK_PROMPTS.map((prompt) => (
            <Pressable key={prompt} style={styles.quickPromptChip} onPress={() => { setInput(prompt); }}>
              <Text style={styles.quickPromptText} numberOfLines={2}>{prompt}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  headerSubtitle: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  resetButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  resetText: { color: COLORS.primary, fontSize: 12, fontWeight: "600" },
  bubbleRow: { flexDirection: "row" },
  bubbleRowLeft: { justifyContent: "flex-start" },
  bubbleRowRight: { justifyContent: "flex-end" },
  bubble: { maxWidth: "80%", borderRadius: 12, padding: 10 },
  bubbleBot: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  bubbleUser: { backgroundColor: COLORS.primary },
  bubbleText: { color: COLORS.text, fontSize: 13 },
  suggestionCard: { width: 100, backgroundColor: COLORS.surface, borderRadius: 8, padding: 6, borderWidth: 1, borderColor: COLORS.border },
  suggestionImagePlaceholder: { height: 60, borderRadius: 6, backgroundColor: COLORS.surfaceLight },
  suggestionName: { color: COLORS.text, fontSize: 10, fontWeight: "600", marginTop: 4 },
  suggestionBrand: { color: COLORS.textMuted, fontSize: 9 },

  // Style untuk Quick Prompts
  quickPromptWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  quickPromptChip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, maxWidth: "47%" },
  quickPromptText: { color: COLORS.textMuted, fontSize: 11 },

  inputRow: { flexDirection: "row", padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  input: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.text },
  sendButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  sendButtonText: { color: COLORS.text, fontWeight: "600" },
});