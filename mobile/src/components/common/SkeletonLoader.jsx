import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../constants/spacing';

export function SkeletonBox({ width, height, borderRadius = RADIUS.sm, style }) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceAlt,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

export function MenuCardSkeleton({ width }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.menuCard, { width, backgroundColor: colors.surface, borderColor: colors.divider }]}>
      <SkeletonBox width="100%" height={140} borderRadius={0} />
      <View style={styles.cardBody}>
        <SkeletonBox width="40%" height={12} style={{ marginBottom: 8 }} />
        <SkeletonBox width="80%" height={16} style={{ marginBottom: 6 }} />
        <SkeletonBox width="60%" height={12} style={{ marginBottom: 16 }} />
        <View style={styles.cardFooter}>
          <SkeletonBox width="50%" height={18} />
          <SkeletonBox width={44} height={44} borderRadius={14} />
        </View>
      </View>
    </View>
  );
}

export function OrderCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
        <SkeletonBox width={100} height={20} />
        <SkeletonBox width={70} height={24} borderRadius={RADIUS.full} />
      </View>
      <SkeletonBox width="60%" height={16} style={{ marginBottom: 12 }} />
      <SkeletonBox width="90%" height={12} style={{ marginBottom: 8 }} />
      <SkeletonBox width="100%" height={8} borderRadius={4} style={{ marginVertical: 12 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <SkeletonBox width={80} height={14} />
        <SkeletonBox width={90} height={20} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardBody: {
    padding: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderCard: {
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
});

