import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { FONTS } from '../constants/typography';
import CoffeeLoader from './common/CoffeeLoader';

export default function SplashScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.brandGroup}>
        <Text style={[styles.brand, { color: colors.primary, fontFamily: FONTS.serif }]}>
          Cafe<Text style={{ color: colors.accent }}>Sync</Text>
          <Text style={{ color: colors.copper }}>.</Text>
        </Text>
      </View>

      <CoffeeLoader
        message="A little time for yourself"
        subtext="Preparing your quiet cafe corner…"
        size="normal"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brandGroup: {
    marginBottom: 8,
  },
  brand: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
});
