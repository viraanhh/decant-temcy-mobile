import { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "../constants/colors";
import { searchProductByImage } from "../services/ocrService";

export default function CameraSearchScreen({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [recognizedText, setRecognizedText] = useState(null);
  const [matchedProducts, setMatchedProducts] = useState([]);
  const [error, setError] = useState("");

  const resetResult = () => {
    setRecognizedText(null);
    setMatchedProducts([]);
    setError("");
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Izin kamera dibutuhkan untuk fitur ini");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      resetResult();
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Izin akses galeri dibutuhkan untuk fitur ini");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      resetResult();
    }
  };

  const handleSearch = async () => {
    if (!imageUri) return;
    setIsSearching(true);
    setError("");
    try {
      // ocrService sudah menggabungkan matchedProduct + recommendations
      // jadi satu list produk siap tampil (sudah di-map format UI), jadi
      // di sini tidak perlu lagi getProductById satu-satu seperti sebelumnya.
      const { recognizedText, matchedProducts, message } = await searchProductByImage(imageUri);
      setRecognizedText(recognizedText);

      // Dedup jaga-jaga kalau matchedProduct kebawa lagi di dalam recommendations
      const uniqueProducts = Array.from(new Map(matchedProducts.map((p) => [p.id, p])).values());
      setMatchedProducts(uniqueProducts);

      // message terisi kalau backend/servis CV gagal (bukan network error biasa,
      // tapi respons terkontrol dari cv.controller.js — lihat fallbackMessage)
      if (message) {
        setError(message);
      }
    } catch (err) {
      setError("Gagal mencari produk, coba lagi");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>Cari Parfum via Foto</Text>

      <View style={styles.imageBox}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        ) : (
          <Text style={{ color: COLORS.textFaint, fontSize: 12, textAlign: "center" }}>
            Ambil foto label/botol parfum{"\n"}atau pilih dari galeri
          </Text>
        )}
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={styles.actionButton} onPress={pickFromCamera}>
          <Text style={styles.actionButtonText}>📷 Kamera</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={pickFromGallery}>
          <Text style={styles.actionButtonText}>🖼️ Galeri</Text>
        </Pressable>
      </View>

      {imageUri && (
        <Pressable style={styles.searchButton} onPress={handleSearch} disabled={isSearching}>
          {isSearching ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <Text style={styles.searchButtonText}>Cari Produk</Text>
          )}
        </Pressable>
      )}

      {recognizedText && (
        <Text style={styles.recognizedText}>Teks terdeteksi: "{recognizedText}"</Text>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {matchedProducts.length > 0 && (
        <FlatList
          data={matchedProducts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ gap: 8, marginTop: 12 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.resultCard}
              onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
            >
              <Text style={styles.resultName}>{item.product_name}</Text>
              <Text style={styles.resultBrand}>{item.brand}</Text>
            </Pressable>
          )}
        />
      )}

      {recognizedText && matchedProducts.length === 0 && !error && (
        <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 10 }}>
          Tidak ada produk yang cocok ditemukan.
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  header: { color: COLORS.text, fontSize: 18, fontWeight: "600", marginBottom: 16 },
  imageBox: { height: 220, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  previewImage: { width: "100%", height: "100%" },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionButton: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, alignItems: "center" },
  actionButtonText: { color: COLORS.text, fontSize: 13 },
  searchButton: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 14 },
  searchButtonText: { color: COLORS.text, fontWeight: "600" },
  recognizedText: { color: COLORS.textMuted, fontSize: 12, marginTop: 12, fontStyle: "italic" },
  errorText: { color: COLORS.primary, fontSize: 12, marginTop: 10 },
  resultCard: { backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
  resultName: { color: COLORS.text, fontWeight: "600", fontSize: 13 },
  resultBrand: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
});