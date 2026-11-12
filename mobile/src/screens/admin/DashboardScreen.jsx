import React, { useEffect, useState, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Platform, Animated, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { adminOrdersAPI, adminInventoryAPI, adminReservationsAPI, adminPaymentsAPI } from '../../api';
import { COLORS } from '../../constants/colors';

const StatCard = ({ icon, label, value, color, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, friction: 7, delay, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[styles.statCard, { transform: [{ scale: anim }], opacity: anim, borderTopColor: color, borderTopWidth: 3 }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
};

const STATUS_COLORS = {
  Pending: COLORS.warning, Preparing: COLORS.info,
  Ready: COLORS.success, Completed: COLORS.textLight, Cancelled: COLORS.danger,
};

const DashboardScreen = () => {
  const { logout } = useContext(AuthContext);
  const [data, setData] = useState({ orders: [], inventory: [], reservations: [], payments: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const headerAnim = useRef(new Animated.Value(-50)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchAll();
    Animated.parallel([
      Animated.spring(headerAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchAll = async () => {
    try {
      const [o, i, r, p] = await Promise.all([
        adminOrdersAPI.getAll(), adminInventoryAPI.getAll(),
        adminReservationsAPI.getAll(), adminPaymentsAPI.getAll(),
      ]);
      setData({
        orders: o.data.data || [], inventory: i.data.data || [],
        reservations: r.data.data || [], payments: p.data.data || [],
      });
    } catch (e) { console.log(e?.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const pendingOrders  = data.orders.filter(o => o.status === 'Pending').length;
  const unpaidOrders   = data.orders.filter(o => o.paymentStatus === 'Pending' && o.status !== 'Cancelled').length;
  const totalRevenue   = data.payments.filter(p => p.status === 'Completed').reduce((s, p) => s + p.amount, 0);
  const lowStock       = data.inventory.filter(i => i.stock < 5).length;
  const todayRes       = data.reservations.filter(r => new Date(r.date).toDateString() === new Date().toDateString()).length;
  const dineInCount    = data.orders.filter(o => (o.orderType || 'Dine-In') === 'Dine-In').length;
  const takeawayCount  = data.orders.filter(o => o.orderType === 'Takeaway').length;
  const deliveryCount  = data.orders.filter(o => o.orderType === 'Online Delivery').length;
  const recentOrders   = data.orders.slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { transform: [{ translateY: headerAnim }], opacity: headerOpacity }]}>
        <View style={styles.headerCircle1} />
        <View style={styles.headerCircle2} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerSup}>Admin Panel</Text>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="log-out-outline" size={14} color={COLORS.primary} />
              <Text style={styles.logoutText}>Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={COLORS.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Stats Grid */}
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard icon="cart" label="Pending Orders" value={pendingOrders} color={COLORS.warning} delay={0} />
              <StatCard icon="cash" label="Unpaid Orders" value={unpaidOrders} color={COLORS.danger} delay={80} />
              <StatCard icon="calendar" label="Today's Bookings" value={todayRes} color={COLORS.info} delay={160} />
              <StatCard icon="warning" label="Low Stock" value={lowStock} color={COLORS.primary} delay={240} />
            </View>

            {/* Order Type Breakdown */}
            <Text style={styles.sectionTitle}>Order Types</Text>
            <View style={styles.summaryRow}>
              {[
                { icon: 'restaurant', label: 'Dine-In',  value: dineInCount,   color: COLORS.secondary },
                { icon: 'bag-handle', label: 'Takeaway', value: takeawayCount, color: COLORS.accent },
                { icon: 'bicycle', label: 'Delivery', value: deliveryCount, color: COLORS.info },
              ].map(item => (
                <View key={item.label} style={[styles.summaryCard, { borderTopWidth: 3, borderTopColor: item.color }]}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                  <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Summary Row */}
            <View style={styles.summaryRow}>
              {[
                { icon: 'cube', label: 'Orders',      value: data.orders.length,      color: COLORS.primary },
                { icon: 'restaurant', label: 'Menu Items',  value: data.inventory.length,   color: COLORS.warning },
                { icon: 'calendar', label: 'Bookings',   value: data.reservations.length, color: COLORS.success },
                { icon: 'card', label: 'Payments',   value: data.payments.length,    color: COLORS.accent },
              ].map(item => (
                <View key={item.label} style={styles.summaryCard}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                  <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Recent Orders */}
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {recentOrders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="cart-outline" size={40} color={COLORS.divider} />
                <Text style={styles.emptyText}>No orders yet</Text>
              </View>
            ) : (
              recentOrders.map(order => {
                const typeEmoji = { 'Dine-In': '🪑', 'Takeaway': '🥡', 'Online Delivery': '🛵' }[order.orderType] || '🪑';
                const payColor = order.paymentStatus === 'Paid' ? COLORS.success : order.paymentStatus === 'Failed' ? COLORS.danger : COLORS.warning;
                return (
                  <View key={order._id} style={styles.orderCard}>
                    <View style={[styles.orderDot, { backgroundColor: STATUS_COLORS[order.status] }]} />
                    <View style={styles.orderInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons 
                          name={order.orderType === 'Dine-In' ? 'restaurant' : order.orderType === 'Takeaway' ? 'bag-handle' : 'bicycle'} 
                          size={14} 
                          color={COLORS.textMid} 
                        />
                        <Text style={styles.orderId}>#{order._id.slice(-6).toUpperCase()}</Text>
                      </View>
                      <Text style={styles.orderMeta}>{order.items?.length || 0} items · Rs. {order.totalAmount?.toFixed(2)}</Text>
                      {order.orderType === 'Dine-In' && order.tableNumber ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                          <Ionicons name="restaurant-outline" size={10} color={COLORS.textLight} />
                          <Text style={styles.orderSubMeta}>Table {order.tableNumber}</Text>
                        </View>
                      ) : order.orderType === 'Online Delivery' && order.deliveryAddress ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                          <Ionicons name="location-outline" size={10} color={COLORS.textLight} />
                          <Text style={styles.orderSubMeta} numberOfLines={1}>{order.deliveryAddress}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ gap: 4, alignItems: 'flex-end' }}>
                      <View style={[styles.badge, { backgroundColor: STATUS_COLORS[order.status] + '18' }]}>
                        <Text style={[styles.badgeText, { color: STATUS_COLORS[order.status] }]}>{order.status}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: payColor + '18' }]}>
                        <Text style={[styles.badgeText, { color: payColor }]}>{order.paymentStatus || 'Pending'}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.secondary,
    paddingTop: Platform.OS === 'android' ? 36 : 16,
    paddingBottom: 24, paddingHorizontal: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0 6px 12px rgba(30,42,58,0.35)' },
    }),
  },
  headerCircle1: { position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)' },
  headerCircle2: { position: 'absolute', bottom: -50, left: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,107,53,0.1)' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerSup: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: COLORS.white },
  logoutBtn: { backgroundColor: 'rgba(255,107,53,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: COLORS.primary },
  logoutText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 12, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  statCard: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: 18,
    padding: 16, alignItems: 'center', gap: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
      web: { boxShadow: '0 3px 8px rgba(0,0,0,0.08)' },
    }),
  },
  statEmoji: { fontSize: 28 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 11, color: COLORS.textLight, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.06)' },
    }),
  },
  summaryEmoji: { fontSize: 18 },
  summaryValue: { fontSize: 16, fontWeight: '900' },
  summaryLabel: { fontSize: 10, color: COLORS.textLight },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, alignItems: 'center', gap: 8 },
  emptyEmoji: { fontSize: 36 },
  emptyText: { color: COLORS.textLight, fontSize: 14 },
  orderCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.05)' },
    }),
  },
  orderDot: { width: 10, height: 10, borderRadius: 5 },
  orderInfo: { flex: 1 },
  orderId: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  orderMeta: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  orderSubMeta: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '700' },
});

export default DashboardScreen;
