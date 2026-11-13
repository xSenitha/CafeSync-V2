import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  Platform, Animated, RefreshControl, TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { paymentsAPI } from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, TOUCH_TARGET } from '../../constants/spacing';
import { FONTS } from '../../constants/typography';
import { SHADOWS } from '../../constants/colors';
import CoffeeLoader from '../../components/common/CoffeeLoader';

const METHOD_ICONS = {
  'Pay Later': 'time-outline',
  'Cash': 'cash-outline',
  'Pay on Pickup': 'storefront-outline',
  'Online': 'card-outline',
  'Cash on Delivery': 'home-outline',
  'Card': 'card-outline',
};

const FILTERS = ['All', 'Pending', 'Completed', 'Failed'];

const PaymentCard = ({ payment, index, colors, statusMap }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const s = statusMap[payment.status] || statusMap.Pending;
  const order = payment.order;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, friction: 7, delay: index * 60, useNativeDriver: true,
    }).start();
  }, [anim, index]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.divider,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        },
        SHADOWS.card.web,
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: s.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={[styles.cardIcon, { backgroundColor: s.color + '14' }]}>
            <Ionicons name={s.icon} size={20} color={s.color} />
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardAmount, { color: colors.text, fontFamily: FONTS.serif }]}>
                Rs. {payment.amount?.toFixed(2)}
              </Text>
              <View style={[styles.badge, { backgroundColor: s.color + '18' }]}>
                <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
              </View>
            </View>

            <View style={styles.cardMetaRow}>
              <Ionicons name={METHOD_ICONS[payment.paymentMethod] || 'cash-outline'} size={13} color={colors.textLight} />
              <Text style={[styles.cardMethod, { color: colors.textMid }]}>{payment.paymentMethod}</Text>
            </View>

            <Text style={[styles.cardDate, { color: colors.textLight }]}>
              {new Date(payment.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date(payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {order && (
          <View style={[styles.orderBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}>
            <Ionicons name="receipt-outline" size={14} color={colors.textMid} />
            <Text style={[styles.orderBarText, { color: colors.textMid }]} numberOfLines={1}>
              {order.orderType} · {order.items?.length || 0} items
            </Text>
            <Text style={[styles.orderBarId, { color: colors.primary }]}>
              #{order._id?.slice(-6).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const PaymentHistoryScreen = () => {
  const { colors } = useTheme();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const STATUS_MAP = {
    Pending: { color: colors.warning, icon: 'time-outline', label: 'Pending' },
    Completed: { color: colors.success, icon: 'checkmark-circle-outline', label: 'Paid' },
    Failed: { color: colors.danger, icon: 'close-circle-outline', label: 'Failed' },
  };

  useEffect(() => {
    fetchPayments();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const fetchPayments = async () => {
    try {
      const res = await paymentsAPI.getMyPayments();
      setPayments(res.data.data || []);
    } catch (e) {
      console.log(e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const totalPaid = payments.filter((p) => p.status === 'Completed').reduce((s, p) => s + p.amount, 0);
  const pendingCount = payments.filter((p) => p.status === 'Pending').length;
  const filtered = filter === 'All' ? payments : payments.filter((p) => p.status === filter);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.headerSup, { color: colors.accent }]}>YOUR RECEIPTS</Text>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
              Payments & Tabs
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
            onPress={() => { setRefreshing(true); fetchPayments(); }}
            accessibilityRole="button"
            accessibilityLabel="Refresh payment records"
          >
            <Ionicons name="refresh" size={19} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPayments(); }} tintColor={colors.accent} />}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Quick Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Total Savor & Spent</Text>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: FONTS.serif }]}>
                Rs. {totalPaid.toFixed(0)}
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.divider, borderLeftColor: colors.warning, borderLeftWidth: 3.5 }]}>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Pending Tabs</Text>
              <Text style={[styles.statValue, { color: colors.warning, fontFamily: FONTS.serif }]}>
                {pendingCount}
              </Text>
            </View>
          </View>

          {/* Filter Chips */}
          <View style={styles.filterSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {FILTERS.map((item) => {
                const active = filter === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.surface,
                        borderColor: active ? colors.primary : colors.divider,
                      },
                    ]}
                    onPress={() => setFilter(item)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.surface : colors.textMid },
                        active && styles.chipTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Transactions List */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
            Transactions ({filtered.length})
          </Text>

          {loading ? (
            <CoffeeLoader message="Gathering receipts…" size="compact" />
          ) : filtered.length === 0 ? (
            <View style={[styles.emptyWrap, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
              <Ionicons name="card-outline" size={44} color={colors.textLight} />
              <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
                No transaction records found
              </Text>
              <Text style={[styles.emptySub, { color: colors.textLight }]}>
                Your order receipts and payment statuses will appear right here.
              </Text>
            </View>
          ) : (
            filtered.map((payment, index) => (
              <PaymentCard
                key={payment._id}
                payment={payment}
                index={index}
                colors={colors}
                statusMap={STATUS_MAP}
              />
            ))
          )}
        </Animated.View>
      </ScrollView>
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
  refreshBtn: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  statLabel: { fontSize: 11, fontWeight: '600', fontFamily: FONTS.sans },
  statValue: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  filterSection: { marginBottom: 20 },
  filterScroll: { gap: 8 },
  chip: {
    minHeight: TOUCH_TARGET.min,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '600', fontFamily: FONTS.sans },
  chipTextActive: { fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  card: {
    borderRadius: RADIUS.xl,
    marginBottom: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stripe: { height: 4, width: '100%' },
  cardBody: { padding: 16 },
  cardTop: { flexDirection: 'row', gap: 12 },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardAmount: { fontSize: 18, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.sans },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  cardMethod: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.sans },
  cardDate: { fontSize: 11, marginTop: 4 },
  orderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: RADIUS.md,
    marginTop: 12,
    borderWidth: 1,
  },
  orderBarText: { flex: 1, fontSize: 12, fontFamily: FONTS.sans },
  orderBarId: { fontSize: 12, fontWeight: '700', fontFamily: FONTS.sans },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 10 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 4, fontFamily: FONTS.sans },
});

export default PaymentHistoryScreen;
