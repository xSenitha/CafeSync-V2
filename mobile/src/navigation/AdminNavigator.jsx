import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/admin/DashboardScreen';
import OrderManagementScreen from '../screens/admin/OrderManagementScreen';
import InventoryScreen from '../screens/admin/InventoryScreen';
import TableManagementScreen from '../screens/admin/TableManagementScreen';
import PaymentManagementScreen from '../screens/admin/PaymentManagementScreen';
import { COLORS } from '../constants/colors';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Dashboard: { icon: 'stats-chart', activeColor: COLORS.secondary },
  Orders: { icon: 'cart', activeColor: COLORS.primary },
  Inventory: { icon: 'restaurant', activeColor: COLORS.warning },
  Tables: { icon: 'grid', activeColor: COLORS.secondaryLight },
  Payments: { icon: 'card', activeColor: COLORS.accent },
};

const TabIcon = ({ name, focused }) => {
  const config = TAB_CONFIG[name];
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: config.activeColor + '18' }]}>
      <Ionicons 
        name={focused ? config.icon : `${config.icon}-outline`} 
        size={20} 
        color={focused ? config.activeColor : COLORS.textLight} 
      />
    </View>
  );
};

const AdminNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarLabel: ({ focused }) => (
          <Text style={[styles.tabLabel, focused && { color: TAB_CONFIG[route.name]?.activeColor, fontWeight: '700' }]}>
            {route.name}
          </Text>
        ),
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
      })}
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
    backgroundColor: COLORS.surface,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 85 : 68,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 14 },
      android: { elevation: 14 },
      web: { boxShadow: '0 -4px 14px rgba(0,0,0,0.1)' },
    }),
  },
  tabItem: { paddingTop: 4 },
  iconWrap: {
    width: 40, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  iconEmoji: { fontSize: 20 },
  tabLabel: {
    fontSize: 9, fontWeight: '600', color: COLORS.textLight, marginTop: 2,
  },
});

export default AdminNavigator;
