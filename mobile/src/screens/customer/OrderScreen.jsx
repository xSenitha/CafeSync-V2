import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ActivityIndicator, Platform, Animated, ScrollView, RefreshControl,
  Image, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ordersAPI } from '../../api';
import { COLORS } from '../../constants/colors';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const STATUS_COLORS = {
  Pending: COLORS.warning,
  Preparing: COLORS.primary,
  Ready: COLORS.success,
  Completed: COLORS.textLight,
  Cancelled: COLORS.danger,
};

const OrderScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const headerAnim = useRef(new Animated.Value(-40)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  const fetchData = async () => {
    try {
      const ordersRes = await ordersAPI.getMyOrders();
      setOrders(ordersRes.data.data || []);
    } catch (e) {
      console.log('Order fetch error:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Re-fetch data whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
      const timer = setInterval(fetchData, 10000);
      return () => clearInterval(timer);
    }, [])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const activeOrders = orders.filter(o => !['Completed', 'Cancelled'].includes(o.status));
  const pastOrders = orders.filter(o => ['Completed', 'Cancelled'].includes(o.status));

  const renderActiveOrder = (order) => (
    <View key={order._id} style={styles.activeCard}>
      <View style={styles.activeHeader}>
        <View style={styles.activeType}>
          <Ionicons 
            name={order.orderType === 'Dine-In' ? 'restaurant' : order.orderType === 'Takeaway' ? 'bag-handle' : 'bicycle'} 
            size={18} color={COLORS.primary} 
          />
          <Text style={styles.activeTypeText}>{order.orderType}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[order.status] + '18' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[order.status] }]}>{order.status}</Text>
        </View>
      </View>
      
      <Text style={styles.activeTitle}>Order #{order._id.slice(-5).toUpperCase()}</Text>
      
      {/* Item List */}
      <View style={styles.activeItemList}>
        {order.items?.map((item, idx) => (
          <View key={idx} style={styles.activeItemRow}>
            <Text style={styles.activeItemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.activeItemQty}>×{item.quantity}</Text>
          </View>
        ))}
      </View>

      <View style={styles.activeProgressBg}>
        <View style={[styles.activeProgressFill, { 
          width: order.status === 'Pending' ? '25%' : order.status === 'Preparing' ? '60%' : '90%',
          backgroundColor: STATUS_COLORS[order.status] 
        }]} />
      </View>

      <View style={styles.activeFooter}>
        <View>
          <Text style={styles.activeDate}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          {order.tableNumber && <Text style={styles.activeMeta}>Table #{order.tableNumber}</Text>}
        </View>
        <Text style={styles.activeTotal}>Rs. {order.totalAmount?.toFixed(2)}</Text>
      </View>
    </View>
  );

  const renderHistoryItem = (item) => (
    <View key={item._id} style={styles.historyCard}>
      <View style={[styles.historyIconBg, { backgroundColor: STATUS_COLORS[item.status] + '18' }]}>
        <Ionicons 
          name={item.orderType === 'Dine-In' ? 'restaurant' : item.orderType === 'Takeaway' ? 'bag-handle' : 'bicycle'} 
          size={22} 
          color={STATUS_COLORS[item.status]} 
        />
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyNum}>{item.orderType} #{item._id.slice(-5).toUpperCase()}</Text>
        <Text style={styles.historyMeta}>{item.items?.length || 0} items • Rs. {item.totalAmount?.toFixed(2)}</Text>
        <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '18' }]}>
        <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerAnim }] }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>My Orders</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {activeOrders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Orders</Text>
            {activeOrders.map(renderActiveOrder)}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, activeOrders.length > 0 && { marginTop: 10 }]}>Order History</Text>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : pastOrders.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No past orders yet</Text>
            </View>
          ) : (
            pastOrders.map(renderHistoryItem)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 25, paddingHorizontal: 20,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    ...Platform.select({ ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10 }, android: { elevation: 6 } })
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: COLORS.white },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 15 },

  activeCard: { 
    backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.divider,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 4 } })
  },
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  activeType: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeTypeText: { fontSize: 12, fontWeight: '700', color: COLORS.textMid },
  activeTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text, marginBottom: 12 },
  
  activeItemList: { marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  activeItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  activeItemName: { fontSize: 14, color: COLORS.text, fontWeight: '600', flex: 1 },
  activeItemQty: { fontSize: 14, color: COLORS.textLight, fontWeight: '700', marginLeft: 10 },

  activeProgressBg: { height: 8, backgroundColor: COLORS.divider, borderRadius: 4, marginBottom: 15, overflow: 'hidden' },
  activeProgressFill: { height: '100%', borderRadius: 4 },
  activeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  activeDate: { fontSize: 12, color: COLORS.textMid, fontWeight: '600' },
  activeMeta: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  activeTotal: { fontSize: 18, fontWeight: '900', color: COLORS.primary },

  historyCard: { 
    backgroundColor: COLORS.surface, borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
    borderWidth: 1, borderColor: 'transparent'
  },
  historyIconBg: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  historyInfo: { flex: 1 },
  historyNum: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  historyMeta: { fontSize: 13, color: COLORS.textMid, marginTop: 2 },
  historyDate: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '800' },

  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textLight, fontWeight: '600' },
});

export default OrderScreen;
