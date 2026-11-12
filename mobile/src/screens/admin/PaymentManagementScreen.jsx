import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Platform, RefreshControl,
  ScrollView, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminPaymentsAPI } from '../../api';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');

const STATUS_CONFIG = {
  Pending:   { color: COLORS.warning, icon: 'time-outline' },
  Completed: { color: COLORS.success, icon: 'checkmark-circle-outline' },
  Failed:    { color: COLORS.danger,  icon: 'close-circle-outline' },
};

const PaymentManagementScreen = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, 10000);
    return () => clearInterval(timer);
  }, []);

  const fetchAll = async () => {
    try {
      const res = await adminPaymentsAPI.getAll();
      setPayments(res.data.data || []);
    } catch (e) { console.log(e?.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const updateStatus = async (id, status) => {
    setUpdating(id + status);
    try {
      await adminPaymentsAPI.updateStatus(id, { status });
      setPayments(prev => prev.map(p => p._id === id ? { ...p, status } : p));
    } catch (e) { console.log(e?.message); }
    finally { setUpdating(null); }
  };

  const filtered = filter === 'All' ? payments : payments.filter(p => p.status === filter);
  const totalRevenue = payments.filter(p => p.status === 'Completed').reduce((s, p) => s + p.amount, 0);

  const renderItem = ({ item: p }) => {
    const color = STATUS_CONFIG[p.status]?.color || COLORS.textLight;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.iconBg, { backgroundColor: color + '12' }]}>
            <Ionicons name={STATUS_CONFIG[p.status]?.icon} size={24} color={color} />
          </View>
          <View style={styles.info}>
            <Text style={styles.amount}>Rs. {p.amount?.toFixed(2)}</Text>
            <Text style={styles.meta}>{p.paymentMethod} • {p.customer?.name || 'Walk-in'}</Text>
            <Text style={styles.date}>{new Date(p.createdAt).toLocaleString()}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: color + '15' }]}>
            <Text style={[styles.badgeText, { color }]}>{p.status}</Text>
          </View>
        </View>

        {p.status === 'Pending' && (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
              onPress={() => updateStatus(p._id, 'Completed')}
              disabled={!!updating}
            >
              {updating === p._id + 'Completed'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.actionText}>Approve</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.dangerLight }]}
              onPress={() => updateStatus(p._id, 'Failed')}
              disabled={!!updating}
            >
              {updating === p._id + 'Failed'
                ? <ActivityIndicator size="small" color={COLORS.danger} />
                : <Text style={[styles.actionText, { color: COLORS.danger }]}>Reject</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.hero}>
        <View style={styles.headerCircle} />
        <View style={styles.heroContent}>
          <View>
            <Text style={styles.heroTitle}>Payment Admin</Text>
            <Text style={styles.heroSub}>{payments.length} total transactions</Text>
          </View>
          <View style={styles.revenueBadge}>
            <Text style={styles.revLabel}>Revenue</Text>
            <Text style={styles.revValue}>Rs. {totalRevenue.toFixed(0)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        {['Pending', 'Completed', 'Failed'].map(s => (
          <View key={s} style={[styles.statCard, { borderTopColor: STATUS_CONFIG[s].color }]}>
            <Text style={styles.statLabel}>{s}</Text>
            <Text style={[styles.statValue, { color: STATUS_CONFIG[s].color }]}>{payments.filter(p => p.status === s).length}</Text>
          </View>
        ))}
      </View>

      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['All', 'Pending', 'Completed', 'Failed'].map(item => {
            const active = filter === item;
            const cfg = STATUS_CONFIG[item] || { color: COLORS.secondary, icon: 'card-outline' };
            return (
              <TouchableOpacity
                key={item}
                style={[styles.chip, active && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                onPress={() => setFilter(item)}
              >
                <View style={styles.chipContent}>
                  <Ionicons name={cfg.icon} size={14} color={active ? COLORS.white : cfg.color} />
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
      <FlatList
        data={filtered}
        keyExtractor={i => i._id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={COLORS.primary} />}
        renderItem={renderItem}
        ListEmptyComponent={!loading && (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={60} color={COLORS.divider} />
            <Text style={styles.emptyTitle}>No Payments</Text>
            <Text style={styles.emptySub}>No transaction records found matching this filter.</Text>
          </View>
        )}
      />
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
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },
  
  headerSection: { marginBottom: 10 },
  hero: {
    backgroundColor: COLORS.secondary,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 35, paddingHorizontal: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerCircle: { position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { fontSize: 26, fontWeight: '900', color: COLORS.white },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  revenueBadge: { alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  revLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: '700' },
  revValue: { fontSize: 16, fontWeight: '900', color: COLORS.white },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: -20 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 12,
    borderTopWidth: 3,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 4 } }),
  },
  statLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textLight, textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: '900', marginTop: 2 },

  filterSection: { marginTop: 24, marginBottom: 10 },
  filterScroll: { paddingHorizontal: 20, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.divider,
  },
  chipContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.textMid },

  listContent: { paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20, marginHorizontal: 20,
    marginBottom: 12, padding: 16,
    borderWidth: 1, borderColor: COLORS.divider,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBg: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  amount: { fontSize: 17, fontWeight: '900', color: COLORS.text },
  meta: { fontSize: 13, color: COLORS.textMid, marginTop: 2, fontWeight: '600' },
  date: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 16 },
  actionBtn: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },

  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textLight, textAlign: 'center', paddingHorizontal: 50 },
});

export default PaymentManagementScreen;
