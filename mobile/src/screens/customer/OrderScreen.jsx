import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Platform, Animated, ScrollView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ordersAPI } from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { RADIUS, TOUCH_TARGET } from '../../constants/spacing';
import { FONTS } from '../../constants/typography';
import { SHADOWS } from '../../constants/colors';
import CoffeeLoader from '../../components/common/CoffeeLoader';
import { OrderCardSkeleton } from '../../components/common/SkeletonLoader';

const OrderScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const headerAnim = useRef(new Animated.Value(-30)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  const STATUS_COLORS = {
    Pending: colors.warning,
    Preparing: colors.accent,
    Ready: colors.success,
    Completed: colors.textLight,
    Cancelled: colors.danger,
  };

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
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [headerAnim, headerOpacity]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const activeOrders = orders.filter((o) => !['Completed', 'Cancelled'].includes(o.status));
  const pastOrders = orders.filter((o) => ['Completed', 'Cancelled'].includes(o.status));

  const renderActiveOrder = (order) => (
    <View
      key={order._id}
      style={[
        styles.activeCard,
        { backgroundColor: colors.surface, borderColor: colors.divider },
        SHADOWS.card.web,
      ]}
    >
      <View style={styles.activeHeader}>
        <View style={styles.activeType}>
          <View style={[styles.typeBadge, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons
              name={order.orderType === 'Dine-In' ? 'restaurant-outline' : order.orderType === 'Takeaway' ? 'bag-handle-outline' : 'bicycle-outline'}
              size={16}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.activeTypeText, { color: colors.textMid }]}>{order.orderType}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[order.status] + '18' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[order.status] }]}>{order.status}</Text>
        </View>
      </View>

      <Text style={[styles.activeTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
        Order #{order._id.slice(-5).toUpperCase()}
      </Text>

      {/* Item List */}
      <View style={[styles.activeItemList, { borderBottomColor: colors.divider }]}>
        {order.items?.map((item, idx) => (
          <View key={idx} style={styles.activeItemRow}>
            <Text style={[styles.activeItemName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.activeItemQty, { color: colors.textLight }]}>×{item.quantity}</Text>
          </View>
        ))}
      </View>

      {/* Progress Bar */}
      <View style={[styles.activeProgressBg, { backgroundColor: colors.surfaceAlt }]}>
        <View
          style={[
            styles.activeProgressFill,
            {
              width: order.status === 'Pending' ? '30%' : order.status === 'Preparing' ? '65%' : '95%',
              backgroundColor: STATUS_COLORS[order.status],
            },
          ]}
        />
      </View>

      <View style={styles.activeFooter}>
        <View>
          <Text style={[styles.activeDate, { color: colors.textMid }]}>
            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {order.tableNumber && (
            <Text style={[styles.activeMeta, { color: colors.textLight }]}>Table #{order.tableNumber}</Text>
          )}
        </View>
        <Text style={[styles.activeTotal, { color: colors.primary }]}>
          Rs. {order.totalAmount?.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  const renderHistoryItem = (item) => (
    <View
      key={item._id}
      style={[
        styles.historyCard,
        { backgroundColor: colors.surface, borderColor: colors.divider },
      ]}
    >
      <View style={[styles.historyIconBg, { backgroundColor: STATUS_COLORS[item.status] + '14' }]}>
        <Ionicons
          name={item.orderType === 'Dine-In' ? 'restaurant-outline' : item.orderType === 'Takeaway' ? 'bag-handle-outline' : 'bicycle-outline'}
          size={20}
          color={STATUS_COLORS[item.status]}
        />
      </View>
      <View style={styles.historyInfo}>
        <Text style={[styles.historyNum, { color: colors.text, fontFamily: FONTS.serif }]}>
          {item.orderType} #{item._id.slice(-5).toUpperCase()}
        </Text>
        <Text style={[styles.historyMeta, { color: colors.textMid }]}>
          {item.items?.length || 0} items • Rs. {item.totalAmount?.toFixed(2)}
        </Text>
        <Text style={[styles.historyDate, { color: colors.textLight }]}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '18' }]}>
        <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.divider,
            opacity: headerOpacity,
            transform: [{ translateY: headerAnim }],
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerSup, { color: colors.accent }]}>YOUR ORDERS</Text>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
              Recent Brews
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
            onPress={onRefresh}
            accessibilityRole="button"
            accessibilityLabel="Refresh orders"
          >
            <Ionicons name="refresh" size={19} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {activeOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.liveDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
                In Progress ({activeOrders.length})
              </Text>
            </View>
            {activeOrders.map(renderActiveOrder)}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONTS.serif }, activeOrders.length > 0 && { marginTop: 12 }]}>
            Order History
          </Text>

          {loading ? (
            <View style={{ gap: 12, marginTop: 12 }}>
              <OrderCardSkeleton />
              <OrderCardSkeleton />
            </View>
          ) : pastOrders.length === 0 && activeOrders.length === 0 ? (
            <View style={[styles.emptyWrap, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
              <CoffeeLoader
                message="No orders brewing just yet"
                subtext="Take a pause and choose something wonderful from our menu."
                size="normal"
              />
              <TouchableOpacity
                style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Home')}
                accessibilityRole="button"
              >
                <Text style={[styles.exploreBtnText, { color: colors.surface }]}>Browse Menu</Text>
              </TouchableOpacity>
            </View>
          ) : pastOrders.length === 0 ? (
            <View style={[styles.noHistoryBox, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
              <Ionicons name="receipt-outline" size={28} color={colors.textLight} />
              <Text style={[styles.noHistoryText, { color: colors.textLight }]}>No completed orders yet</Text>
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
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTop: {
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
  content: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  activeCard: {
    borderRadius: RADIUS.xl,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeType: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTypeText: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.sans },
  activeTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  activeItemList: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  activeItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  activeItemName: { fontSize: 14, fontWeight: '600', flex: 1, fontFamily: FONTS.sans },
  activeItemQty: { fontSize: 14, fontWeight: '700', marginLeft: 10 },
  activeProgressBg: {
    height: 6,
    borderRadius: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  activeProgressFill: { height: '100%', borderRadius: 3 },
  activeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  activeDate: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.sans },
  activeMeta: { fontSize: 11, marginTop: 2 },
  activeTotal: { fontSize: 17, fontWeight: '800', fontFamily: FONTS.sans },
  historyCard: {
    borderRadius: RADIUS.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  historyIconBg: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: { flex: 1 },
  historyNum: { fontSize: 14, fontWeight: '700' },
  historyMeta: { fontSize: 12, marginTop: 2, fontFamily: FONTS.sans },
  historyDate: { fontSize: 11, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginTop: 10,
  },
  exploreBtn: {
    minHeight: TOUCH_TARGET.min,
    paddingHorizontal: 22,
    borderRadius: RADIUS.base,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  exploreBtnText: { fontSize: 14, fontWeight: '700', fontFamily: FONTS.sans },
  noHistoryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: 8,
  },
  noHistoryText: { fontSize: 13, fontFamily: FONTS.sans },
});

export default OrderScreen;
