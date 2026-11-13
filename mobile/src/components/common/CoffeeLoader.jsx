import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { FONTS } from '../../constants/typography';

export default function CoffeeLoader({
  message = 'Brewing a little moment for you…',
  subtext = 'A little time for yourself',
  size = 'normal', // 'compact' | 'normal' | 'large'
}) {
  const { colors } = useTheme();

  // Steam animation values
  const steam1 = useRef(new Animated.Value(0)).current;
  const steam2 = useRef(new Animated.Value(0)).current;
  const steam3 = useRef(new Animated.Value(0)).current;
  const cupBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Check if user prefers reduced motion on web
    const prefersReducedMotion =
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    const animateSteam = (anim, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const s1 = animateSteam(steam1, 0);
    const s2 = animateSteam(steam2, 400);
    const s3 = animateSteam(steam3, 800);

    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(cupBounce, {
          toValue: -3,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(cupBounce, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    s1.start();
    s2.start();
    s3.start();
    bounce.start();

    return () => {
      s1.stop();
      s2.stop();
      s3.stop();
      bounce.stop();
    };
  }, [steam1, steam2, steam3, cupBounce]);

  const steamStyle = (anim, shiftX) => ({
    opacity: anim.interpolate({
      inputRange: [0, 0.4, 0.8, 1],
      outputRange: [0, 0.75, 0.35, 0],
    }),
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -22],
        }),
      },
      {
        translateX: anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [shiftX, shiftX + 3, shiftX - 2],
        }),
      },
    ],
  });

  const isCompact = size === 'compact';

  return (
    <View style={[styles.container, isCompact && styles.containerCompact]} accessibilityRole="progressbar" accessibilityLabel={message}>
      <View style={styles.artArea}>
        {/* Steam waves */}
        <Animated.View style={[styles.steamWave, steamStyle(steam1, -8), { backgroundColor: colors.accent }]} />
        <Animated.View style={[styles.steamWave, steamStyle(steam2, 0), { backgroundColor: colors.copper }]} />
        <Animated.View style={[styles.steamWave, steamStyle(steam3, 8), { backgroundColor: colors.accent }]} />

        {/* Coffee Cup */}
        <Animated.View style={[styles.cupWrap, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }, { transform: [{ translateY: cupBounce }] }]}>
          <Ionicons name="cafe" size={isCompact ? 28 : 36} color={colors.primary} />
        </Animated.View>
      </View>

      <Text style={[styles.message, { color: colors.text, fontFamily: FONTS.serif }]}>{message}</Text>
      {!!subtext && <Text style={[styles.subtext, { color: colors.textLight }]}>{subtext}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerCompact: {
    paddingVertical: 18,
  },
  artArea: {
    width: 80,
    height: 72,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  steamWave: {
    position: 'absolute',
    top: 6,
    width: 3.5,
    height: 14,
    borderRadius: 2,
    opacity: 0,
  },
  cupWrap: {
    width: 58,
    height: 52,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

