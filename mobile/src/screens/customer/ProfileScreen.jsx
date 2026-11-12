import React, { useContext, useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Platform, Animated, Modal, TextInput,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';
import { ordersAPI, reservationsAPI } from '../../api';

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.iconBox}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateProfile, deleteAccount } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
    address: user?.address || '',
  });
  const [tempAvatar, setTempAvatar] = useState(user?.avatar || null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

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
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setUpdating(true);
    try {
      await updateProfile({ ...form, avatar: tempAvatar });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setUpdating(true); // Re-use updating state for loading indicator
      // First check for active orders and reservations on the frontend
      const [ordRes, resRes] = await Promise.all([
        ordersAPI.getMyOrders(),
        reservationsAPI.getMyReservations()
      ]);
      
      const orders = ordRes.data.data || [];
      const activeOrders = orders.filter(o => !['Completed', 'Cancelled'].includes(o.status));
      
      const reservations = resRes.data.data || [];
      const activeRes = reservations.filter(r => ['Pending', 'Confirmed'].includes(r.status));
      
      setUpdating(false);

      if (activeOrders.length > 0 || activeRes.length > 0) {
        let msg = 'Please resolve the following before deleting your account:\n';
        if (activeOrders.length > 0) msg += `\n• ${activeOrders.length} active order(s)`;
        if (activeRes.length > 0) msg += `\n• ${activeRes.length} active reservation(s)`;
        
        Alert.alert('Action Required', msg);
        return;
      }

      // Proceed with deletion confirmation
      Alert.alert(
        'Delete Account',
        'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.',
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
            }
          },
        ]
      );
    } catch (e) {
      setUpdating(false);
      Alert.alert('Error', 'Failed to verify account status. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCircle1} />
        <View style={styles.headerCircle2} />

        <TouchableOpacity 
          style={styles.editBtn} 
          onPress={() => {
            setForm({ 
              name: user?.name || '', 
              mobile: user?.mobile || '', 
              address: user?.address || '' 
            });
            setTempAvatar(user?.avatar || null);
            setIsEditing(true);
          }}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.white} />
        </TouchableOpacity>

        <Animated.View style={[styles.avatarWrap, { transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <View style={styles.roleBadge}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
              <Ionicons name="ribbon-outline" size={12} color={COLORS.primary} />
            </View>
          </View>
        </Animated.View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Info Card */}
          <Text style={styles.sectionTitle}>Account Info</Text>
          <View style={styles.card}>
            <InfoRow icon="person-outline" label="Full Name" value={user?.name || '—'} />
            <View style={styles.sep} />
            <InfoRow icon="mail-outline" label="Email" value={user?.email || '—'} />
            <View style={styles.sep} />
            <InfoRow icon="call-outline" label="Mobile" value={user?.mobile || '—'} />
            <View style={styles.sep} />
            <InfoRow icon="location-outline" label="Home Address" value={user?.address || '—'} />
            <View style={styles.sep} />
            <InfoRow icon="shield-checkmark-outline" label="Role" value={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || '—'} />
            <View style={styles.sep} />
            <InfoRow
              icon="calendar-outline"
              label="Member Since"
              value={user?.createdAt ? new Date(user.createdAt).toDateString() : 'CafeSync Member'}
            />
          </View>

          {/* Payment & Cards */}
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('SavedCards')} activeOpacity={0.7}>
              <View style={styles.iconBox}>
                <Ionicons name="card-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Saved Cards</Text>
                <Text style={styles.infoValue}>Manage your payment methods</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <InfoRow icon="cafe-outline" label="App" value="CafeSync v1.0.0" />
            <View style={styles.sep} />
            <InfoRow icon="phone-portrait-outline" label="Platform" value={Platform.OS.charAt(0).toUpperCase() + Platform.OS.slice(1)} />
          </View>

          <View style={{ gap: 12, marginTop: 28 }}>
            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.text} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>

            {/* Delete Account */}
            <TouchableOpacity 
              style={[styles.deleteBtn, updating && { opacity: 0.7 }]} 
              onPress={handleDelete} 
              activeOpacity={0.8}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color={COLORS.danger} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                  <Text style={styles.deleteBtnText}>Delete Account</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={isEditing} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <Ionicons name="close" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.modalAvatarWrap} onPress={pickImage}>
                <View style={styles.modalAvatar}>
                  {tempAvatar ? (
                    <Image source={{ uri: tempAvatar }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarText}>{initials}</Text>
                  )}
                  <View style={styles.cameraIcon}>
                    <Ionicons name="camera" size={16} color={COLORS.white} />
                  </View>
                </View>
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
                placeholder="Name"
              />

              <Text style={styles.inputLabel}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                value={form.mobile}
                onChangeText={(t) => setForm({ ...form, mobile: t })}
                placeholder="Mobile"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Home Address</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.address}
                onChangeText={(t) => setForm({ ...form, address: t })}
                placeholder="Address"
                multiline
              />

              <TouchableOpacity 
                style={[styles.saveBtn, updating && { opacity: 0.7 }]} 
                onPress={handleUpdate}
                disabled={updating}
              >
                {updating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.secondary,
    paddingTop: Platform.OS === 'android' ? 36 : 16,
    paddingBottom: 36,
    alignItems: 'center',
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...Platform.select({
      ios: { shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0 6px 12px rgba(30,42,58,0.3)' },
    }),
  },
  headerCircle1: {
    position: 'absolute', top: -50, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerCircle2: {
    position: 'absolute', bottom: -60, left: -30,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  editBtn: {
    position: 'absolute', top: Platform.OS === 'android' ? 44 : 24, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarWrap: { alignItems: 'center', gap: 12 },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: COLORS.primary,
    padding: 3,
  },
  avatar: {
    flex: 1, borderRadius: 44,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 32, fontWeight: '900', color: COLORS.white },
  userName: { fontSize: 22, fontWeight: '900', color: COLORS.white },
  roleBadge: {
    backgroundColor: 'rgba(255,107,53,0.25)',
    paddingHorizontal: 16, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary,
  },
  roleText: { color: COLORS.primary, fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },
  scroll: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textLight, marginBottom: 10, marginTop: 20, letterSpacing: 0.5, textTransform: 'uppercase' },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
      android: { elevation: 3 },
      web: { boxShadow: '0 3px 10px rgba(0,0,0,0.07)' },
    }),
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  navRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primaryGlow, justifyContent: 'center', alignItems: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  infoValue: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  sep: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: 16 },
  logoutBtn: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: COLORS.divider,
  },
  logoutText: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
  deleteBtn: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: COLORS.danger,
  },
  deleteBtnText: { color: COLORS.danger, fontWeight: '800', fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: COLORS.background, 
    borderTopLeftRadius: 32, borderTopRightRadius: 32, 
    padding: 24, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  modalAvatarWrap: { alignItems: 'center', marginBottom: 24 },
  modalAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.white },
  changePhotoText: { marginTop: 8, color: COLORS.accent, fontWeight: '700', fontSize: 14 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textLight, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, fontSize: 15, color: COLORS.text, borderWidth: 1.5, borderColor: COLORS.divider },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 18, padding: 16, alignItems: 'center', marginTop: 32, marginBottom: 20 },
  saveBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
});

export default ProfileScreen;
