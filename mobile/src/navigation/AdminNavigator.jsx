import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/admin/DashboardScreen';
import OrderManagementScreen from '../screens/admin/OrderManagementScreen';
import InventoryScreen from '../screens/admin/InventoryScreen';
import TableManagementScreen from '../screens/admin/TableManagementScreen';
import PaymentManagementScreen from '../screens/admin/PaymentManagementScreen';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, TOUCH_TARGET } from '../constants/spacing';
import { FONTS } from '../constants/typography';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Dashboard: { icon: 'stats-chart', key: 'secondary' },
  Orders: { icon: 'cart', key: 'primary' },
  Inventory: { icon: 'restaurant', key: 'warning' },
  Tables: { icon: 'grid', key: 'secondaryLight' },
  Payments: { icon: 'card', key: 'accent' },
};

const TabIcon = ({ name, focused, colors }) => {
  const config = TAB_CONFIG[name];
  const activeColor = colors[config.key] || colors.primary;
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: colors.surfaceAlt }]}>
      <Ionicons
        name={focused ? config.icon : `${config.icon}-outline`}
        size={20}
        color={focused ? activeColor : colors.textLight}
      />
    </View>
  );
};

const AdminNavigator = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const config = TAB_CONFIG[route.name];
        const activeColor = colors[config.key] || colors.primary;
        return {
          tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} colors={colors} />,
          tabBarLabel: ({ focused }) => (
            <Text
              style={[
                styles.tabLabel,
                { color: focused ? activeColor : colors.textLight },
                focused && { fontWeight: '700' },
              ]}
            >
              {route.name}
            </Text>
          ),
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.divider,
              height: Math.max(64, 58 + insets.bottom),
              paddingBottom: Math.max(8, insets.bottom),
            },
          ],
          tabBarItemStyle: styles.tabItem,
        };
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Orders" component={OrderManagementScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Tables" component={TableManagementScreen} />
      <Tab.Screen name="Payments" component={PaymentManagementScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    paddingTop: 8,
    ...Platform.select({
      ios: { shadowColor: '#2B1810', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 10 },
      web: { boxShadow: '0 -4px 16px rgba(43, 24, 16, 0.05)' },
    }),
  },
  tabItem: {
    paddingTop: 2,
    minHeight: TOUCH_TARGET.min,
  },
  iconWrap: {
    width: 42,
    height: 30,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    fontFamily: FONTS.sans,
  },
});

export default AdminNavigator;
