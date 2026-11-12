import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  ActivityIndicator, Platform, Animated, RefreshControl, TouchableOpacity,
  ScrollView, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { paymentsAPI } from '../../api';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');

const STATUS_MAP = {
  Pending:   { color: COLORS.warning,  icon: 'time-outline', label: 'Pending' },
  Completed: { color: COLORS.success,  icon: 'checkmark-circle-outline', label: 'Paid' },
  Failed:    { color: COLORS.danger,   icon: 'close-circle-outline', label: 'Failed' },
};

const METHOD_ICONS = {
  'Pay Later':        'time-outline',
  'Cash':             'cash-outline',
  'Pay on Pickup':    'storefront-outline',
  'Online':           'card-outline',
  'Cash on Delivery': 'home-outline',
  'Card':             'card-outline',
};

const FILTERS = ['All', 'Pending', 'Completed', 'Failed'];

const PaymentCard = ({ payment, index }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const s = STATUS_MAP[payment.status] || STATUS_MAP.Pending;
  const order = payment.order;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, friction: 7, delay: index * 70, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.card, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
    }]}>
      <View style={[styles.stripe, { backgroundColor: s.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={[styles.cardIcon, { backgroundColor: s.color + '12' }]}>
            <Ionicons name={s.icon} size={22} color={s.color} />
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardAmount}>Rs. {payment.amount?.toFixed(2)}</Text>
              <View style={[styles.badge, { backgroundColor: s.color + '15' }]}>
                <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
              </View>
            </View>
            <View style={styles.cardMetaRow}>
              <Ionicons name={METHOD_ICONS[payment.paymentMethod] || 'cash-outline'} size={12} color={COLORS.textLight} />
              <Text style={styles.cardMethod}>{payment.paymentMethod}</Text>
            </View>
            <Text style={styles.cardDate}>
              {new Date(payment.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date(payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {order && (
          <View style={styles.orderBar}>
            <Ionicons name="receipt-outline" size={14} color={COLORS.textMid} />
            <Text style={styles.orderBarText} numberOfLines={1}>
              {order.orderType} · {order.items?.length || 0} items
            </Text>
            <Text style={styles.orderBarId}>#{order._id?.slice(-6).toUpperCase()}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const PaymentHistoryScreen = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchPayments();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await paymentsAPI.getMyPayments();
      setPayments(res.data.data || []);
    } catch (e) { console.log(e?.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const totalPaid = payments.filter(p => p.status === 'Completed').reduce((s, p) => s + p.amount, 0);
  const pendingCount = payments.filter(p => p.status === 'Pending').length;
  const filtered = filter === 'All' ? payments : payments.filter(p => p.status === filter);

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.headerHero}>
        <View style={styles.headerCircle} />
        <Text style={styles.headerTitle}>Payment History</Text>
        <Text style={styles.headerSub}>Manage your transactions and receipts</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Spent</Text>
          <Text style={styles.statValue}>Rs. {totalPaid.toFixed(0)}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.warning, borderLeftWidth: 3 }]}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={[styles.statValue, { color: COLORS.warning }]}>{pendingCount}</Text>
        </View>
      </View>

      <View style={styles.filterSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map(item => {
            const active = filter === item;
            const color = STATUS_MAP[item]?.color || COLORS.accent;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
                onPress={() => setFilter(item)}
                activeOpacity={0.7}
              >
                <View style={styles.chipContent}>
                  <Ionicons 
                    name={item === 'All' ? 'card' : STATUS_MAP[item]?.icon} 
                    size={14} 
                    color={active ? COLORS.white : color} 
                  />
                  <Text style={[styles.chipText, active && { color: COLORS.white }]}>{item}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={filtered}
          keyExtractor={i => i._id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchPayments(); }}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item, index }) => <PaymentCard payment={item} index={index} />}
          ListEmptyComponent={!loading && (
            <View style={styles.empty}>
              <Ionicons name="card-outline" size={60} color={COLORS.divider} />
              <Text style={styles.emptyTitle}>No Transactions</Text>
              <Text style={styles.emptySub}>Your payment history for "{filter}" is currently empty.</Text>
            </View>
          )}
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
      </Animated.View>
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(248,249,254,0.7)', justifyContent: 'center', alignItems: 'center' },
  
  listHeader: { marginBottom: 10 },
  headerHero: {
    backgroundColor: COLORS.secondary,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 30, paddingHorizontal: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerCircle: { position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: COLORS.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: -20 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 }, android: { elevation: 4 } }),
  },
  statLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textLight, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '900', color: COLORS.text },

  filterSection: { marginTop: 20, marginBottom: 10 },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.divider,
  },
  chipContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.textMid },

  listContent: { paddingBottom: 20 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20, marginHorizontal: 20,
    marginBottom: 12, flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.divider,
  },
  stripe: { width: 5 },
  cardBody: { flex: 1, padding: 16, gap: 10 },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardAmount: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  cardMethod: { fontSize: 13, color: COLORS.textMid, fontWeight: '600' },
  cardDate: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  
  orderBar: {
    backgroundColor: COLORS.background, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  orderBarText: { fontSize: 12, color: COLORS.textMid, fontWeight: '600', flex: 1 },
  orderBarId: { fontSize: 11, color: COLORS.textLight, fontWeight: '700' },

  empty: { alignItems: 'center', marginTop: 60, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textLight, textAlign: 'center' },
});

export default PaymentHistoryScreen;
