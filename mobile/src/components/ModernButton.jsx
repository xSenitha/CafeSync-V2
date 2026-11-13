import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, TOUCH_TARGET } from '../constants/spacing';
import { FONTS } from '../constants/typography';
import { SHADOWS } from '../constants/colors';

const ModernButton = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return colors.divider;
    if (variant === 'secondary') return colors.surfaceAlt;
    if (variant === 'outline') return 'transparent';
    if (variant === 'accent') return colors.accent;
    return colors.primary;
  };

  const getTextColor = () => {
    if (disabled) return colors.textLight;
    if (variant === 'outline') return colors.primary;
    if (variant === 'secondary') return colors.text;
    if (variant === 'accent') return colors.white;
    return colors.surface;
  };

  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: isOutline ? colors.primary : colors.divider,
          borderWidth: isOutline ? 1.5 : variant === 'secondary' ? 1 : 0,
        },
        variant === 'primary' && !disabled && SHADOWS.subtle.web,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text style={[styles.text, { color: getTextColor(), fontFamily: FONTS.sans }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.base,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 8,
    flexDirection: 'row',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#2B1810',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default ModernButton;
