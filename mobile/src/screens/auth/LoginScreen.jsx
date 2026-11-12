import React, { useContext, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import AuthShell from '../../components/auth/AuthShell';
import AuthField from '../../components/auth/AuthField';
import { COLORS } from '../../constants/colors';

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const handleLogin = async () => {
    if (pending.current) return;
    if (!email.trim() || !password) { setError('Enter your email and password to continue.'); return; }
    pending.current = true; setLoading(true); setError('');
    try { await login(email.trim(), password); }
    catch (err) { setError(err.message || 'Unable to sign in. Please try again.'); }
    finally { pending.current = false; setLoading(false); }
  };
  return <AuthShell title="Welcome back" subtitle="Your next favourite is waiting. Sign in to CafeSync.">
    {!!error && <View accessibilityRole="alert" style={styles.error}><Ionicons name="alert-circle-outline" size={20} color={COLORS.danger} /><Text style={styles.errorText}>{error}</Text></View>}
    <AuthField label="Email address" icon="mail-outline" placeholder="you@example.com" value={email} keyboardType="email-address" autoComplete="email" onChangeText={v => { setEmail(v); setError(''); }} />
    <AuthField label="Password" icon="lock-closed-outline" placeholder="Enter your password" value={password} secureTextEntry autoComplete="current-password" returnKeyType="go" onSubmitEditing={handleLogin} onChangeText={v => { setPassword(v); setError(''); }} />
    <TouchableOpacity accessibilityRole="button" disabled={loading} accessibilityState={{ disabled: loading, busy: loading }} onPress={handleLogin} activeOpacity={0.8} style={[styles.button, loading && { opacity: 0.65 }]}>{loading ? <ActivityIndicator color={COLORS.white} /> : <><Text style={styles.buttonText}>Sign in</Text><Ionicons name="arrow-forward" size={18} color={COLORS.white} /></>}</TouchableOpacity>
    <View style={styles.divider} />
    <Text style={styles.footer}>New to the cafe?</Text>
    <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Register')} style={styles.outline}><Text style={styles.outlineText}>Create an account</Text></TouchableOpacity>
  </AuthShell>;
}

export const styles = StyleSheet.create({
  error: { flexDirection: 'row', gap: 10, backgroundColor: COLORS.dangerLight, padding: 12, borderRadius: 10, marginBottom: 20 }, errorText: { color: '#A42D2D', flex: 1, fontSize: 13, lineHeight: 20 },
  button: { minHeight: 54, backgroundColor: COLORS.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, marginTop: 6 }, buttonText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: 24 }, footer: { color: COLORS.textLight, textAlign: 'center', fontSize: 13, marginBottom: 12 },
  outline: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: COLORS.divider }, outlineText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
});
