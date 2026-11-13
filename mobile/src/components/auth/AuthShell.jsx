import React from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { FONTS } from '../../constants/typography';
import { RADIUS } from '../../constants/spacing';
import { SHADOWS } from '../../constants/colors';

export default function AuthShell({ title, subtitle, children }) {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const wide = width >= 900;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.layout, wide && styles.wide]}>
            <View style={[styles.story, wide && styles.storyWide]}>
              <View style={styles.brand}>
                <View style={[styles.brandMark, { backgroundColor: isDark ? colors.surfaceAlt : colors.primary }]}>
                  <Ionicons name="cafe" size={22} color={isDark ? colors.accent : colors.surface} />
                </View>
                <Text style={[styles.brandName, { color: colors.text, fontFamily: FONTS.serif }]}>
                  Cafe<Text style={{ color: colors.accent }}>Sync</Text>
                  <Text style={{ color: colors.copper }}>.</Text>
                </Text>
              </View>

              <Text style={[styles.eyebrow, { color: colors.accent }]}>A LITTLE TIME FOR YOURSELF</Text>

              <Text style={[styles.headline, { color: colors.text, fontFamily: FONTS.serif }, wide && styles.headlineWide]}>
                Slow down.{'\n'}Savor the moment.
              </Text>

              <Text style={[styles.description, { color: colors.textMid }]}>
                A cozy sanctuary for your daily ritual. Discover crafted roasts, reserve your favorite quiet corner, and make a little time for yourself.
              </Text>

              {wide && (
                <View style={styles.features}>
                  {[
                    ['cafe-outline', 'A menu worth savoring', 'Artisanal roasts and freshly baked treats.'],
                    ['sparkles-outline', 'A gentle companion', 'Helpful menu suggestions suited to your mood.'],
                    ['calendar-outline', 'Save your seat', 'Reserve a peaceful table before you arrive.'],
                  ].map(([icon, label, detail]) => (
                    <View key={label} style={styles.feature}>
                      <View style={[styles.featureIcon, { backgroundColor: colors.surfaceAlt }]}>
                        <Ionicons name={icon} size={20} color={colors.primary} />
                      </View>
                      <View style={styles.fill}>
                        <Text style={[styles.featureTitle, { color: colors.text }]}>{label}</Text>
                        <Text style={[styles.featureDetail, { color: colors.textLight }]}>{detail}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.note}>
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.noteText, { color: colors.textLight }]}>A quiet cafe moment awaits</Text>
              </View>
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.divider },
                SHADOWS.card.web,
                wide && styles.cardWide,
              ]}
            >
              <Text accessibilityRole="header" style={[styles.title, { color: colors.text, fontFamily: FONTS.serif }]}>
                {title}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMid }]}>{subtitle}</Text>
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingVertical: 32,
  },
  layout: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    gap: 28,
  },
  wide: {
    maxWidth: 1100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 72,
  },
  story: { gap: 14 },
  storyWide: { flex: 1, paddingVertical: 24 },
  brand: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    fontFamily: FONTS.sans,
  },
  headline: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.2,
    fontWeight: '700',
  },
  headlineWide: {
    fontSize: 52,
    lineHeight: 58,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 420,
    fontFamily: FONTS.sans,
  },
  features: {
    gap: 18,
    marginTop: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontWeight: '700',
    fontSize: 14,
    fontFamily: FONTS.sans,
  },
  featureDetail: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: FONTS.sans,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  noteText: {
    fontSize: 12,
    fontFamily: FONTS.sans,
  },
  card: {
    padding: 24,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
  },
  cardWide: {
    width: 440,
    padding: 36,
  },
  title: {
    fontSize: 24,
    letterSpacing: -0.5,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 24,
    fontFamily: FONTS.sans,
  },
});
