
import { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "../constants/colors";
import { sendChatMessage } from "../services/chatbotService";
import { getProductById } from "../services/productService";

import AppTextInput from "../components/AppTextInput";
import ProductImage from "../components/ProductImage";
import useKeyboardHeight from "../hooks/useKeyboardHeight";
import withLoginGuard from "../components/withLoginGuard";

const GREETING =
  "Halo! Saya Mincy. Ceritakan parfum seperti apa yang kamu cari 🌸";

const QUICK_PROMPTS = [
  "Rekomendasiin parfum fresh buat sehari-hari",
  "Parfum yang mirip Bleu de Chanel apa?",
  "Parfum cowok yang tahan lama",
  "Aroma floral yang cocok buat cewek",
];

// ==========================================
// RECOMMENDATION PRODUCT CARD
// ==========================================

function RecommendationCard({ item, navigation }) {
  const product = item.product;

  return (
    <Pressable
      style={styles.recommendationCard}
      onPress={() => {
        navigation.push("ProductDetail", {
          productId: item.product_id,
        });
      }}
    >
      <ProductImage
        filename={product?.image_filename}
        style={styles.recommendationImage}
        iconSize={28}
      />

      <View style={styles.recommendationInfo}>
        <Text style={styles.recommendationBrand} numberOfLines={1}>
          {item.brand || product?.brand || "Brand parfum"}
        </Text>

        <Text style={styles.recommendationName} numberOfLines={2}>
          {item.product_name || product?.product_name || "Nama produk"}
        </Text>

        <Text style={styles.recommendationLink}>
          Lihat detail produk →
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={COLORS.textMuted}
      />
    </Pressable>
  );
}

// ==========================================
// CHAT BUBBLE
// ==========================================

function ChatBubble({ message, navigation }) {
  const isBot = message.sender === "bot";

  return (
    <View>
      <View
        style={[
          styles.bubbleRow,
          isBot ? styles.bubbleRowLeft : styles.bubbleRowRight,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isBot ? styles.bubbleBot : styles.bubbleUser,
          ]}
        >
          <Text style={styles.bubbleText}>{message.text}</Text>
        </View>
      </View>

      {isBot && message.recommendations?.length > 0 && (
        <View style={styles.recommendationList}>
          {message.recommendations.map((item, index) => (
            <RecommendationCard
              key={`${item.product_id}-${index}`}
              item={item}
              navigation={navigation}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ==========================================
// MAIN CHATBOT SCREEN
// ==========================================

function ChatbotScreen({ navigation }) {
  const [messages, setMessages] = useState([
    {
      id: "0",
      sender: "bot",
      text: GREETING,
    },
  ]);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [sessionId, setSessionId] = useState(
    () => `session-${Date.now()}`
  );

  const listRef = useRef(null);

  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  const panCompensation =
    Platform.OS === "android" ? keyboardHeight : 0;

  // ==========================================
  // RESET CHAT
  // ==========================================

  const handleResetChat = () => {
    if (isSending) return;

    setMessages([
      {
        id: "0",
        sender: "bot",
        text: GREETING,
      },
    ]);

    setSessionId(`session-${Date.now()}`);
    setInput("");
  };

  // ==========================================
  // SEND MESSAGE
  // ==========================================

  const handleSend = async () => {
    const messageText = input.trim();

    if (!messageText || isSending) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      // Kirim pesan ke backend chatbot
      const { reply, recommendations } = await sendChatMessage(
        messageText,
        sessionId
      );

      // Ambil detail produk berdasarkan product_id
      const recommendationItems = await Promise.all(
        (recommendations || []).map(async (item) => {
          try {
            const product = await getProductById(item.product_id);

            return {
              ...item,
              product,
            };
          } catch (error) {
            console.log(
              "[Chatbot] Gagal mengambil detail produk:",
              item.product_id,
              error.message
            );

            // Tetap tampilkan card meskipun detail produk gagal dimuat
            return item;
          }
        })
      );

      // Tampilkan balasan chatbot beserta rekomendasi
      const botMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: reply || "Maaf, Mincy belum memiliki jawaban.",
        recommendations: recommendationItems,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error(
        "[ChatbotScreen] Error:",
        error.response?.data || error.message
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: "bot",
          text: "Maaf, layanan chatbot tidak tersedia.",
        },
      ]);
    } finally {
      setIsSending(false);

      setTimeout(() => {
        listRef.current?.scrollToEnd({
          animated: true,
        });
      }, 100);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + panCompensation,
          },
        ]}
      >
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={10}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={COLORS.text}
            />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Mincy</Text>
            <Text style={styles.headerSubtitle}>
              Online · Siap bantu cari parfum
            </Text>
          </View>

          <Pressable
            style={styles.resetButton}
            onPress={handleResetChat}
            disabled={isSending}
          >
            <Ionicons
              name="refresh"
              size={13}
              color={COLORS.primary}
            />
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>

        {/* CHAT LIST */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              navigation={navigation}
            />
          )}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({
              animated: true,
            })
          }
        />

        {/* LOADING */}
        {isSending && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              color={COLORS.primary}
              size="small"
            />
          </View>
        )}

        {/* QUICK PROMPTS */}
        {messages.length === 1 && (
          <View style={styles.quickPromptWrap}>
            {QUICK_PROMPTS.map((prompt) => (
              <Pressable
                key={prompt}
                style={styles.quickPromptChip}
                onPress={() => setInput(prompt)}
              >
                <Text
                  style={styles.quickPromptText}
                  numberOfLines={2}
                >
                  {prompt}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* INPUT */}
        <View
          style={[
            styles.inputRow,
            {
              paddingBottom:
                12 + (keyboardHeight > 0 ? 0 : insets.bottom),
            },
          ]}
        >
          <AppTextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Tulis pesan..."
            onSubmitEditing={handleSend}
          />

          <Pressable
            style={[
              styles.sendButton,
              isSending && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={isSending}
          >
            <Text style={styles.sendButtonText}>Kirim</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },

  backButton: {
    padding: 4,
  },

  headerTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },

  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  resetText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
  },

  chatContent: {
    padding: 16,
    gap: 10,
  },

  bubbleRow: {
    flexDirection: "row",
  },

  bubbleRowLeft: {
    justifyContent: "flex-start",
  },

  bubbleRowRight: {
    justifyContent: "flex-end",
  },

  bubble: {
    maxWidth: "80%",
    borderRadius: 12,
    padding: 10,
  },

  bubbleBot: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  bubbleUser: {
    backgroundColor: COLORS.primary,
  },

  bubbleText: {
    color: COLORS.text,
    fontSize: 13,
  },

  // RECOMMENDATION CARDS

  recommendationList: {
    marginTop: 8,
    marginLeft: 4,
    gap: 10,
  },

  recommendationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
    gap: 12,
  },

  recommendationImage: {
    width: 75,
    height: 85,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  recommendationInfo: {
    flex: 1,
    gap: 4,
  },

  recommendationBrand: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
  },

  recommendationName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },

  recommendationLink: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },

  loadingContainer: {
    paddingLeft: 16,
    paddingBottom: 6,
  },

  quickPromptWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  quickPromptChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: "47%",
  },

  quickPromptText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },

  inputRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    color: COLORS.text,
  },

  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },

  sendButtonDisabled: {
    opacity: 0.5,
  },

  sendButtonText: {
    color: COLORS.onPrimary,
    fontWeight: "600",
  },
});

export default withLoginGuard(ChatbotScreen, "chatbot");
