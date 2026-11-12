import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Platform, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const CartScreen = () => {
  const navigation = useNavigation();
  const scaleAnim = new Animated.Value(0.8);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.iconBg}>
          <Ionicons name="cart-outline" size={50} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Cart & Checkout</Text>
        <Text style={styles.sub}>
          Your cart is managed directly in the{'\n'}
          <Text style={styles.highlight}>Order</Text> tab.{'\n'}
          Add items there and tap the cart button to checkout.
        </Text>
        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Orders')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="cafe-outline" size={20} color={COLORS.white} />
            <Text style={styles.btnText}>Go to Order Menu</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('Payments')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="card-outline" size={18} color={COLORS.textMid} />
            <Text style={styles.secondaryBtnText}>View Payment History</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconBg: {
    width: 100, height: 100, borderRadius: 32,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10 },
      android: { elevation: 4 },
      web: { boxShadow: '0 6px 10px rgba(255,107,53,0.2)' },
    }),
  },
  iconEmoji: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  sub: {
    fontSize: 14, color: COLORS.textLight,
    textAlign: 'center', lineHeight: 22,
  },
  highlight: { color: COLORS.primary, fontWeight: '800' },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 32,
    width: '100%', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10 },
      android: { elevation: 6 },
      web: { boxShadow: '0 6px 10px rgba(255,107,53,0.35)' },
    }),
  },
  btnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  secondaryBtn: {
    borderRadius: 16, paddingVertical: 13, paddingHorizontal: 32,
    width: '100%', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  secondaryBtnText: { color: COLORS.textMid, fontWeight: '700', fontSize: 14 },
});

export default CartScreen;
