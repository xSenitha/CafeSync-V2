import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function AuthField({ label, icon, secureTextEntry, ...props }) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.box, focused && styles.focused]}>
      <Ionicons name={icon} size={19} color={focused ? COLORS.primary : COLORS.textLight} />
      <TextInput accessibilityLabel={label} placeholderTextColor={COLORS.textLight} style={styles.input} autoCapitalize="none" autoCorrect={false} {...props} secureTextEntry={secureTextEntry && !visible} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      {secureTextEntry && <TouchableOpacity accessibilityRole="button" accessibilityLabel={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} onPress={() => setVisible(!visible)} style={styles.eye}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMid} /></TouchableOpacity>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  field: { marginBottom: 18 }, label: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, borderRadius: 12, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: '#FCFBF8', paddingHorizontal: 14 }, focused: { borderColor: COLORS.primary, backgroundColor: COLORS.white },
  input: { flex: 1, minWidth: 0, color: COLORS.text, fontSize: 15, paddingVertical: 14 }, eye: { minWidth: 30, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
});
