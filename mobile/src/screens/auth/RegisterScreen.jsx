import React, { useContext, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import AuthShell from '../../components/auth/AuthShell';
import AuthField from '../../components/auth/AuthField';
import { COLORS } from '../../constants/colors';
import { styles } from './LoginScreen';

export default function RegisterScreen({ navigation }) {
  const { register } = useContext(AuthContext);
  const [form, setForm] = useState({ name: '', email: '', mobile: '', address: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const update = key => value => { setForm(previous => ({ ...previous, [key]: value })); setError(''); };
  const submit = async () => {
    if (pending.current) return;
    if (Object.values(form).some(value => !value.trim())) { setError('Complete all fields to create your account.'); return; }
    if (form.password.length < 6) { setError('Use a password with at least 6 characters.'); return; }
    if (form.password !== form.confirm) { setError('Your passwords do not match.'); return; }
    pending.current = true; setLoading(true); setError('');
    try { await register(form.name.trim(), form.email.trim(), form.password, form.address.trim(), form.mobile.trim()); }
    catch (err) { setError(err.message || 'Unable to create your account. Please try again.'); }
    finally { pending.current = false; setLoading(false); }
  };
  return <AuthShell title="Make yourself at home" subtitle="Create an account for orders, reservations, and a little help choosing.">
    <TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 22, minHeight: 32 }}><Ionicons name="arrow-back" size={17} color={COLORS.primary} /><Text style={styles.outlineText}>Back to sign in</Text></TouchableOpacity>
    {!!error && <View accessibilityRole="alert" style={styles.error}><Ionicons name="alert-circle-outline" size={20} color={COLORS.danger} /><Text style={styles.errorText}>{error}</Text></View>}
    <AuthField label="Full name" icon="person-outline" placeholder="Your name" autoCapitalize="words" autoComplete="name" value={form.name} onChangeText={update('name')} />
    <AuthField label="Email address" icon="mail-outline" placeholder="you@example.com" keyboardType="email-address" autoComplete="email" value={form.email} onChangeText={update('email')} />
    <AuthField label="Mobile number" icon="call-outline" placeholder="Your phone number" keyboardType="phone-pad" autoComplete="tel" value={form.mobile} onChangeText={update('mobile')} />
    <AuthField label="Delivery address" icon="location-outline" placeholder="Street and city" autoCapitalize="sentences" autoComplete="street-address" value={form.address} onChangeText={update('address')} />
    <AuthField label="Password" icon="lock-closed-outline" placeholder="At least 6 characters" secureTextEntry autoComplete="new-password" value={form.password} onChangeText={update('password')} />
    <AuthField label="Confirm password" icon="shield-checkmark-outline" placeholder="Enter password again" secureTextEntry autoComplete="new-password" value={form.confirm} onChangeText={update('confirm')} returnKeyType="go" onSubmitEditing={submit} />
    <TouchableOpacity accessibilityRole="button" disabled={loading} accessibilityState={{ disabled: loading, busy: loading }} onPress={submit} activeOpacity={0.8} style={[styles.button, loading && { opacity: 0.65 }]}>{loading ? <ActivityIndicator color={COLORS.white} /> : <><Text style={styles.buttonText}>Create account</Text><Ionicons name="arrow-forward" size={18} color={COLORS.white} /></>}</TouchableOpacity>
  </AuthShell>;
}
