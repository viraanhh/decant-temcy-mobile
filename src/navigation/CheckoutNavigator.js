import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { COLORS } from "../constants/colors";
import CheckoutAddressScreen from "../screens/checkout/CheckoutAddressScreen";
import CheckoutShippingScreen from "../screens/checkout/CheckoutShippingScreen";
import CheckoutReviewScreen from "../screens/checkout/CheckoutReviewScreen";

const Stack = createNativeStackNavigator();

export default function CheckoutNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: "slide_from_right", // <-- DITAMBAHKAN
      }}
    >
      <Stack.Screen name="CheckoutAddress" component={CheckoutAddressScreen} options={{ title: "Alamat" }} />
      <Stack.Screen name="CheckoutShipping" component={CheckoutShippingScreen} options={{ title: "Pengiriman" }} />
      <Stack.Screen name="CheckoutReview" component={CheckoutReviewScreen} options={{ title: "Review Pesanan" }} />
    </Stack.Navigator>
  );
}