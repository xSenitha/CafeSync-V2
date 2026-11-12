import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function SplashScreen() {
  return <View style={styles.screen}>
    <View style={styles.icon}><Ionicons name="cafe-outline" size={42} color={COLORS.primary} /></View>
    <Text style={styles.brand}>CafeSync.</Text>
    <Text style={styles.caption}>A little time for yourself.</Text>
    <ActivityIndicator accessibilityLabel="Loading CafeSync" color={COLORS.primary} style={{ marginTop: 28 }} />
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }, icon: { width: 88, height: 88, borderRadius: 28, backgroundColor: '#E8EEE6', alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  brand: { fontSize: 32, fontWeight: '800', letterSpacing: -1.2, color: COLORS.primary }, caption: { fontSize: 14, color: COLORS.textLight, marginTop: 10 },
});
