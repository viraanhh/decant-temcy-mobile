import React from "react";
import { View, Text } from "react-native";
import { COLORS } from "./src/constants/colors";
import { AuthProvider } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import { WishlistProvider } from "./src/context/WishlistContext";
import { AddressProvider } from "./src/context/AddressContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Minimal App Berhasil</Text>
    </View>
  );
}