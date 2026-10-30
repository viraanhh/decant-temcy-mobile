import { useCallback, useEffect } from "react";
import { Text, TextInput } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from "@expo-google-fonts/montserrat";

import { AuthProvider } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import { WishlistProvider } from "./src/context/WishlistContext";
import { AddressProvider } from "./src/context/AddressContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { COLORS } from "./src/constants/colors";

SplashScreen.preventAutoHideAsync();

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [{ fontFamily: "Montserrat_400Regular" }, Text.defaultProps.style];

TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [{ fontFamily: "Montserrat_400Regular" }, TextInput.defaultProps.style];

// Konfigurasi tema navigasi agar background dasarnya mengikuti warna gelap aplikasi
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(COLORS.background);
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <AddressProvider>
            {/* Menambahkan prop theme={AppTheme} untuk mencegah blank putih saat pop/back screen */}
            <NavigationContainer theme={AppTheme} onReady={onLayoutRootView}>
              <StatusBar style="light" />
              <RootNavigator />
            </NavigationContainer>
          </AddressProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}