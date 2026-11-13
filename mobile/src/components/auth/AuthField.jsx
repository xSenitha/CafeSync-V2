import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, TOUCH_TARGET } from '../../constants/spacing';
import { FONTS } from '../../constants/typography';

export default function AuthField({ label, icon, secureTextEntry, ...props }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text, fontFamily: FONTS.sans }]}>{label}</Text>
      <View
        style={[
          styles.box,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: focused ? colors.primary : colors.divider,
            borderWidth: focused ? 1.5 : 1,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={focused ? colors.primary : colors.textLight}
          style={styles.icon}
        />
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textLight}
          style={[styles.input, { color: colors.text, fontFamily: FONTS.sans }]}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
          secureTextEntry={secureTextEntry && !visible}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            onPress={() => setVisible(!visible)}
            style={styles.eye}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMid}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.1 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH_TARGET.inputHeight,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }),
  },
  icon: { marginRight: 10 },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    paddingVertical: 12,
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }),
  },
  eye: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
