import { View, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";

import HomeScreen from "../screens/HomeScreen";
import CatalogScreen from "../screens/CatalogScreen";
import CameraSearchScreen from "../screens/CameraSearchScreen";
import CartScreen from "../screens/CartScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

const ICONS = {
  Beranda: "home",
  Katalog: "grid",
  Foto: "camera",
  Keranjang: "cart",
  Profil: "person",
};

function FloatingChatButton() {
  const navigation = useNavigation();
  return (
    <Pressable style={styles.floatingButton} onPress={() => navigation.navigate("Chatbot")}>
      <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.text} />
    </Pressable>
  );
}

export default function BottomTabNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        sceneContainerStyle={{ backgroundColor: COLORS.background }}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.border,
          },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Beranda" component={HomeScreen} />
        <Tab.Screen name="Katalog" component={CatalogScreen} />
        <Tab.Screen name="Foto" component={CameraSearchScreen} />
        <Tab.Screen name="Keranjang" component={CartScreen} />
        <Tab.Screen name="Profil" component={ProfileScreen} />
      </Tab.Navigator>
      <FloatingChatButton />
    </View>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    right: 16,
    bottom: 76,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
});