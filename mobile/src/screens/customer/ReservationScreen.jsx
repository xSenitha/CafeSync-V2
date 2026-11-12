import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Platform, TextInput,
  Animated, Dimensions, RefreshControl, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reservationsAPI } from '../../api';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');
const TIMES = ['09:00 AM','10:00 AM','11:00 AM','12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM','06:00 PM','07:00 PM','08:00 PM'];
const STATUS_MAP = {
  Pending: { color: COLORS.warning, icon: 'time-outline' },
  Confirmed: { color: COLORS.success, icon: 'checkmark-circle-outline' },
  Cancelled: { color: COLORS.danger, icon: 'close-circle-outline' },
  Completed: { color: COLORS.textLight, icon: 'sparkles-outline' },
};

const ReservationScreen = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ tableNumber: '', guests: '', date: '', time: '', specialRequests: '' });
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [showTableDropdown, setShowTableDropdown] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchReservations();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    Animated.spring(formAnim, {
      toValue: showForm ? 1 : 0, friction: 8, useNativeDriver: true,
    }).start();
  }, [showForm]);

  const fetchReservations = async () => {
    try {
      const res = await reservationsAPI.getMyReservations();
      setReservations(res.data.data || []);
    } catch (e) { console.log(e?.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const validate = () => {
    const e = {};
    if (!form.tableNumber || isNaN(form.tableNumber) || Number(form.tableNumber) < 1 || Number(form.tableNumber) > 20)
      e.tableNumber = 'Enter table number (1–20)';
    if (!form.guests || isNaN(form.guests) || Number(form.guests) < 1)
      e.guests = 'At least 1 guest required';
    if (!form.date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(form.date))
      e.date = 'Use format YYYY-MM-DD';
    else if (new Date(form.date) < new Date(new Date().toDateString()))
      e.date = 'Date cannot be in the past';
    if (!form.time) e.time = 'Select a time slot';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await reservationsAPI.createReservation({
        tableNumber: Number(form.tableNumber),
        guests: Number(form.guests),
        date: form.date,
        time: form.time,
        specialRequests: form.specialRequests,
      });
      setForm({ tableNumber: '', guests: '', date: '', time: '', specialRequests: '' });
      setShowForm(false);
      setSuccessMsg('Table booked successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchReservations();
    } catch (e) {
      setErrors({ general: e.response?.data?.error || 'Booking failed. Try again.' });
    } finally { setSubmitting(false); }
  };

  const handleCancel = async (id) => {
    try {
      await reservationsAPI.cancelReservation(id);
      fetchReservations();
    } catch (e) { console.log(e?.message); }
  };

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Reservations</Text>
            <Text style={styles.headerSub}>{reservations.length} total bookings</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, showForm && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
            onPress={() => setShowForm(!showForm)}
          >
            {showForm ? (
              <Ionicons name="close" size={18} color={COLORS.white} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="add" size={18} color={COLORS.white} />
                <Text style={styles.addBtnText}>Book</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Success toast */}
      {successMsg ? (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
          <Text style={styles.toastText}>{successMsg}</Text>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReservations(); }} tintColor={COLORS.success} />}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Booking Form */}
          {showForm && (
            <Animated.View style={[styles.formCard, {
              transform: [{ scaleY: formAnim }, { translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
              opacity: formAnim,
            }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Ionicons name="calendar" size={20} color={COLORS.success} />
                <Text style={[styles.formTitle, { marginBottom: 0 }]}>Book a Table</Text>
              </View>
              {errors.general ? <Text style={styles.generalError}>{errors.general}</Text> : null}

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Table No.</Text>
                  <TouchableOpacity
                    style={[styles.input, errors.tableNumber && styles.inputErr, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 }]}
                    onPress={() => setShowTableDropdown(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: form.tableNumber ? COLORS.text : COLORS.textLight, fontSize: 14, fontWeight: form.tableNumber ? '700' : '400' }}>
                      {form.tableNumber ? `Table ${form.tableNumber}` : 'Select Table'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={COLORS.textLight} />
                  </TouchableOpacity>
                  {errors.tableNumber ? <Text style={styles.fieldErr}>{errors.tableNumber}</Text> : null}
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Guests</Text>
                  <TextInput
                    style={[styles.input, errors.guests && styles.inputErr]}
                    placeholder="e.g. 4"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="numeric"
                    value={form.guests}
                    onChangeText={v => setField('guests', v)}
                  />
                  {errors.guests ? <Text style={styles.fieldErr}>{errors.guests}</Text> : null}
                </View>
              </View>

              <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.input, errors.date && styles.inputErr]}
                placeholder="e.g. 2026-05-20"
                placeholderTextColor={COLORS.textLight}
                value={form.date}
                onChangeText={v => setField('date', v)}
              />
              {errors.date ? <Text style={styles.fieldErr}>{errors.date}</Text> : null}

              <Text style={styles.label}>Time Slot</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
                {TIMES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeChip, form.time === t && styles.timeChipActive]}
                    onPress={() => setField('time', t)}
                  >
                    <Text style={[styles.timeText, form.time === t && styles.timeTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {errors.time ? <Text style={styles.fieldErr}>{errors.time}</Text> : null}

              <Text style={styles.label}>Special Requests</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Allergies, preferences…"
                placeholderTextColor={COLORS.textLight}
                value={form.specialRequests}
                onChangeText={v => setField('specialRequests', v)}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color={COLORS.white} />
                  : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.submitText}>Confirm Booking</Text>
                      <Ionicons name="checkmark" size={18} color={COLORS.white} />
                    </View>
                  )}
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* List */}
          <Text style={styles.sectionTitle}>My Reservations</Text>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.success} style={{ marginTop: 30 }} />
          ) : reservations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={50} color={COLORS.divider} />
              <Text style={styles.emptyTitle}>No reservations yet</Text>
              <Text style={styles.emptySub}>Tap "+ Book" to reserve your table</Text>
            </View>
          ) : (
            reservations.map(r => {
              const s = STATUS_MAP[r.status] || STATUS_MAP.Pending;
              return (
                <View key={r._id} style={styles.resCard}>
                  <View style={styles.resTop}>
                    <View style={[styles.resIconBg, { backgroundColor: s.color + '15' }]}>
                      <Ionicons name={s.icon} size={22} color={s.color} />
                    </View>
                    <View style={styles.resInfo}>
                      <Text style={styles.resTable}>Table {r.tableNumber}</Text>
                      <Text style={styles.resMeta}>
                        {new Date(r.date).toDateString()} • {r.time} • {r.guests} guests
                      </Text>
                      {r.specialRequests ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Ionicons name="document-text-outline" size={12} color={COLORS.textLight} />
                          <Text style={[styles.resReq, { marginTop: 0 }]}>{r.specialRequests}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={[styles.badge, { backgroundColor: s.color + '18' }]}>
                      <Text style={[styles.badgeText, { color: s.color }]}>{r.status}</Text>
                    </View>
                  </View>
                  {['Pending', 'Confirmed'].includes(r.status) && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(r._id)}>
                      <Text style={styles.cancelText}>Cancel Reservation</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>

      {/* Table Dropdown Modal */}
      <Modal visible={showTableDropdown} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Table</Text>
              <TouchableOpacity onPress={() => setShowTableDropdown(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.tableGrid}>
                {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.tableBtn, Number(form.tableNumber) === n && styles.tableBtnActive]}
                    onPress={() => {
                      setField('tableNumber', String(n));
                      setShowTableDropdown(false);
                    }}
                  >
                    <Text style={[styles.tableBtnText, Number(form.tableNumber) === n && { color: COLORS.white }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
    backgroundColor: COLORS.success,
    paddingTop: Platform.OS === 'android' ? 36 : 16,
    paddingBottom: 24, paddingHorizontal: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: COLORS.success, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0 6px 12px rgba(16,185,129,0.3)' },
    }),
  },
  headerCircle: {
    position: 'absolute', top: -40, right: -30,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  addBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  toast: {
    backgroundColor: COLORS.success, paddingHorizontal: 20,
    paddingVertical: 12, flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12, borderRadius: 14,
  },
  toastText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 40 },
  formCard: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 18, marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
    }),
  },
  formTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  generalError: {
    color: COLORS.danger, fontSize: 13,
    backgroundColor: COLORS.dangerLight, padding: 10,
    borderRadius: 10, marginBottom: 12,
  },
  row: { flexDirection: 'row' },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textMid, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: COLORS.text,
    borderWidth: 1.5, borderColor: COLORS.divider,
  },
  inputErr: { borderColor: COLORS.danger },
  textarea: { height: 72, textAlignVertical: 'top' },
  fieldErr: { color: COLORS.danger, fontSize: 11, marginTop: 4 },
  timeScroll: { marginVertical: 8 },
  timeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surfaceAlt, marginRight: 8,
    borderWidth: 1.5, borderColor: COLORS.divider,
  },
  timeChipActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  timeText: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  timeTextActive: { color: COLORS.white },
  submitBtn: {
    backgroundColor: COLORS.success, borderRadius: 14,
    padding: 14, alignItems: 'center', marginTop: 18,
    ...Platform.select({
      ios: { shadowColor: COLORS.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 8px rgba(16,185,129,0.3)' },
    }),
  },
  submitText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  emptyCard: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 30, alignItems: 'center', gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  emptyEmoji: { fontSize: 42 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textLight, textAlign: 'center' },
  resCard: {
    backgroundColor: COLORS.surface, borderRadius: 18,
    padding: 16, marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  resTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  resIconBg: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  resIcon: { fontSize: 22 },
  resInfo: { flex: 1 },
  resTable: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  resMeta: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  resReq: { fontSize: 12, color: COLORS.textLight, marginTop: 4, fontStyle: 'italic' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cancelBtn: {
    marginTop: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: COLORS.dangerLight, alignItems: 'center',
  },
  cancelText: { color: COLORS.danger, fontWeight: '700', fontSize: 13 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalSheet: { backgroundColor: COLORS.surface, borderRadius: 28, padding: 24, maxHeight: '70%', width: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  tableBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.divider },
  tableBtnActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  tableBtnText: { fontSize: 15, fontWeight: '800', color: COLORS.text },
});

export default ReservationScreen;
