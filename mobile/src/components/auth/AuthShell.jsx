import React from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function AuthShell({ title, subtitle, children }) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.layout, wide && styles.wide]}>
            <View style={[styles.story, wide && styles.storyWide]}>
              <View style={styles.brand}><Ionicons name="cafe-outline" size={26} color={COLORS.primary} /><Text style={styles.brandName}>CafeSync<Text style={styles.brandDot}>.</Text></Text></View>
              <Text style={styles.eyebrow}>YOUR EVERYDAY CAFE COMPANION</Text>
              <Text style={[styles.headline, wide && styles.headlineWide]}>Good coffee.{ '\n' }Great company.</Text>
              <Text style={styles.description}>Find your next favourite, order at your own pace, and make a little time for yourself.</Text>
              {wide && <View style={styles.features}>
                {[[ 'cafe-outline', 'A menu worth exploring', 'Your favourites, all in one place.' ], [ 'sparkles-outline', 'A little help choosing', 'Ask your cafe assistant for ideas.' ], [ 'calendar-outline', 'Save yourself a seat', 'Plan your next cafe visit.' ]].map(([icon, label, detail]) => <View key={label} style={styles.feature}><View style={styles.featureIcon}><Ionicons name={icon} size={22} color={COLORS.primary} /></View><View style={styles.fill}><Text style={styles.featureTitle}>{label}</Text><Text style={styles.featureDetail}>{detail}</Text></View></View>)}
              </View>}
              <View style={styles.note}><View style={styles.dot} /><Text style={styles.noteText}>A better cafe day starts here</Text></View>
            </View>
            <View style={[styles.card, wide && styles.cardWide]}>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 }, safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 32 },
  layout: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 28 }, wide: { maxWidth: 1120, flexDirection: 'row', alignItems: 'center', gap: 80 },
  story: { gap: 16 }, storyWide: { flex: 1, paddingVertical: 36 },
  brand: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 18 }, brandName: { fontSize: 26, fontWeight: '800', color: COLORS.primary, letterSpacing: -1 }, brandDot: { color: COLORS.copper },
  eyebrow: { fontSize: 10, letterSpacing: 2, fontWeight: '700', color: COLORS.accent },
  headline: { fontSize: 38, lineHeight: 43, letterSpacing: -1.8, fontWeight: '700', color: COLORS.text, fontFamily: Platform.select({ ios: 'Georgia', web: 'Georgia, serif', default: 'serif' }) }, headlineWide: { fontSize: 60, lineHeight: 66 },
  description: { fontSize: 15, lineHeight: 24, color: COLORS.textMid, maxWidth: 390 },
  features: { gap: 22, marginTop: 24 }, feature: { flexDirection: 'row', alignItems: 'center', gap: 14 }, featureIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E6EBE0', alignItems: 'center', justifyContent: 'center' }, featureTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 }, featureDetail: { color: COLORS.textLight, fontSize: 13, marginTop: 4 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.copper }, noteText: { color: COLORS.textLight, fontSize: 12 },
  card: { backgroundColor: COLORS.surface, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: COLORS.divider }, cardWide: { width: 440, padding: 36 },
  title: { fontSize: 26, letterSpacing: -0.7, fontWeight: '700', color: COLORS.text }, subtitle: { fontSize: 14, lineHeight: 22, color: COLORS.textLight, marginTop: 8, marginBottom: 26 },
});
