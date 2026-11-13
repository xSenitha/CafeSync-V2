import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Platform, TextInput,
  Animated, RefreshControl, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reservationsAPI } from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, TOUCH_TARGET } from '../../constants/spacing';
import { FONTS } from '../../constants/typography';
import { SHADOWS } from '../../constants/colors';
import CoffeeLoader from '../../components/common/CoffeeLoader';

const TIMES = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'];

const ReservationScreen = () => {
  const { colors } = useTheme();
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

  const STATUS_MAP = {
    Pending: { color: colors.warning, icon: 'time-outline' },
    Confirmed: { color: colors.success, icon: 'checkmark-circle-outline' },
    Cancelled: { color: colors.danger, icon: 'close-circle-outline' },
    Completed: { color: colors.textLight, icon: 'sparkles-outline' },
  };

  useEffect(() => {
    fetchReservations();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    Animated.spring(formAnim, {
      toValue: showForm ? 1 : 0, friction: 8, useNativeDriver: true,
    }).start();
  }, [showForm, formAnim]);

  const fetchReservations = async () => {
    try {
      const res = await reservationsAPI.getMyReservations();
      setReservations(res.data.data || []);
    } catch (e) {
      console.log(e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.tableNumber || isNaN(form.tableNumber) || Number(form.tableNumber) < 1 || Number(form.tableNumber) > 20)
      e.tableNumber = 'Select table number (1–20)';
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
      setSuccessMsg('Your table is reserved. We look forward to seeing you!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchReservations();
    } catch (e) {
      setErrors({ general: e.response?.data?.error || 'Booking failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await reservationsAPI.cancelReservation(id);
      fetchReservations();
    } catch (e) {
      console.log(e?.message);
    }
  };

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.headerSup, { color: colors.accent }]}>QUIET CORNERS</Text>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
              Table Bookings
            </Text>
            <Text style={[styles.headerSub, { color: colors.textLight }]}>
              {reservations.length} {reservations.length === 1 ? 'reservation' : 'reservations'} saved
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.addBtn,
              {
                backgroundColor: showForm ? colors.surfaceAlt : colors.primary,
                borderColor: showForm ? colors.divider : colors.primary,
              },
            ]}
            onPress={() => setShowForm(!showForm)}
            accessibilityRole="button"
            accessibilityLabel={showForm ? 'Close reservation form' : 'Book a table'}
            activeOpacity={0.85}
          >
            {showForm ? (
              <Ionicons name="close" size={20} color={colors.textMid} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="add" size={18} color={colors.surface} />
                <Text style={[styles.addBtnText, { color: colors.surface }]}>Book Table</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Success toast */}
      {successMsg ? (
        <View style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.success }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} style={{ marginRight: 8 }} />
          <Text style={[styles.toastText, { color: colors.text }]}>{successMsg}</Text>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReservations(); }} tintColor={colors.accent} />}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Booking Form Card */}
          {showForm && (
            <Animated.View
              style={[
                styles.formCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.divider,
                  transform: [
                    { scaleY: formAnim },
                    { translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
                  ],
                  opacity: formAnim,
                },
                SHADOWS.card.web,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <View style={[styles.formIconWrap, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="calendar" size={18} color={colors.accent} />
                </View>
                <Text style={[styles.formTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
                  Reserve a Cozy Corner
                </Text>
              </View>

              {errors.general ? (
                <View style={[styles.generalError, { backgroundColor: colors.dangerLight, borderColor: colors.danger + '40' }]}>
                  <Text style={[styles.generalErrorText, { color: colors.danger }]}>{errors.general}</Text>
                </View>
              ) : null}

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textMid }]}>Table No.</Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      { backgroundColor: colors.surfaceAlt, borderColor: errors.tableNumber ? colors.danger : colors.divider },
                      styles.selectInput,
                    ]}
                    onPress={() => setShowTableDropdown(true)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Choose table number"
                  >
                    <Text
                      style={{
                        color: form.tableNumber ? colors.text : colors.textLight,
                        fontSize: 14,
                        fontWeight: form.tableNumber ? '700' : '400',
                      }}
                    >
                      {form.tableNumber ? `Table ${form.tableNumber}` : 'Select Table'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.textLight} />
                  </TouchableOpacity>
                  {errors.tableNumber ? <Text style={[styles.fieldErr, { color: colors.danger }]}>{errors.tableNumber}</Text> : null}
                </View>

                <View style={{ width: 12 }} />

                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textMid }]}>Guests</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.surfaceAlt, borderColor: errors.guests ? colors.danger : colors.divider, color: colors.text },
                    ]}
                    placeholder="e.g. 2"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={form.guests}
                    onChangeText={(v) => setField('guests', v)}
                  />
                  {errors.guests ? <Text style={[styles.fieldErr, { color: colors.danger }]}>{errors.guests}</Text> : null}
                </View>
              </View>

              <Text style={[styles.label, { color: colors.textMid }]}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceAlt, borderColor: errors.date ? colors.danger : colors.divider, color: colors.text },
                ]}
                placeholder="e.g. 2026-11-20"
                placeholderTextColor={colors.textLight}
                value={form.date}
                onChangeText={(v) => setField('date', v)}
              />
              {errors.date ? <Text style={[styles.fieldErr, { color: colors.danger }]}>{errors.date}</Text> : null}

              <Text style={[styles.label, { color: colors.textMid }]}>Preferred Time Slot</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
                {TIMES.map((t) => {
                  const isSelected = form.time === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.timeChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                          borderColor: isSelected ? colors.primary : colors.divider,
                        },
                      ]}
                      onPress={() => setField('time', t)}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.timeText,
                          { color: isSelected ? colors.surface : colors.textMid },
                          isSelected && styles.timeTextActive,
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {errors.time ? <Text style={[styles.fieldErr, { color: colors.danger }]}>{errors.time}</Text> : null}

              <Text style={[styles.label, { color: colors.textMid }]}>Special Requests (Optional)</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textarea,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.divider, color: colors.text },
                ]}
                placeholder="Near the window, quiet area, celebrating an occasion…"
                placeholderTextColor={colors.textLight}
                value={form.specialRequests}
                onChangeText={(v) => setField('specialRequests', v)}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.primary },
                  SHADOWS.subtle.web,
                  submitting && { opacity: 0.7 },
                ]}
                onPress={handleSubmit}
                disabled={submitting}
                accessibilityRole="button"
              >
                {submitting ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.submitText, { color: colors.surface }]}>Confirm Reservation</Text>
                    <Ionicons name="checkmark" size={18} color={colors.surface} />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Reservation List */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
            My Table Bookings
          </Text>

          {loading ? (
            <CoffeeLoader message="Checking table availability…" size="compact" />
          ) : reservations.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
              <Ionicons name="calendar-outline" size={44} color={colors.textLight} />
              <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
                No tables reserved yet
              </Text>
              <Text style={[styles.emptySub, { color: colors.textLight }]}>
                Tap &quot;Book Table&quot; above to reserve your slow cafe moment.
              </Text>
            </View>
          ) : (
            reservations.map((r) => {
              const s = STATUS_MAP[r.status] || STATUS_MAP.Pending;
              return (
                <View
                  key={r._id}
                  style={[
                    styles.resCard,
                    { backgroundColor: colors.surface, borderColor: colors.divider },
                    SHADOWS.card.web,
                  ]}
                >
                  <View style={styles.resTop}>
                    <View style={[styles.resIconBg, { backgroundColor: s.color + '14' }]}>
                      <Ionicons name={s.icon} size={22} color={s.color} />
                    </View>
                    <View style={styles.resInfo}>
                      <Text style={[styles.resTable, { color: colors.text, fontFamily: FONTS.serif }]}>
                        Table #{r.tableNumber}
                      </Text>
                      <Text style={[styles.resMeta, { color: colors.textMid }]}>
                        {new Date(r.date).toDateString()} · {r.time} · {r.guests} {r.guests === 1 ? 'guest' : 'guests'}
                      </Text>
                      {r.specialRequests ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                          <Ionicons name="document-text-outline" size={13} color={colors.textLight} />
                          <Text style={[styles.resReq, { color: colors.textLight }]}>{r.specialRequests}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={[styles.badge, { backgroundColor: s.color + '18' }]}>
                      <Text style={[styles.badgeText, { color: s.color }]}>{r.status}</Text>
                    </View>
                  </View>
                  {['Pending', 'Confirmed'].includes(r.status) && (
                    <TouchableOpacity
                      style={[styles.cancelBtn, { backgroundColor: colors.dangerLight }]}
                      onPress={() => handleCancel(r._id)}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.cancelText, { color: colors.danger }]}>Cancel Reservation</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>

      {/* Table Dropdown Modal */}
      <Modal visible={showTableDropdown} animationType="fade" transparent onRequestClose={() => setShowTableDropdown(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
                  Select Table
                </Text>
                <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                  Tables 1–20 are available for reservation
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTableDropdown(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={20} color={colors.textMid} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              <View style={styles.tableGrid}>
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
                  const isSelected = Number(form.tableNumber) === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.tableBtn,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                          borderColor: isSelected ? colors.primary : colors.divider,
                        },
                      ]}
                      onPress={() => {
                        setField('tableNumber', String(n));
                        setShowTableDropdown(false);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Table ${n}`}
                    >
                      <Text
                        style={[
                          styles.tableBtnText,
                          { color: isSelected ? colors.surface : colors.text },
                        ]}
                      >
                        {n}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
  },
  headerSup: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: FONTS.sans,
    marginBottom: 2,
  },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2, fontFamily: FONTS.sans },
  addBtn: {
    minHeight: TOUCH_TARGET.min,
    paddingHorizontal: 16,
    borderRadius: RADIUS.base,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { fontWeight: '700', fontSize: 14, fontFamily: FONTS.sans },
  toast: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  toastText: { fontWeight: '600', fontSize: 13, flex: 1 },
  scroll: {
    padding: 20,
    paddingBottom: 100,
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
  },
  formCard: {
    borderRadius: RADIUS.xl,
    padding: 20,
    marginBottom: 22,
    borderWidth: 1,
  },
  formIconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formTitle: { fontSize: 18, fontWeight: '700' },
  generalError: {
    padding: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    marginBottom: 12,
  },
  generalErrorText: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12, fontFamily: FONTS.sans },
  input: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    borderWidth: 1,
    minHeight: TOUCH_TARGET.inputHeight,
    fontFamily: FONTS.sans,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textarea: { height: 76, textAlignVertical: 'top' },
  fieldErr: { fontSize: 11, marginTop: 4, fontFamily: FONTS.sans },
  timeScroll: { marginVertical: 6 },
  timeChip: {
    minHeight: TOUCH_TARGET.min,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    marginRight: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.sans },
  timeTextActive: { fontWeight: '700' },
  submitBtn: {
    borderRadius: RADIUS.base,
    minHeight: TOUCH_TARGET.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  submitText: { fontWeight: '700', fontSize: 15, fontFamily: FONTS.sans },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  emptyCard: {
    borderRadius: RADIUS.xl,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', fontFamily: FONTS.sans },
  resCard: {
    borderRadius: RADIUS.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  resTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  resIconBg: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resInfo: { flex: 1 },
  resTable: { fontSize: 16, fontWeight: '700' },
  resMeta: { fontSize: 12, marginTop: 2, fontFamily: FONTS.sans },
  resReq: { fontSize: 12, fontStyle: 'italic', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.sans },
  cancelBtn: {
    minHeight: TOUCH_TARGET.min,
    marginTop: 12,
    borderRadius: RADIUS.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontWeight: '700', fontSize: 13, fontFamily: FONTS.sans },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSheet: {
    borderRadius: RADIUS.xxl,
    padding: 22,
    maxHeight: '75%',
    width: '90%',
    maxWidth: 420,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  closeBtn: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  tableBtn: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  tableBtnText: { fontSize: 15, fontWeight: '800' },
});

export default ReservationScreen;
