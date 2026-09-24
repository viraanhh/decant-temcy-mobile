import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminProductListScreen from "../screens/admin/AdminProductListScreen";
import AdminProductFormScreen from "../screens/admin/AdminProductFormScreen";
import AdminMoreScreen from "../screens/admin/AdminMoreScreen";
import AdminOrderListScreen from "../screens/admin/AdminOrderListScreen";
import AdminOrderDetailScreen from "../screens/admin/AdminOrderDetailScreen";

const Tab = createBottomTabNavigator();
const ProductStack = createNativeStackNavigator();
const OrderStack = createNativeStackNavigator();

function ProductStackNavigator() {
  return (
    <ProductStack.Navigator
      initialRouteName="AdminProductList"
      screenOptions={{ headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.text }}
    >
      <ProductStack.Screen name="AdminProductList" component={AdminProductListScreen} options={{ headerShown: false }} />
      <ProductStack.Screen name="AdminProductForm" component={AdminProductFormScreen} options={{ title: "Form Produk" }} />
    </ProductStack.Navigator>
  );
}

function OrderStackNavigator() {
  return (
    <OrderStack.Navigator 
      initialRouteName="AdminOrderList"
      screenOptions={{ headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.text }}
    >
      <OrderStack.Screen name="AdminOrderList" component={AdminOrderListScreen} options={{ headerShown: false }} />
      <OrderStack.Screen name="AdminOrderDetail" component={AdminOrderDetailScreen} options={{ title: "Detail Pesanan" }} />
    </OrderStack.Navigator>
  );
}

const ICONS = { Dashboard: "grid", Produk: "cube", Pesanan: "receipt", Lainnya: "menu" };

export default function AdminTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: { backgroundColor: COLORS.surface, borderTopColor: COLORS.border },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Produk" component={ProductStackNavigator} />
      <Tab.Screen name="Pesanan" component={OrderStackNavigator} />
      <Tab.Screen name="Lainnya" component={AdminMoreScreen} />
    </Tab.Navigator>
  );
}