import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/customer/HomeScreen';
import OrderScreen from '../screens/customer/OrderScreen';
import ReservationScreen from '../screens/customer/ReservationScreen';
import PaymentHistoryScreen from '../screens/customer/PaymentHistoryScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import SavedCardsScreen from '../screens/customer/SavedCardsScreen';
import AssistantScreen from '../screens/customer/AssistantScreen';
import { COLORS } from '../constants/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const TABS = {
  Home: { label: 'Menu', icon: 'cafe' }, Orders: { label: 'Orders', icon: 'receipt' },
  Reservations: { label: 'Book a table', icon: 'calendar' }, Payments: { label: 'Payments', icon: 'card' }, Profile: { label: 'Profile', icon: 'person' },
};

function TabNavigator() {
  const insets = useSafeAreaInsets();
  return <Tab.Navigator initialRouteName="Home" screenOptions={({ route }) => ({
    headerShown: false,
    sceneStyle: { backgroundColor: COLORS.background },
    tabBarActiveTintColor: COLORS.primary,
    tabBarInactiveTintColor: COLORS.textLight,
    tabBarIcon: ({ focused }) => <View style={[styles.icon, focused && styles.activeIcon]}><Ionicons name={focused ? TABS[route.name].icon : `${TABS[route.name].icon}-outline`} size={22} color={focused ? COLORS.primary : COLORS.textLight} /></View>,
    tabBarLabel: ({ focused }) => <Text numberOfLines={1} style={[styles.label, focused && styles.activeLabel]}>{TABS[route.name].label}</Text>,
    tabBarStyle: [styles.bar, { height: 68 + insets.bottom, paddingBottom: Math.max(8, insets.bottom) }],
    tabBarItemStyle: styles.item,
  })}>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Orders" component={OrderScreen} />
    <Tab.Screen name="Reservations" component={ReservationScreen} />
    <Tab.Screen name="Payments" component={PaymentHistoryScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>;
}

export default function CustomerNavigator() {
  return <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
    <Stack.Screen name="CustomerTabs" component={TabNavigator} />
    <Stack.Screen name="Assistant" component={AssistantScreen} />
    <Stack.Screen name="SavedCards" component={SavedCardsScreen} />
  </Stack.Navigator>;
}

const styles = StyleSheet.create({
  bar: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 8 },
  item: { paddingTop: 0 }, icon: { width: 48, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, activeIcon: { backgroundColor: '#E8EEE6' },
  label: { fontSize: 10, fontWeight: '500', color: COLORS.textLight, marginTop: 4 }, activeLabel: { color: COLORS.primary, fontWeight: '700' },
});
