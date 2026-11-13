import React, { useContext, useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Platform, Animated, Modal, TextInput,
  ActivityIndicator, Image, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ordersAPI, reservationsAPI } from '../../api';
import { Alert } from '../../utils/alert';
import { RADIUS, TOUCH_TARGET } from '../../constants/spacing';
import { FONTS } from '../../constants/typography';
import { SHADOWS } from '../../constants/colors';

const InfoRow = ({ icon, label, value, colors }) => (
  <View style={styles.infoRow}>
    <View style={[styles.iconBox, { backgroundColor: colors.surfaceAlt }]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
    </View>
    <View style={styles.infoContent}>
      <Text style={[styles.infoLabel, { color: colors.textLight }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  </View>
);

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateProfile, deleteAccount } = useContext(AuthContext);
  const { colors, isDark, toggleTheme } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
    address: user?.address || '',
  });
  const [tempAvatar, setTempAvatar] = useState(user?.avatar || null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setTempAvatar(base64Img);
    }
  };

  const handleUpdate = async () => {
    const name = form.name || '';
    const mobile = form.mobile || '';
    const address = form.address || '';

    if (!name.trim() || !mobile.trim() || !address.trim()) {
      Alert.alert('Incomplete details', 'Please fill in your name, mobile, and address.');
      return;
    }

    setUpdating(true);
    try {
      await updateProfile({ ...form, avatar: tempAvatar });
      setIsEditing(false);
      Alert.alert('Profile Saved', 'Your profile details have been updated.');
    } catch (e) {
      Alert.alert('Update failed', e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setUpdating(true);
      const [ordRes, resRes] = await Promise.all([
        ordersAPI.getMyOrders(),
        reservationsAPI.getMyReservations(),
      ]);

      const orders = ordRes.data.data || [];
      const activeOrders = orders.filter((o) => !['Completed', 'Cancelled'].includes(o.status));

      const reservations = resRes.data.data || [];
      const activeRes = reservations.filter((r) => ['Pending', 'Confirmed'].includes(r.status));

      setUpdating(false);

      if (activeOrders.length > 0 || activeRes.length > 0) {
        let msg = 'Please resolve active cafe bookings before deleting:\n';
        if (activeOrders.length > 0) msg += `\n• ${activeOrders.length} active order(s)`;
        if (activeRes.length > 0) msg += `\n• ${activeRes.length} active reservation(s)`;

        Alert.alert('Active Bookings Exist', msg);
        return;
      }

      Alert.alert(
        'Delete Account',
        'Are you sure you want to permanently delete your account? All order history and saved cards will be removed.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Permanently',
            style: 'destructive',
            onPress: async () => {
              try {
                setUpdating(true);
                await deleteAccount();
              } catch (e) {
                setUpdating(false);
                Alert.alert('Cannot Delete', e.message);
              }
            },
          },
        ]
      );
    } catch {
      setUpdating(false);
      Alert.alert('Error', 'Unable to check active bookings. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerSup, { color: colors.accent }]}>YOUR ACCOUNT</Text>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
              Profile & Mood
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
            onPress={() => {
              setForm({
                name: user?.name || '',
                mobile: user?.mobile || '',
                address: user?.address || '',
              });
              setTempAvatar(user?.avatar || null);
              setIsEditing(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit profile details"
          >
            <Ionicons name="create-outline" size={19} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Profile Card Banner */}
        <View style={styles.profileBanner}>
          <View style={[styles.avatarRing, { borderColor: colors.accent }]}>
            <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt }]}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.avatarText, { color: colors.primary, fontFamily: FONTS.serif }]}>
                  {initials}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.userMeta}>
            <Text style={[styles.userName, { color: colors.text, fontFamily: FONTS.serif }]}>
              {user?.name || 'Cafe Patron'}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textLight }]}>{user?.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="sparkles" size={12} color={colors.accent} />
              <Text style={[styles.roleText, { color: colors.accent }]}>
                {user?.role?.toUpperCase() || 'MEMBER'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Theme & Atmosphere Section */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
            Atmosphere
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.divider }, SHADOWS.card.web]}>
            <View style={styles.themeRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.accent} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>Night Cafe Mode</Text>
                <Text style={[styles.infoValueSmall, { color: colors.textLight }]}>
                  {isDark ? 'Dim ambient espresso theme active' : 'Warm daytime cafe theme active'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.divider, true: colors.accent }}
                thumbColor={colors.white}
              />
            </View>
          </View>

          {/* Account Info Section */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
            Contact & Address
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.divider }, SHADOWS.card.web]}>
            <InfoRow icon="person-outline" label="Full Name" value={user?.name || '—'} colors={colors} />
            <View style={[styles.sep, { backgroundColor: colors.divider }]} />
            <InfoRow icon="mail-outline" label="Email" value={user?.email || '—'} colors={colors} />
            <View style={[styles.sep, { backgroundColor: colors.divider }]} />
            <InfoRow icon="call-outline" label="Mobile" value={user?.mobile || '—'} colors={colors} />
            <View style={[styles.sep, { backgroundColor: colors.divider }]} />
            <InfoRow icon="location-outline" label="Delivery Address" value={user?.address || '—'} colors={colors} />
          </View>

          {/* Saved Cards Link */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
            Payment Options
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.divider }, SHADOWS.card.web]}>
            <TouchableOpacity
              style={styles.navRow}
              onPress={() => navigation.navigate('SavedCards')}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="card-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>Saved Payment Cards</Text>
                <Text style={[styles.infoValueSmall, { color: colors.textLight }]}>Manage Visa, Mastercard, and Amex cards</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
              onPress={logout}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Ionicons name="log-out-outline" size={19} color={colors.text} />
              <Text style={[styles.logoutText, { color: colors.text }]}>Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: colors.dangerLight }, updating && { opacity: 0.6 }]}
              onPress={handleDelete}
              activeOpacity={0.8}
              disabled={updating}
              accessibilityRole="button"
            >
              {updating ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={19} color={colors.danger} />
                  <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Delete Account</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditing} animationType="slide" transparent onRequestClose={() => setIsEditing(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
                Edit Profile
              </Text>
              <TouchableOpacity
                onPress={() => setIsEditing(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={20} color={colors.textMid} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Avatar picker */}
              <View style={{ alignItems: 'center', marginBottom: 18 }}>
                <TouchableOpacity onPress={pickImage} style={[styles.avatarPickWrap, { borderColor: colors.divider }]}>
                  {tempAvatar ? (
                    <Image source={{ uri: tempAvatar }} style={styles.pickedAvatar} />
                  ) : (
                    <View style={[styles.pickedAvatarPlaceholder, { backgroundColor: colors.surfaceAlt }]}>
                      <Ionicons name="camera-outline" size={28} color={colors.primary} />
                    </View>
                  )}
                  <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="camera" size={14} color={colors.surface} />
                  </View>
                </TouchableOpacity>
                <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 6, fontFamily: FONTS.sans }}>
                  Tap to change photo
                </Text>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textMid }]}>Full Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider, color: colors.text }]}
                value={form.name}
                onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                placeholder="Your name"
                placeholderTextColor={colors.textLight}
              />

              <Text style={[styles.inputLabel, { color: colors.textMid }]}>Mobile Number</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider, color: colors.text }]}
                value={form.mobile}
                onChangeText={(v) => setForm((p) => ({ ...p, mobile: v }))}
                placeholder="Phone number"
                placeholderTextColor={colors.textLight}
                keyboardType="phone-pad"
              />

              <Text style={[styles.inputLabel, { color: colors.textMid }]}>Delivery Address</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextarea, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider, color: colors.text }]}
                value={form.address}
                onChangeText={(v) => setForm((p) => ({ ...p, address: v }))}
                placeholder="Street and city"
                placeholderTextColor={colors.textLight}
                multiline
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }, updating && { opacity: 0.6 }]}
                onPress={handleUpdate}
                disabled={updating}
                accessibilityRole="button"
              >
                {updating ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={[styles.saveBtnText, { color: colors.surface }]}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerSup: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: FONTS.sans,
    marginBottom: 2,
  },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  editBtn: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
  },
  avatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    padding: 3,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarText: { fontSize: 22, fontWeight: '800' },
  userMeta: { flex: 1 },
  userName: { fontSize: 20, fontWeight: '800' },
  userEmail: { fontSize: 13, marginTop: 2, fontFamily: FONTS.sans },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  roleText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  scroll: {
    padding: 20,
    paddingBottom: 130,
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12, marginTop: 12 },
  card: {
    borderRadius: RADIUS.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: TOUCH_TARGET.min,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: TOUCH_TARGET.min,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', fontFamily: FONTS.sans },
  infoValue: { fontSize: 14, fontWeight: '600', marginTop: 2, fontFamily: FONTS.sans },
  infoValueSmall: { fontSize: 12, marginTop: 2, fontFamily: FONTS.sans },
  sep: { height: 1, marginVertical: 8 },
  actionSection: { gap: 12, marginTop: 16 },
  logoutBtn: {
    minHeight: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.base,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { fontSize: 14, fontWeight: '700', fontFamily: FONTS.sans },
  deleteBtn: {
    minHeight: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '700', fontFamily: FONTS.sans },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: RADIUS.xxl,
    padding: 22,
    width: '90%',
    maxWidth: 460,
    maxHeight: '85%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  closeBtn: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPickWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    position: 'relative',
    borderWidth: 1,
  },
  pickedAvatar: { width: '100%', height: '100%', borderRadius: 40 },
  pickedAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 5, marginTop: 10, fontFamily: FONTS.sans },
  modalInput: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    borderWidth: 1,
    minHeight: TOUCH_TARGET.inputHeight,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  modalTextarea: { height: 72, textAlignVertical: 'top' },
  saveBtn: {
    minHeight: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.base,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', fontFamily: FONTS.sans },
});

export default ProfileScreen;
