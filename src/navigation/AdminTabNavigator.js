import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";

// Import Screens
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminProductListScreen from "../screens/admin/AdminProductListScreen";
import AdminProductFormScreen from "../screens/admin/AdminProductFormScreen";
import AdminOrderListScreen from "../screens/admin/AdminOrderListScreen";
import AdminOrderDetailScreen from "../screens/admin/AdminOrderDetailScreen";
import AdminMoreScreen from "../screens/admin/AdminMoreScreen";
import AdminReviewListScreen from "../screens/admin/AdminReviewListScreen";
import AdminVoucherListScreen from "../screens/admin/AdminVoucherListScreen";
import AdminVoucherFormScreen from "../screens/admin/AdminVoucherFormScreen";
import AdminUserListScreen from "../screens/admin/AdminUserListScreen";
import AdminSalesReportScreen from "../screens/admin/AdminSalesReportScreen";

const Tab = createBottomTabNavigator();
const ProductStack = createNativeStackNavigator();
const OrderStack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();

const stackScreenOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.text,
  contentStyle: { backgroundColor: COLORS.background },
  animation: "slide_from_right", // <-- DITAMBAHKAN
};

function ProductStackNavigator() {
  return (
    <ProductStack.Navigator screenOptions={stackScreenOptions}>
      <ProductStack.Screen name="AdminProductList" component={AdminProductListScreen} options={{ headerShown: false }} />
      <ProductStack.Screen name="AdminProductForm" component={AdminProductFormScreen} options={{ title: "Form Produk" }} />
    </ProductStack.Navigator>
  );
}

function OrderStackNavigator() {
  return (
    <OrderStack.Navigator screenOptions={stackScreenOptions}>
      <OrderStack.Screen name="AdminOrderList" component={AdminOrderListScreen} options={{ headerShown: false }} />
      <OrderStack.Screen name="AdminOrderDetail" component={AdminOrderDetailScreen} options={{ title: "Detail Pesanan" }} />
    </OrderStack.Navigator>
  );
}

function MoreStackNavigator() {
  return (
    <MoreStack.Navigator screenOptions={stackScreenOptions}>
      <MoreStack.Screen name="AdminMore" component={AdminMoreScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="AdminReviews" component={AdminReviewListScreen} options={{ title: "Review" }} />
      <MoreStack.Screen name="AdminVouchers" component={AdminVoucherListScreen} options={{ title: "Kelola Voucher" }} />
      <MoreStack.Screen name="AdminVoucherForm" component={AdminVoucherFormScreen} options={{ title: "Form Voucher" }} />
      <MoreStack.Screen name="AdminUsers" component={AdminUserListScreen} options={{ title: "Kelola Users" }} />
      <MoreStack.Screen name="AdminSalesReport" component={AdminSalesReportScreen} options={{ title: "Laporan Penjualan" }} />
    </MoreStack.Navigator>
  );
}

const ICONS = { 
  Dashboard: "grid", 
  Produk: "cube", 
  Pesanan: "receipt", 
  Lainnya: "menu" 
};

export default function AdminTabNavigator() {
  return (
    <Tab.Navigator
      sceneContainerStyle={{ backgroundColor: COLORS.background }}
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
      <Tab.Screen name="Lainnya" component={MoreStackNavigator} />
    </Tab.Navigator>
  );
}