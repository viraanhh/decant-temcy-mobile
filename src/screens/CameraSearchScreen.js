import { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { searchProductByImage } from "../services/ocrService";
import ProductImage from "../components/ProductImage"; // Tambahkan Import ini

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
      const { recognizedText, matchedProducts, message } = await searchProductByImage(imageUri);
      setRecognizedText(recognizedText);

      const uniqueProducts = Array.from(new Map(matchedProducts.map((p) => [p.id, p])).values());
      setMatchedProducts(uniqueProducts);

      if (message) {
        setError(message);
      }
    } catch (err) {
      setError("Gagal mencari produk, coba lagi");
    } finally {
      setIsSearching(false);
    }
  };

  const removeImage = () => {
    setImageUri(null);
    resetResult();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header Baru */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Pemindai Parfum</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
           <Ionicons name="close" size={24} color={COLORS.text} />
        </Pressable>
      </View>

      <FlatList 
        data={matchedProducts}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.topSection}>
            {/* Area Gambar */}
            <View style={styles.imageBoxWrapper}>
              <View style={[styles.imageBox, !imageUri && styles.imageBoxEmpty]}>
                {imageUri ? (
                  <>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    {!isSearching && (
                       <Pressable style={styles.removeImageBtn} onPress={removeImage}>
                          <Ionicons name="trash-outline" size={18} color="#FFF" />
                       </Pressable>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyPlaceholder}>
                    <Ionicons name="scan-outline" size={48} color={COLORS.primary} style={{ opacity: 0.5 }} />
                    <Text style={styles.emptyPlaceholderText}>
                      Foto label/botol parfum{"\n"}atau pilih dari galeri
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Tombol Kamera & Galeri */}
            <View style={styles.buttonRow}>
              <Pressable style={styles.actionButton} onPress={pickFromCamera}>
                <Ionicons name="camera-outline" size={20} color={COLORS.text} />
                <Text style={styles.actionButtonText}>Kamera</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={pickFromGallery}>
                <Ionicons name="image-outline" size={20} color={COLORS.text} />
                <Text style={styles.actionButtonText}>Galeri</Text>
              </Pressable>
            </View>

            {/* Tombol Search */}
            {imageUri && (
              <Pressable 
                style={[styles.searchButton, isSearching && styles.searchButtonDisabled]} 
                onPress={handleSearch} 
                disabled={isSearching}
              >
                {isSearching ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <>
                    <Ionicons name="search" size={18} color={COLORS.text} style={{ marginRight: 8 }} />
                    <Text style={styles.searchButtonText}>Pindai Gambar</Text>
                  </>
                )}
              </Pressable>
            )}

            {/* Info Hasil Deteksi Teks & Error */}
            {recognizedText && (
              <View style={styles.infoBanner}>
                 <Ionicons name="text-outline" size={16} color={COLORS.textMuted} />
                 <Text style={styles.recognizedText}>
                   Terdeteksi: <Text style={{ fontWeight: 'bold' }}>"{recognizedText}"</Text>
                 </Text>
              </View>
            )}

            {error ? (
              <View style={styles.errorBanner}>
                 <Ionicons name="alert-circle-outline" size={16} color={COLORS.primary} />
                 <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Title Hasil */}
            {matchedProducts.length > 0 && (
               <Text style={styles.sectionTitle}>Hasil Pencarian ({matchedProducts.length})</Text>
            )}

            {recognizedText && matchedProducts.length === 0 && !error && (
              <View style={styles.noResultBox}>
                <Ionicons name="search-outline" size={32} color={COLORS.border} />
                <Text style={styles.noResultText}>
                  Tidak ada parfum yang cocok dengan teks terdeteksi.
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.resultCard}
            onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
          >
            {/* Tambahan: ProductImage agar UI lebih kaya */}
            <ProductImage 
                filename={item.image_filename} 
                style={styles.resultImagePlaceholder} 
                iconSize={20} 
            />
            <View style={styles.resultInfo}>
              <Text style={styles.resultBrand}>{item.brand}</Text>
              <Text style={styles.resultName} numberOfLines={2}>{item.product_name}</Text>
              <View style={styles.resultActionRow}>
                <Text style={styles.resultActionText}>Lihat Detail</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
              </View>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700" },
  closeButton: { padding: 4, marginRight: -4 },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  topSection: { paddingTop: 20, paddingBottom: 8 },

  imageBoxWrapper: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  imageBox: { height: 260, backgroundColor: COLORS.surface, borderRadius: 16, overflow: "hidden", position: 'relative' },
  imageBoxEmpty: { borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', backgroundColor: COLORS.surfaceLight },
  previewImage: { width: "100%", height: "100%", resizeMode: 'cover' },
  emptyPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  emptyPlaceholderText: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", marginTop: 12, lineHeight: 20 },
  
  removeImageBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  buttonRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  actionButton: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center", gap: 8 },
  actionButtonText: { color: COLORS.text, fontSize: 14, fontWeight: '500' },

  searchButton: { flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: "center", justifyContent: "center", marginTop: 16, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5 },
  searchButtonDisabled: { opacity: 0.7 },
  searchButtonText: { color: COLORS.text, fontWeight: "700", fontSize: 15 },

  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, marginTop: 20, gap: 8 },
  recognizedText: { color: COLORS.textMuted, fontSize: 13, flex: 1 },
  
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${COLORS.primary}15`, borderWidth: 1, borderColor: `${COLORS.primary}50`, borderRadius: 8, padding: 12, marginTop: 20, gap: 8 },
  errorText: { color: COLORS.primary, fontSize: 13, flex: 1, fontWeight: '500' },

  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginTop: 28, marginBottom: 8 },

  noResultBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 20, backgroundColor: COLORS.surfaceLight, borderRadius: 12, marginTop: 20, borderWidth: 1, borderColor: COLORS.border },
  noResultText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 20 },

  resultCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  resultImagePlaceholder: { width: 70, height: 70, borderRadius: 8, backgroundColor: COLORS.surfaceLight },
  resultInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  resultBrand: { color: COLORS.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  resultName: { color: COLORS.text, fontWeight: "600", fontSize: 14, lineHeight: 20 },
  resultActionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  resultActionText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
});