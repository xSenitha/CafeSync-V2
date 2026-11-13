import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
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
import FloatingAssistiveAssistant from '../components/common/FloatingAssistiveAssistant';
import { useTheme } from '../context/ThemeContext';
import { FONTS } from '../constants/typography';
import { RADIUS, TOUCH_TARGET } from '../constants/spacing';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TABS = {
  Home:         { label: 'Menu',     icon: 'cafe'     },
  Orders:       { label: 'Orders',   icon: 'receipt'  },
  Reservations: { label: 'Reserve',  icon: 'calendar' },
  Payments:     { label: 'Payments', icon: 'card'     },
  Profile:      { label: 'Profile',  icon: 'person'   },
};

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const tabHeight      = Platform.select({ web: 76, default: Math.max(72, 60 + insets.bottom) });
  const tabPaddingBottom = Platform.select({ web: 14, default: Math.max(12, insets.bottom + 6) });

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarIcon: ({ focused }) => {
          const tab = TABS[route.name];
          return (
            <View
              style={[
                styles.iconWrap,
                focused && [styles.activeIconWrap, { backgroundColor: isDark ? colors.surfaceAlt : colors.surfaceAlt }],
              ]}
            >
              <Ionicons
                name={focused ? tab.icon : `${tab.icon}-outline`}
                size={20}
                color={focused ? (isDark ? colors.accent : colors.primary) : colors.textLight}
              />
            </View>
          );
        },
        tabBarLabel: ({ focused }) => (
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              { color: focused ? (isDark ? colors.accent : colors.primary) : colors.textLight },
              focused && styles.activeLabel,
            ]}
          >
            {TABS[route.name].label}
          </Text>
        ),
        tabBarStyle: [
          styles.bar,
          {
            backgroundColor: colors.surface,
            borderTopColor:  colors.divider,
            height:          tabHeight,
            paddingBottom:   tabPaddingBottom,
          },
        ],
        tabBarItemStyle: styles.item,
      })}
    >
      <Tab.Screen name="Home"         component={HomeScreen}          options={{ tabBarAccessibilityLabel: 'Cafe Menu' }} />
      <Tab.Screen name="Orders"       component={OrderScreen}         options={{ tabBarAccessibilityLabel: 'My Orders' }} />
      <Tab.Screen name="Reservations" component={ReservationScreen}   options={{ tabBarAccessibilityLabel: 'Table Reservations' }} />
      <Tab.Screen name="Payments"     component={PaymentHistoryScreen} options={{ tabBarAccessibilityLabel: 'Payment History' }} />
      <Tab.Screen name="Profile"      component={ProfileScreen}        options={{ tabBarAccessibilityLabel: 'User Profile' }} />
    </Tab.Navigator>
  );
}

// CustomerTabsScreen renders ONLY the tab navigator — no floating orb here.
// The orb lives at the CustomerNavigator level so it's never clipped by a Screen.
function CustomerTabsScreen() {
  return <TabNavigator />;
}

export default function CustomerNavigator() {
  const { colors } = useTheme();

  return (
    /*
     * Root wrapper View so the Stack and the floating orb share the same
     * parent coordinate space. The Stack fills flex:1; the orb is
     * absolutely positioned on top via styles.orbLayer (absoluteFill +
     * pointerEvents="box-none"), so it overlays everything without
     * blocking any touches to the Stack content below it.
     */
    <View style={styles.root}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="CustomerTabs" component={CustomerTabsScreen} />
        <Stack.Screen name="Assistant"    component={AssistantScreen} />
        <Stack.Screen name="SavedCards"   component={SavedCardsScreen} />
      </Stack.Navigator>

      {/*
       * Floating orb — rendered AFTER the Stack so it paints on top in
       * native z-order. The wrapper has pointerEvents="box-none" so only
       * the orb itself (and the popup card it creates) captures touches.
       * Everything else passes through to the Stack screens normally.
       */}
      <View style={styles.orbLayer} pointerEvents="box-none">
        <FloatingAssistiveAssistant />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  orbLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  bar: {
    borderTopWidth: 1,
    paddingTop: 6,
    overflow: 'visible',
    ...Platform.select({
      ios:     { shadowColor: '#2B1810', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 10 },
      web:     { boxShadow: '0 -4px 16px rgba(43,24,16,0.05)' },
    }),
  },
  item: {
    paddingTop: 2, paddingBottom: 2,
    justifyContent: 'center', alignItems: 'center',
    minHeight: TOUCH_TARGET.min,
  },
  iconWrap:   { width: 38, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md },
  activeIconWrap: { borderRadius: RADIUS.md },
  label: {
    fontSize: 11, lineHeight: 14, fontWeight: '500',
    fontFamily: FONTS.sans, marginTop: 2, textAlign: 'center',
  },
  activeLabel: { fontWeight: '700' },
});
