import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { COLORS } from "../constants/colors";
import { useAuth } from "../context/AuthContext"; // FIX: Import useAuth

import BottomTabNavigator from "./BottomTabNavigator";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import CheckoutNavigator from "./CheckoutNavigator";
import PaymentScreen from "../screens/PaymentScreen";
import OrderSuccessScreen from "../screens/OrderSuccessScreen";
import OrderHistoryScreen from "../screens/OrderHistoryScreen";
import OrderDetailScreen from "../screens/OrderDetailScreen";
import WriteReviewScreen from "../screens/WriteReviewScreen";
import WishlistScreen from "../screens/WishlistScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import ChatbotScreen from "../screens/ChatbotScreen";
import AddressBookScreen from "../screens/AddressBookScreen";
import AboutScreen from "../screens/AboutScreen";
import AccountSettingsScreen from "../screens/AccountSettingsScreen";
import PreferenceOnboardingScreen from "../screens/PreferenceOnboardingScreen";
import GoogleLoginScreen from "../screens/GoogleLoginScreen";
import AddAddressScreen from "../screens/AddAddressScreen";
import AdminTabNavigator from "./AdminTabNavigator";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  // FIX: Ambil data user dan status loading dari AuthContext
  const { user, isLoading } = useAuth();

  // Cegah render navigasi sebelum status login/sesi selesai dipastikan
  if (isLoading) return null; 

  // FIX: Tentukan route awal secara dinamis berdasarkan role
  const initialRouteName = user?.role === "admin" ? "AdminTabs" : "MainTabs";

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName} // FIX: Terapkan initialRouteName dinamis
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: "slide_from_right", // <-- DITAMBAHKAN
      }}
    >
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="AdminTabs" component={AdminTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Masuk" }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Daftar" }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: "Detail Produk" }} />
      <Stack.Screen name="Checkout" component={CheckoutNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "Pembayaran", headerBackVisible: false }} />
      <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: "Riwayat Pesanan" }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: "Detail Pesanan" }} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: "Tulis Ulasan" }} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ title: "Wishlist" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifikasi" }} />
      <Stack.Screen name="Chatbot" component={ChatbotScreen} options={{ title: "Chat dengan Kami" }} />
      <Stack.Screen name="AddressBook" component={AddressBookScreen} options={{ title: "Alamat Saya" }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: "Tentang Kami" }} />
      <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{ title: "Akun Saya" }} />
      <Stack.Screen name="PreferenceOnboarding" component={PreferenceOnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GoogleLogin" component={GoogleLoginScreen} options={{ title: "Masuk dengan Google" }} />
      <Stack.Screen name="AddAddress" component={AddAddressScreen} options={{ title: "Tambah Alamat" }} />
    </Stack.Navigator>
  );
}