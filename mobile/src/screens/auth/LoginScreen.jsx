import React, { useContext, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AuthShell from '../../components/auth/AuthShell';
import AuthField from '../../components/auth/AuthField';
import { RADIUS, TOUCH_TARGET } from '../../constants/spacing';
import { FONTS } from '../../constants/typography';
import { SHADOWS } from '../../constants/colors';

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  const handleLogin = async () => {
    if (pending.current) return;
    if (!email.trim() || !password) {
      setError('Please enter your email and password to continue.');
      return;
    }
    pending.current = true;
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please check your credentials.');
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Take a breath, sign in, and enjoy your quiet cafe corner."
    >
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
        label="Email address"
        icon="mail-outline"
        placeholder="you@example.com"
        value={email}
        keyboardType="email-address"
        autoComplete="email"
        onChangeText={(v) => {
          setEmail(v);
          setError('');
        }}
      />

      <AuthField
        label="Password"
        icon="lock-closed-outline"
        placeholder="Enter your password"
        value={password}
        secureTextEntry
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
        onChangeText={(v) => {
          setPassword(v);
          setError('');
        }}
      />

      <TouchableOpacity
        accessibilityRole="button"
        disabled={loading}
        accessibilityState={{ disabled: loading, busy: loading }}
        onPress={handleLogin}
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
            <Text style={[styles.buttonText, { color: colors.surface }]}>Sign in</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.surface} />
          </>
        )}
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <Text style={[styles.footer, { color: colors.textLight }]}>New to the cafe?</Text>

      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => navigation.navigate('Register')}
        style={[styles.outline, { borderColor: colors.divider, backgroundColor: colors.surfaceAlt }]}
        activeOpacity={0.8}
      >
        <Text style={[styles.outlineText, { color: colors.primary }]}>Create an account</Text>
      </TouchableOpacity>
    </AuthShell>
  );
}

export const styles = StyleSheet.create({
  error: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.sans,
    fontWeight: '500',
  },
  button: {
    minHeight: TOUCH_TARGET.largeButton,
    borderRadius: RADIUS.base,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONTS.sans,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 10,
    fontFamily: FONTS.sans,
  },
  outline: {
    minHeight: TOUCH_TARGET.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.base,
    borderWidth: 1,
  },
  outlineText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONTS.sans,
  },
});
