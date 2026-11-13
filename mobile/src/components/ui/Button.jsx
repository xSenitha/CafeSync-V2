import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SHADOWS } from '../../constants/colors';
import { RADIUS, TOUCH_TARGET } from '../../constants/spacing';
import { FONTS } from '../../constants/typography';

const Button = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'accent' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon,
  style,
  textStyle,
  accessibilityLabel,
  ...props
}) => {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);

  const getBackgroundColor = () => {
    if (disabled) return colors.divider;
    if (variant === 'secondary') return colors.surfaceAlt;
    if (variant === 'outline' || variant === 'ghost') return 'transparent';
    if (variant === 'accent') return colors.accent;
    return colors.primary;
  };

  const getTextColor = () => {
    if (disabled) return colors.textLight;
    if (variant === 'secondary') return colors.text;
    if (variant === 'outline') return colors.primary;
    if (variant === 'ghost') return colors.primary;
    if (variant === 'accent') return colors.white;
    return colors.surface; // White in light mode, dark espresso in dark mode
  };

  const getBorderColor = () => {
    if (disabled) return colors.divider;
    if (variant === 'outline') return colors.primary;
    if (variant === 'secondary') return colors.divider;
    return 'transparent';
  };

  const isOutline = variant === 'outline';
  const minHeight = size === 'sm' ? 44 : size === 'lg' ? 56 : TOUCH_TARGET.buttonHeight;
  const paddingHorizontal = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      activeOpacity={0.88}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.button,
        {
          minHeight,
          paddingHorizontal,
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: isOutline ? 1.5 : variant === 'secondary' ? 1 : 0,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        variant === 'primary' && !disabled && SHADOWS.subtle.web,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 15,
                fontFamily: FONTS.sans,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.base,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#2B1810',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  disabled: {
    opacity: 0.55,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
      web: { boxShadow: 'none' },
    }),
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default Button;
