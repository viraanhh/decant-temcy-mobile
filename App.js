import { useCallback, useEffect } from "react";
import { Text, TextInput } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
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

// Trik supaya SEMUA <Text> di aplikasi otomatis pakai Montserrat,
// tanpa perlu tambah fontFamily manual di tiap style satu-satu.
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [{ fontFamily: "Montserrat_400Regular" }, Text.defaultProps.style];

TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [{ fontFamily: "Montserrat_400Regular" }, TextInput.defaultProps.style];

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
            <NavigationContainer onReady={onLayoutRootView}>
              <StatusBar style="light" />
              <RootNavigator />
            </NavigationContainer>
          </AddressProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}