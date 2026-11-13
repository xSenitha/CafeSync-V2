import React, { useContext, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AuthShell from '../../components/auth/AuthShell';
import AuthField from '../../components/auth/AuthField';
import { styles } from './LoginScreen';
import { SHADOWS } from '../../constants/colors';

export default function RegisterScreen({ navigation }) {
  const { register } = useContext(AuthContext);
  const { colors } = useTheme();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', address: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  const update = (key) => (value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setError('');
  };

  const submit = async () => {
    if (pending.current) return;
    if (Object.values(form).some((value) => !value.trim())) {
      setError('Please complete all fields to create your account.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must have at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Your passwords do not match.');
      return;
    }
    pending.current = true;
    setLoading(true);
    setError('');
    try {
      await register(form.name.trim(), form.email.trim(), form.password, form.address.trim(), form.mobile.trim());
    } catch (err) {
      setError(err.message || 'Unable to create your account. Please try again.');
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Make yourself at home"
      subtitle="Create an account to order fresh roasts, book quiet tables, and save your favorites."
    >
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => navigation.goBack()}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, minHeight: 44 }}
      >
        <Ionicons name="arrow-back" size={17} color={colors.primary} />
        <Text style={[styles.outlineText, { color: colors.primary }]}>Back to sign in</Text>
      </TouchableOpacity>

      {!!error && (
        <View
          accessibilityRole="alert"
          style={[styles.error, { backgroundColor: colors.dangerLight, borderColor: colors.danger + '40' }]}
        >
          <Ionicons name="alert-circle" size={20} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}

      <AuthField
        label="Full name"
        icon="person-outline"
        placeholder="Your name"
        autoCapitalize="words"
        autoComplete="name"
        value={form.name}
        onChangeText={update('name')}
      />
      <AuthField
        label="Email address"
        icon="mail-outline"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
        value={form.email}
        onChangeText={update('email')}
      />
      <AuthField
        label="Mobile number"
        icon="call-outline"
        placeholder="Your phone number"
        keyboardType="phone-pad"
        autoComplete="tel"
        value={form.mobile}
        onChangeText={update('mobile')}
      />
      <AuthField
        label="Delivery address"
        icon="location-outline"
        placeholder="Street and city"
        autoCapitalize="sentences"
        autoComplete="street-address"
        value={form.address}
        onChangeText={update('address')}
      />
      <AuthField
        label="Password"
        icon="lock-closed-outline"
        placeholder="At least 6 characters"
        secureTextEntry
        autoComplete="new-password"
        value={form.password}
        onChangeText={update('password')}
      />
      <AuthField
        label="Confirm password"
        icon="shield-checkmark-outline"
        placeholder="Enter password again"
        secureTextEntry
        autoComplete="new-password"
        value={form.confirm}
        onChangeText={update('confirm')}
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <TouchableOpacity
        accessibilityRole="button"
        disabled={loading}
        accessibilityState={{ disabled: loading, busy: loading }}
        onPress={submit}
        activeOpacity={0.85}
        style={[
          styles.button,
          { backgroundColor: colors.primary },
          SHADOWS.subtle.web,
          loading && { opacity: 0.65 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.surface} size="small" />
        ) : (
          <>
            <Text style={[styles.buttonText, { color: colors.surface }]}>Create account</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.surface} />
          </>
        )}
      </TouchableOpacity>
    </AuthShell>
  );
}
