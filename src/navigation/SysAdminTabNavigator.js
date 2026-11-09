import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";

import SysAdminUserListScreen from "../screens/sysadmin/SysAdminUserListScreen";
import SysAdminUserFormScreen from "../screens/sysadmin/SysAdminUserFormScreen";
import SysAdminDashboardScreen from "../screens/sysadmin/SysAdminDashboardScreen";
import SysAdminMonitoringScreen from "../screens/sysadmin/SysAdminMonitoringScreen";
import SysAdminConfigScreen from "../screens/sysadmin/SysAdminConfigScreen";
import SysAdminProfileScreen from "../screens/sysadmin/SysAdminProfileScreen";

function withSafeTop(Screen) {
  return function SafeTopScreen(props) {
    const insets = useSafeAreaInsets();
    return (
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: COLORS.background }}>
        <Screen {...props} />
      </View>
    );
  };
}

const DashboardTab = withSafeTop(SysAdminDashboardScreen);
const UserListTab = withSafeTop(SysAdminUserListScreen);
const MonitoringTab = withSafeTop(SysAdminMonitoringScreen);
const ConfigTab = withSafeTop(SysAdminConfigScreen);
const ProfileTab = withSafeTop(SysAdminProfileScreen);

const Tab = createBottomTabNavigator();
const UserStack = createNativeStackNavigator();

const stackScreenOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.text,
  contentStyle: { backgroundColor: COLORS.background },
  animation: "slide_from_right",
};

function UserStackNavigator() {
  return (
    <UserStack.Navigator screenOptions={stackScreenOptions}>
      <UserStack.Screen name="SysAdminUserList" component={UserListTab} options={{ headerShown: false }} />
      <UserStack.Screen name="SysAdminUserForm" component={SysAdminUserFormScreen} options={{ title: "Form User" }} />
    </UserStack.Navigator>
  );
}

const ICONS = {
  Beranda: "grid",
  Users: "people",
  Monitoring: "pulse",
  Konfigurasi: "settings",
  Akun: "person",
};

export default function SysAdminTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Beranda"
      sceneContainerStyle={{ backgroundColor: COLORS.background }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarStyle: { backgroundColor: COLORS.surface, borderTopColor: COLORS.border },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Beranda" component={DashboardTab} />
      <Tab.Screen name="Users" component={UserStackNavigator} />
      <Tab.Screen name="Monitoring" component={MonitoringTab} />
      <Tab.Screen name="Konfigurasi" component={ConfigTab} />
      <Tab.Screen name="Akun" component={ProfileTab} />
    </Tab.Navigator>
  );
}