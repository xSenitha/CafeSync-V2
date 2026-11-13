import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform, useWindowDimensions, RefreshControl,
  Image, Modal, TextInput, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { ordersAPI, reservationsAPI, menuAPI, paymentsAPI, cardsAPI } from '../../api';
import apiClient from '../../api/client';
import { Alert } from '../../utils/alert';
import { RADIUS, TOUCH_TARGET } from '../../constants/spacing';
import { FONTS } from '../../constants/typography';
import { SHADOWS } from '../../constants/colors';
import { MenuCardSkeleton } from '../../components/common/SkeletonLoader';

const ORDER_TYPES = [
  { key: 'Dine-In', icon: 'restaurant-outline', label: 'Dine-In', desc: 'Savor at the cafe' },
  { key: 'Takeaway', icon: 'bag-handle-outline', label: 'Takeaway', desc: 'Pick up & go' },
  { key: 'Online Delivery', icon: 'bicycle-outline', label: 'Delivery', desc: 'Delivered warm' },
];

const PAYMENT_OPTIONS = {
  'Dine-In': [{ key: 'Cash', label: 'Cash at counter', icon: 'cash-outline' }, { key: 'Card', label: 'Card (Debit/Credit)', icon: 'card-outline' }],
  'Takeaway': [{ key: 'Cash', label: 'Cash at counter', icon: 'cash-outline' }, { key: 'Card', label: 'Card (Debit/Credit)', icon: 'card-outline' }],
  'Online Delivery': [{ key: 'Cash', label: 'Cash on Delivery', icon: 'cash-outline' }, { key: 'Card', label: 'Card (Debit/Credit)', icon: 'card-outline' }],
};

const TABLES = Array.from({ length: 20 }, (_, i) => i + 1);
const TIME_SLOTS = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'];
const CATEGORY_ICONS = {
  All: 'grid-outline',
  Coffee: 'cafe-outline',
  Tea: 'leaf-outline',
  Snacks: 'fast-food-outline',
  Desserts: 'ice-cream-outline',
  Beverages: 'wine-outline',
  Other: 'restaurant-outline',
};

const MenuImage = ({ item, colors }) => {
  const [failed, setFailed] = useState(false);
  const image = item.image;
  const uri = image && image !== 'no-photo.jpg'
    ? (/^https?:\/\//i.test(image) ? image : `${apiClient.defaults.baseURL.replace(/\/api\/?$/, '')}/uploads/${image}`)
    : null;

  useEffect(() => { setFailed(false); }, [image]);

  return (
    <View style={[styles.menuImageWrap, { backgroundColor: colors.surfaceAlt }]}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={styles.menuImage}
          onError={() => setFailed(true)}
          accessibilityLabel={item.name}
        />
      ) : (
        <View style={styles.imageFallback}>
          <View style={[styles.imageRing, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
            <Ionicons name={CATEGORY_ICONS[item.category] || 'cafe-outline'} size={34} color={colors.primary} />
          </View>
          <Text style={[styles.imageCaption, { color: colors.textLight }]}>{item.category || 'Handcrafted'}</Text>
        </View>
      )}
      {item.stock <= 0 && (
        <View style={[styles.soldOut, { backgroundColor: colors.surface }]}>
          <Text style={[styles.soldOutText, { color: colors.danger }]}>Sold out</Text>
        </View>
      )}
    </View>
  );
};

const HomeScreen = ({ navigation, route }) => {
  const { user } = useContext(AuthContext);
  const { cart, addToCart, removeFromCart, removeItem, cartCount, cartTotal, clearCart } = useCart();
  const { colors, isDark, toggleTheme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  const scrollRef = useRef(null);
  const menuHeaderRef = useRef(null);
  const cartBounceAnim = useRef(new Animated.Value(1)).current;

  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCat, setActiveCat] = useState('All');
  const [search, setSearch] = useState('');
  const [menuError, setMenuError] = useState('');
  const [activityError, setActivityError] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderType, setOrderType] = useState('Dine-In');
  const [tableNumber, setTableNumber] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [reservationTime, setReservationTime] = useState('12:00 PM');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [savedCards, setSavedCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loadingCards, setLoadingCards] = useState(false);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (route?.params?.openCart) {
      setOrderSuccess(false);
      setShowCheckout(true);
      navigation.setParams({ openCart: undefined });
    }
  }, [route?.params?.openCart, navigation]);

  useEffect(() => {
    const opts = PAYMENT_OPTIONS[orderType];
    setPaymentMethod(opts[0].key);
    if (orderType !== 'Dine-In') setTableNumber(null);
  }, [orderType]);

  const fetchSavedCards = useCallback(async () => {
    setLoadingCards(true);
    try {
      const res = await cardsAPI.getAll();
      const cards = res.data.data || [];
      setSavedCards(cards);
      const def = cards.find(c => c.isDefault) || cards[0];
      setSelectedCard(current => cards.find(card => card._id === current?._id) || def || null);
    } catch (e) {
      console.log(e?.message);
    } finally {
      setLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    if (showCheckout && orderType === 'Dine-In') {
      fetchAvailability();
    }
    if (showCheckout && paymentMethod === 'Card') {
      fetchSavedCards();
    }
  }, [showCheckout, orderType, paymentMethod, fetchSavedCards]);

  const fetchAvailability = async () => {
    try {
      const res = await reservationsAPI.getAvailability();
      setBookedSlots(res.data.data || []);
    } catch (e) {
      console.log(e?.message);
    }
  };

  const handlePlaceOrder = async () => {
    if (orderType === 'Dine-In' && !tableNumber) {
      Alert.alert('Table Required', 'Please select a table for Dine-In orders.');
      return;
    }
    if (orderType === 'Online Delivery' && !deliveryAddress.trim()) {
      Alert.alert('Address Required', 'Please enter a delivery address.');
      return;
    }

    if (paymentMethod === 'Card' && !selectedCard) {
      Alert.alert('No Card Selected', 'Please select a saved card or add one from your Profile.');
      return;
    }
    if (!cartCount) return;

    setPlacing(true);
    try {
      if (orderType === 'Dine-In') {
        try {
          await reservationsAPI.createReservation({
            tableNumber,
            guests: 1,
            date: new Date().toISOString().split('T')[0],
            time: reservationTime,
            specialRequests: 'Auto-reserved via Order Checkout',
          });
        } catch (e) {
          console.log('Reservation auto-create error', e.message);
        }
      }

      const orderItems = Object.entries(cart).map(([id, qty]) => ({
        product: id,
        quantity: qty.quantity,
      }));

      const res = await ordersAPI.createOrder({
        items: orderItems,
        orderType,
        tableNumber,
        deliveryAddress,
        paymentMethod,
      });

      const order = res.data.data;

      if (paymentMethod === 'Card') {
        await paymentsAPI.createPayment({
          order: order._id,
          amount: cartTotal,
          paymentMethod: 'Card',
          cardId: selectedCard._id,
          transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        });
      }

      setLastOrder({
        _id: order._id,
        orderType,
        tableNumber,
        reservationTime,
        paymentMethod,
        total: cartTotal,
      });
      setOrderSuccess(true);
      clearCart();
      fetchData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const fetchData = async () => {
    const [ordRes, resRes, menuRes] = await Promise.allSettled([
      ordersAPI.getMyOrders(),
      reservationsAPI.getMyReservations(),
      menuAPI.getAll(),
    ]);
    if (ordRes.status === 'fulfilled') setOrders(ordRes.value.data.data || []);
    if (resRes.status === 'fulfilled') setReservations(resRes.value.data.data || []);
    setActivityError(ordRes.status === 'rejected' || resRes.status === 'rejected');
    if (menuRes.status === 'fulfilled') {
      setMenu(menuRes.value.data.data || []);
      setMenuError('');
    } else {
      setMenuError('We could not refresh the menu. Please pull down to retry.');
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Good Morning', icon: 'sunny-outline' };
    if (h < 17) return { text: 'Good Afternoon', icon: 'partly-sunny-outline' };
    return { text: 'Good Evening', icon: 'moon-outline' };
  };

  const addItem = (item) => {
    if ((cart[item._id]?.quantity || 0) >= item.stock) {
      Alert.alert('Stock limit', 'You already have all available portions of this item in your bag.');
      return;
    }
    addToCart(item);

    // Cart bounce micro-interaction
    Animated.sequence([
      Animated.timing(cartBounceAnim, { toValue: 1.18, duration: 120, useNativeDriver: true }),
      Animated.timing(cartBounceAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
  };

  const scrollToMenu = () => {
    scrollRef.current?.scrollTo({ y: 380, animated: true });
  };

  const activeOrders = orders.filter((o) => !['Completed', 'Cancelled'].includes(o.status));
  const pendingRes = reservations.filter((r) => ['Pending', 'Confirmed'].includes(r.status));
  const categories = ['All', ...new Set(menu.map((item) => item.category).filter(Boolean))];
  const visibleMenu = menu.filter(
    (item) =>
      (activeCat === 'All' || item.category === activeCat) &&
      `${item.name} ${item.description || ''}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  const contentWidth = Math.min(windowWidth, 1120) - (windowWidth < 380 ? 28 : 40);
  const columns = windowWidth >= 1000 ? 4 : windowWidth >= 700 ? 3 : windowWidth >= 340 ? 2 : 1;
  const cardWidth = (contentWidth - (columns - 1) * 16) / columns;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Brand Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.background, borderBottomColor: colors.divider }]}>
        <View style={styles.topBarInner}>
          <View style={styles.brand}>
            <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
              <Ionicons name="cafe" size={20} color={colors.surface} />
            </View>
            <View>
              <Text style={[styles.brandText, { color: colors.text, fontFamily: FONTS.serif }]}>
                Cafe<Text style={{ color: colors.accent }}>Sync</Text>
                <Text style={{ color: colors.copper }}>.</Text>
              </Text>
              <Text style={[styles.brandSub, { color: colors.textLight }]}>A little time for yourself</Text>
            </View>
          </View>

          <View style={styles.topBarActions}>
            <TouchableOpacity
              style={[styles.themePill, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel={isDark ? 'Switch to Day Cafe theme' : 'Switch to Night Cafe theme'}
            >
              <Ionicons name={isDark ? 'sunny' : 'moon'} size={17} color={colors.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.profileButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
              onPress={() => navigation.navigate('Profile')}
              accessibilityRole="button"
              accessibilityLabel="Open your profile"
            >
              <Text style={[styles.profileInitial, { color: colors.primary }]}>
                {(user?.name || 'You').slice(0, 1).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, windowWidth < 380 && { paddingHorizontal: 14 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Friendly Greeting */}
        <View style={styles.greetingRow}>
          <Ionicons name={getGreeting().icon} size={16} color={colors.accent} />
          <Text style={[styles.greeting, { color: colors.textMid, fontFamily: FONTS.sans }]}>
            {getGreeting().text}, {user?.name?.split(' ')[0] || 'friend'}
          </Text>
        </View>

        {/* HERO / LANDING: Emotional Centerpiece */}
        <View
          style={[
            styles.hero,
            { backgroundColor: isDark ? colors.surfaceAlt : colors.surfaceAlt, borderColor: colors.divider },
            SHADOWS.card.web,
            windowWidth >= 700 && styles.heroWide,
          ]}
        >
          <View style={styles.heroCopy}>
            <View style={styles.taglineBadge}>
              <Ionicons name="sparkles" size={12} color={colors.accent} />
              <Text style={[styles.eyebrow, { color: colors.accent }]}>YOUR SLOW CAFE MOMENT</Text>
            </View>

            {/* Tagline as the emotional centerpiece */}
            <Text
              style={[
                styles.heroTitle,
                { color: colors.text, fontFamily: FONTS.serif },
                windowWidth >= 700 && { fontSize: 44, lineHeight: 52 },
              ]}
            >
              A little time{'\n'}for yourself.
            </Text>

            <Text style={[styles.heroDescription, { color: colors.textMid }]}>
              Handcrafted roasts, warm bakery treats, and a quiet corner to unwind. Order ahead or find your cozy table.
            </Text>

            <View style={styles.heroActionRow}>
              <TouchableOpacity
                style={[styles.heroPrimaryBtn, { backgroundColor: colors.primary }, SHADOWS.subtle.web]}
                onPress={scrollToMenu}
                accessibilityRole="button"
                accessibilityLabel="Explore the cafe menu"
                activeOpacity={0.88}
              >
                <Text style={[styles.heroPrimaryBtnText, { color: colors.surface }]}>Explore Menu</Text>
                <Ionicons name="arrow-down" size={17} color={colors.surface} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.heroSecondaryBtn, { borderColor: colors.divider, backgroundColor: colors.surface }]}
                onPress={() => navigation.navigate('Reservations')}
                accessibilityRole="button"
                accessibilityLabel="Reserve a table"
                activeOpacity={0.85}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={[styles.heroSecondaryBtnText, { color: colors.primary }]}>Book Table</Text>
              </TouchableOpacity>
            </View>
          </View>

          {windowWidth >= 640 && (
            <View style={styles.heroArt}>
              <View style={[styles.heroOrbit, { backgroundColor: colors.surface, borderColor: colors.divider }]} />
              <View style={[styles.heroCup, { backgroundColor: colors.background, borderColor: colors.divider }]}>
                <Ionicons name="cafe" size={88} color={colors.primary} />
              </View>
              <View style={[styles.heroArtLabel, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
                <Ionicons name="heart" size={14} color={colors.accent} />
                <Text style={[styles.heroArtText, { color: colors.textMid }]}>Brewed with patience</Text>
              </View>
            </View>
          )}
        </View>

        {/* AI Cafe Companion Banner */}
        <TouchableOpacity
          style={[styles.assistantCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Assistant')}
          accessibilityRole="button"
          accessibilityLabel="Ask the cafe assistant for recommendations"
        >
          <View style={[styles.assistantIcon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="sparkles" size={22} color={colors.accent} />
          </View>
          <View style={styles.assistantCopy}>
            <Text style={[styles.assistantEyebrow, { color: colors.accent }]}>MEET YOUR CAFE COMPANION</Text>
            <Text style={[styles.assistantTitle, { color: colors.text }]}>Need help choosing?</Text>
            <Text style={[styles.assistantDescription, { color: colors.textMid }]}>
              Ask about flavors, dietary picks, or check your orders.
            </Text>
          </View>
          <View style={[styles.assistantArrow, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Menu Section Header */}
        <View ref={menuHeaderRef} style={styles.menuHeading}>
          <View>
            <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>FRESH FINDS & SIGNATURE ROASTS</Text>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
              What are you craving?
            </Text>
          </View>
          <Text style={[styles.menuCount, { color: colors.textLight }]}>
            {loading ? '' : `${visibleMenu.length} items`}
          </Text>
        </View>

        {/* Search Input Box */}
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
          <Ionicons name="search-outline" size={20} color={colors.textLight} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, fontFamily: FONTS.sans }]}
            placeholder="Search espresso, matcha, pastries..."
            placeholderTextColor={colors.textLight}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search the cafe menu"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search text"
              style={styles.searchClearBtn}
            >
              <Ionicons name="close-circle" size={20} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Horizontal Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
        >
          {categories.map((category) => {
            const isActive = category === activeCat;
            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderColor: isActive ? colors.primary : colors.divider,
                  },
                ]}
                onPress={() => setActiveCat(category)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={CATEGORY_ICONS[category] || 'restaurant-outline'}
                  size={16}
                  color={isActive ? colors.surface : colors.textMid}
                />
                <Text
                  style={[
                    styles.categoryText,
                    { color: isActive ? colors.surface : colors.textMid },
                    isActive && styles.categoryTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Error Banner if Menu Load Fails */}
        {!!menuError && (
          <View style={[styles.errorBanner, { backgroundColor: colors.surface, borderColor: colors.danger }]} accessibilityRole="alert">
            <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.textMid }]}>{menuError}</Text>
            <TouchableOpacity onPress={onRefresh} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Menu Grid or Skeleton Loader */}
        {loading ? (
          <View style={styles.menuGrid}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <MenuCardSkeleton key={idx} width={cardWidth} />
            ))}
          </View>
        ) : visibleMenu.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name={search ? 'search-outline' : 'cafe-outline'} size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
              {search || activeCat !== 'All' ? 'No matches just yet' : 'The menu is brewing'}
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.textLight }]}>
              {search || activeCat !== 'All'
                ? 'Try searching with another word or view all categories.'
                : 'Our baristas are preparing fresh offerings. Check back shortly.'}
            </Text>
            {(search || activeCat !== 'All') && (
              <TouchableOpacity
                style={[styles.resetButton, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => { setSearch(''); setActiveCat('All'); }}
                accessibilityRole="button"
              >
                <Text style={[styles.retryText, { color: colors.primary }]}>Show all items</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.menuGrid}>
            {visibleMenu.map((item) => {
              const quantity = cart[item._id]?.quantity || 0;
              const unavailable = item.stock <= 0;
              return (
                <View
                  key={item._id}
                  style={[
                    styles.menuCard,
                    { width: cardWidth, backgroundColor: colors.surface, borderColor: colors.divider },
                    SHADOWS.card.web,
                  ]}
                >
                  <MenuImage item={item} colors={colors} />
                  <View style={styles.menuCardBody}>
                    <Text style={[styles.itemCategory, { color: colors.accent }]}>
                      {item.category?.toUpperCase() || 'CAFE'}
                    </Text>
                    <Text
                      style={[styles.itemName, { color: colors.text, fontFamily: FONTS.serif }]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.itemDescription, { color: colors.textLight }]}
                      numberOfLines={2}
                    >
                      {item.description || 'Made with care for your relaxing break.'}
                    </Text>

                    <View style={styles.itemFooter}>
                      <Text style={[styles.itemPrice, { color: colors.text }]}>
                        Rs. {Number(item.price).toFixed(2)}
                      </Text>

                      {quantity > 0 ? (
                        <View style={[styles.quantityControl, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => removeFromCart(item._id)}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove one ${item.name}`}
                          >
                            <Ionicons name="remove" size={16} color={colors.primary} />
                          </TouchableOpacity>
                          <Text style={[styles.quantity, { color: colors.primary }]}>{quantity}</Text>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => addItem(item)}
                            disabled={quantity >= item.stock}
                            accessibilityRole="button"
                            accessibilityLabel={`Add one ${item.name}`}
                            accessibilityState={{ disabled: quantity >= item.stock }}
                          >
                            <Ionicons
                              name="add"
                              size={16}
                              color={quantity >= item.stock ? colors.textLight : colors.primary}
                            />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.addButton,
                            { backgroundColor: unavailable ? colors.surfaceAlt : colors.primary },
                          ]}
                          disabled={unavailable}
                          onPress={() => addItem(item)}
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${item.name} to order`}
                          accessibilityState={{ disabled: unavailable }}
                          activeOpacity={0.85}
                        >
                          <Ionicons
                            name="add"
                            size={22}
                            color={unavailable ? colors.textLight : colors.surface}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Quick Activity Cards */}
        <View style={styles.activityHeading}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
            Your Cafe Ritual
          </Text>
        </View>

        {activityError ? (
          <TouchableOpacity
            style={[styles.activityNotice, { backgroundColor: colors.surface, borderColor: colors.divider }]}
            onPress={onRefresh}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            <Text style={[styles.activityNoticeText, { color: colors.textMid }]}>
              Tap to refresh your orders and reservations.
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activityRow}>
            <TouchableOpacity
              style={[styles.activityCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}
              onPress={() => navigation.navigate('Orders')}
              accessibilityRole="button"
              activeOpacity={0.85}
            >
              <View style={[styles.activityIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="bag-handle-outline" size={22} color={colors.accent} />
              </View>
              <Text style={[styles.activityValue, { color: colors.text }]}>
                {loading ? '…' : activeOrders.length}
              </Text>
              <Text style={[styles.activityLabel, { color: colors.textMid }]}>Active orders</Text>
              <Ionicons style={styles.activityArrow} name="arrow-forward" size={16} color={colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.activityCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}
              onPress={() => navigation.navigate('Reservations')}
              accessibilityRole="button"
              activeOpacity={0.85}
            >
              <View style={[styles.activityIcon, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="calendar-outline" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.activityValue, { color: colors.text }]}>
                {loading ? '…' : pendingRes.length}
              </Text>
              <Text style={[styles.activityLabel, { color: colors.textMid }]}>Reservations</Text>
              <Ionicons style={styles.activityArrow} name="arrow-forward" size={16} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.footerNote, { color: colors.textLight }]}>
          CafeSync · A little time for yourself.
        </Text>
      </ScrollView>

      {/* Floating Bottom Cart Dock (Thumb Reach) */}
      {cartCount > 0 && (
        <View pointerEvents="box-none" style={styles.cartDock}>
          <Animated.View style={{ transform: [{ scale: cartBounceAnim }], width: Math.min(contentWidth, 600) }}>
            <TouchableOpacity
              style={[styles.floatingCart, { backgroundColor: colors.primary }, SHADOWS.floating.web]}
              onPress={() => {
                setOrderSuccess(false);
                setShowCheckout(true);
              }}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={`Review bag with ${cartCount} items, total ${cartTotal.toFixed(2)} rupees`}
            >
              <View style={styles.cartInfo}>
                <View style={[styles.cartBadge, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.cartBadgeText, { color: colors.white }]}>{cartCount}</Text>
                </View>
                <View>
                  <Text style={[styles.cartLabel, { color: colors.surfaceAlt }]}>Review your bag</Text>
                  <Text style={[styles.floatingCartTotal, { color: colors.surface }]}>
                    Rs. {cartTotal.toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={[styles.checkoutArrow, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Ionicons name="arrow-forward" size={20} color={colors.surface} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Checkout Bottom Sheet Modal */}
      <Modal
        visible={showCheckout}
        animationType="slide"
        transparent
        onRequestClose={() => !placing && setShowCheckout(false)}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.divider,
                width: Math.min(windowWidth, 640),
              },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.divider }]} />

            {orderSuccess ? (
              <View style={styles.successWrap}>
                <Ionicons name="checkmark-circle" size={76} color={colors.success} style={{ marginBottom: 12 }} />
                <Text style={[styles.successTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
                  Order Received!
                </Text>
                <Text style={[styles.successSub, { color: colors.textMid }]}>
                  We are preparing your handcrafted order with care.
                </Text>

                {lastOrder && (
                  <View style={[styles.successDetails, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}>
                    <View style={styles.successRow}>
                      <Text style={[styles.successDetailLabel, { color: colors.textLight }]}>Order Type</Text>
                      <Text style={[styles.successDetailValue, { color: colors.text }]}>{lastOrder.orderType}</Text>
                    </View>
                    {lastOrder.tableNumber && (
                      <View style={styles.successRow}>
                        <Text style={[styles.successDetailLabel, { color: colors.textLight }]}>Table</Text>
                        <Text style={[styles.successDetailValue, { color: colors.text }]}>
                          #{lastOrder.tableNumber} at {lastOrder.reservationTime}
                        </Text>
                      </View>
                    )}
                    <View style={styles.successRow}>
                      <Text style={[styles.successDetailLabel, { color: colors.textLight }]}>Payment</Text>
                      <Text style={[styles.successDetailValue, { color: colors.text }]}>{lastOrder.paymentMethod}</Text>
                    </View>
                    <View style={[styles.successRow, styles.successTotalRow, { borderTopColor: colors.divider }]}>
                      <Text style={[styles.successTotalLabel, { color: colors.text }]}>Total Amount</Text>
                      <Text style={[styles.successTotalValue, { color: colors.primary }]}>
                        Rs. {lastOrder.total.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.successBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setShowCheckout(false);
                    navigation.navigate('Orders');
                  }}
                  accessibilityRole="button"
                >
                  <Text style={[styles.successBtnText, { color: colors.surface }]}>Track in Orders</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
                      Review Bag
                    </Text>
                    <Text style={[styles.sheetSub, { color: colors.textLight }]}>
                      {cartCount} {cartCount === 1 ? 'item' : 'items'} ready for checkout
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowCheckout(false)}
                    style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
                    accessibilityRole="button"
                    accessibilityLabel="Close checkout dialog"
                  >
                    <Ionicons name="close" size={20} color={colors.textMid} />
                  </TouchableOpacity>
                </View>

                {/* Cart Items List */}
                <View style={[styles.cartItems, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}>
                  {Object.entries(cart).length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                      <Ionicons name="bag-outline" size={44} color={colors.textLight} />
                      <Text style={{ color: colors.textMid, marginTop: 10, fontWeight: '600' }}>
                        Your bag is currently empty
                      </Text>
                      <TouchableOpacity
                        style={[styles.successBtn, { marginTop: 16, paddingVertical: 12, backgroundColor: colors.primary }]}
                        onPress={() => setShowCheckout(false)}
                      >
                        <Text style={[styles.successBtnText, { color: colors.surface }]}>Back to Menu</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {Object.entries(cart).map(([id, { item, quantity }]) => (
                        <View key={id} style={[styles.cartRow, { borderBottomColor: colors.divider }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.cartItemName, { color: colors.text }]} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Text style={[styles.cartItemPrice, { color: colors.textLight }]}>
                              Rs. {Number(item.price).toFixed(2)}
                            </Text>
                          </View>

                          <View style={[styles.modalQtyRow, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
                            <TouchableOpacity
                              style={styles.modalQtyBtn}
                              onPress={() => removeFromCart(id)}
                              accessibilityRole="button"
                              accessibilityLabel={`Decrease quantity for ${item.name}`}
                            >
                              <Ionicons name="remove" size={14} color={colors.textMid} />
                            </TouchableOpacity>
                            <Text style={[styles.modalQtyText, { color: colors.text }]}>{quantity}</Text>
                            <TouchableOpacity
                              style={styles.modalQtyBtn}
                              onPress={() => addItem(item)}
                              accessibilityRole="button"
                              accessibilityLabel={`Increase quantity for ${item.name}`}
                            >
                              <Ionicons name="add" size={14} color={colors.primary} />
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => removeItem(id)}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${item.name} from bag`}
                          >
                            <Ionicons name="trash-outline" size={19} color={colors.danger} />
                          </TouchableOpacity>

                          <Text style={[styles.cartItemTotal, { color: colors.primary }]}>
                            Rs. {(item.price * quantity).toFixed(2)}
                          </Text>
                        </View>
                      ))}

                      <View style={[styles.checkoutTotal, { borderTopColor: colors.divider }]}>
                        <Text style={[styles.cartTotalLabel, { color: colors.text }]}>Total</Text>
                        <Text style={[styles.cartTotalAmt, { color: colors.primary }]}>
                          Rs. {cartTotal.toFixed(2)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {Object.entries(cart).length > 0 && (
                  <>
                    <Text style={[styles.stepLabel, { color: colors.text }]}>1. Dining Preference</Text>
                    <View style={styles.orderTypeRow}>
                      {ORDER_TYPES.map((t) => {
                        const active = orderType === t.key;
                        return (
                          <TouchableOpacity
                            key={t.key}
                            style={[
                              styles.orderTypeBtn,
                              {
                                backgroundColor: active ? colors.surface : colors.surfaceAlt,
                                borderColor: active ? colors.primary : colors.divider,
                              },
                            ]}
                            onPress={() => setOrderType(t.key)}
                            accessibilityRole="button"
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={t.icon}
                              size={22}
                              color={active ? colors.primary : colors.textLight}
                            />
                            <Text
                              style={[
                                styles.orderTypeLabel,
                                { color: active ? colors.primary : colors.text },
                              ]}
                            >
                              {t.label}
                            </Text>
                            <Text style={[styles.orderTypeDesc, { color: colors.textLight }]}>{t.desc}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {orderType === 'Dine-In' && (
                      <>
                        <Text style={[styles.stepLabel, { color: colors.text }]}>2. Select Table & Arrival Time</Text>
                        <Text style={[styles.subStepLabel, { color: colors.textLight }]}>Choose a table (1–20):</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                          <View style={styles.tableGrid}>
                            {TABLES.map((n) => (
                              <TouchableOpacity
                                key={n}
                                style={[
                                  styles.tableBtn,
                                  {
                                    backgroundColor: tableNumber === n ? colors.primary : colors.surfaceAlt,
                                    borderColor: tableNumber === n ? colors.primary : colors.divider,
                                  },
                                ]}
                                onPress={() => setTableNumber(n)}
                                accessibilityRole="button"
                                accessibilityLabel={`Table number ${n}`}
                              >
                                <Text
                                  style={[
                                    styles.tableBtnText,
                                    { color: tableNumber === n ? colors.surface : colors.text },
                                  ]}
                                >
                                  {n}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>

                        <Text style={[styles.subStepLabel, { color: colors.textLight }]}>Select arrival slot:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                          <View style={styles.tableGrid}>
                            {TIME_SLOTS.map((t) => {
                              const isBooked = tableNumber && bookedSlots.some((b) => b.tableNumber === tableNumber && b.time === t);
                              const isSelected = reservationTime === t;
                              return (
                                <TouchableOpacity
                                  key={t}
                                  style={[
                                    styles.timeBtn,
                                    {
                                      backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                                      borderColor: isSelected ? colors.primary : colors.divider,
                                    },
                                    isBooked && { opacity: 0.4 },
                                  ]}
                                  onPress={() => !isBooked && setReservationTime(t)}
                                  activeOpacity={isBooked ? 1 : 0.8}
                                  disabled={isBooked}
                                  accessibilityRole="button"
                                >
                                  <Text
                                    style={[
                                      styles.timeBtnText,
                                      { color: isSelected ? colors.surface : colors.text },
                                    ]}
                                  >
                                    {t}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </>
                    )}

                    {orderType === 'Online Delivery' && (
                      <>
                        <Text style={[styles.stepLabel, { color: colors.text }]}>2. Delivery Address</Text>
                        <TextInput
                          style={[
                            styles.addressInput,
                            {
                              backgroundColor: colors.surfaceAlt,
                              borderColor: colors.divider,
                              color: colors.text,
                              fontFamily: FONTS.sans,
                            },
                          ]}
                          placeholder="Enter your delivery street address & apartment/suite..."
                          placeholderTextColor={colors.textLight}
                          value={deliveryAddress}
                          onChangeText={setDeliveryAddress}
                          multiline
                        />
                      </>
                    )}

                    <Text style={[styles.stepLabel, { color: colors.text }]}>3. Payment Method</Text>
                    <View style={styles.paymentOpts}>
                      {PAYMENT_OPTIONS[orderType].map((opt) => {
                        const active = paymentMethod === opt.key;
                        return (
                          <TouchableOpacity
                            key={opt.key}
                            style={[
                              styles.payOpt,
                              {
                                backgroundColor: active ? colors.surface : colors.surfaceAlt,
                                borderColor: active ? colors.primary : colors.divider,
                              },
                            ]}
                            onPress={() => setPaymentMethod(opt.key)}
                            accessibilityRole="button"
                          >
                            <Ionicons
                              name={opt.icon}
                              size={20}
                              color={active ? colors.primary : colors.textLight}
                            />
                            <Text
                              style={[
                                styles.payOptLabel,
                                { color: active ? colors.primary : colors.textMid },
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {paymentMethod === 'Card' && (
                      <View style={styles.cardPickerSection}>
                        <Text style={[styles.cardPickerLabel, { color: colors.textLight }]}>Saved Payment Cards</Text>
                        {loadingCards ? (
                          <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
                        ) : savedCards.length === 0 ? (
                          <TouchableOpacity
                            style={[styles.noCardBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
                            onPress={() => {
                              setShowCheckout(false);
                              navigation.navigate('SavedCards');
                            }}
                          >
                            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.noCardTitle, { color: colors.text }]}>No saved cards found</Text>
                              <Text style={[styles.noCardSub, { color: colors.textLight }]}>Tap to add one in your Profile</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                          </TouchableOpacity>
                        ) : (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                            {savedCards.map((card) => {
                              const isSelected = selectedCard?._id === card._id;
                              const expiry = `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`;
                              return (
                                <TouchableOpacity
                                  key={card._id}
                                  style={[
                                    styles.miniCard,
                                    {
                                      backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                                      borderColor: isSelected ? colors.primary : colors.divider,
                                    },
                                  ]}
                                  onPress={() => setSelectedCard(card)}
                                  activeOpacity={0.8}
                                >
                                  <View style={styles.miniCardTop}>
                                    <Ionicons
                                      name="card"
                                      size={18}
                                      color={isSelected ? colors.surface : colors.textMid}
                                    />
                                    {card.isDefault && (
                                      <View style={[styles.miniDefaultDot, { backgroundColor: colors.accent }]} />
                                    )}
                                  </View>
                                  <Text
                                    style={[
                                      styles.miniCardNum,
                                      { color: isSelected ? colors.surface : colors.text },
                                    ]}
                                  >
                                    •••• {card.last4}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.miniCardBrand,
                                      { color: isSelected ? colors.surfaceAlt : colors.textLight },
                                    ]}
                                  >
                                    {card.brand} · {expiry}
                                  </Text>
                                  {isSelected && (
                                    <View style={styles.miniSelected}>
                                      <Ionicons name="checkmark-circle" size={16} color={colors.surface} />
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        )}
                      </View>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.placeBtn,
                        { backgroundColor: colors.primary },
                        SHADOWS.card.web,
                        placing && { opacity: 0.7 },
                      ]}
                      onPress={handlePlaceOrder}
                      disabled={placing}
                      accessibilityRole="button"
                    >
                      {placing ? (
                        <ActivityIndicator color={colors.surface} />
                      ) : (
                        <Text style={[styles.placeBtnText, { color: colors.surface }]}>
                          Confirm Order · Rs. {cartTotal.toFixed(2)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    borderBottomWidth: 1,
  },
  topBarInner: {
    width: '100%',
    maxWidth: 1120,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  brandSub: {
    fontSize: 10,
    letterSpacing: 0.4,
    marginTop: -2,
    fontFamily: FONTS.sans,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themePill: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: { fontSize: 16, fontWeight: '700' },
  scroll: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 130,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // HERO STYLES
  hero: {
    borderRadius: RADIUS.xxl,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroWide: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 34,
  },
  heroCopy: { flex: 1, zIndex: 1 },
  taglineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: '700',
    fontFamily: FONTS.sans,
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1.2,
    fontWeight: '700',
  },
  heroDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    maxWidth: 380,
    fontFamily: FONTS.sans,
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    flexWrap: 'wrap',
  },
  heroPrimaryBtn: {
    minHeight: TOUCH_TARGET.buttonHeight,
    paddingHorizontal: 20,
    borderRadius: RADIUS.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONTS.sans,
  },
  heroSecondaryBtn: {
    minHeight: TOUCH_TARGET.buttonHeight,
    paddingHorizontal: 18,
    borderRadius: RADIUS.base,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONTS.sans,
  },
  heroArt: {
    width: 210,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  heroOrbit: {
    width: 190,
    height: 190,
    borderRadius: 95,
    position: 'absolute',
    borderWidth: 1,
  },
  heroCup: {
    width: 146,
    height: 146,
    borderRadius: 73,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    transform: [{ rotate: '-8deg' }],
  },
  heroArtLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginTop: -8,
  },
  heroArtText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FONTS.sans,
  },
  // ASSISTANT CARD
  assistantCard: {
    borderRadius: RADIUS.xl,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 26,
    borderWidth: 1,
  },
  assistantIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantCopy: { flex: 1 },
  assistantEyebrow: {
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '800',
    marginBottom: 3,
  },
  assistantTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: FONTS.sans,
  },
  assistantDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
    fontFamily: FONTS.sans,
  },
  assistantArrow: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // MENU HEADING & SEARCH
  menuHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  menuCount: {
    fontSize: 12,
    fontFamily: FONTS.sans,
    marginBottom: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: RADIUS.base,
    paddingHorizontal: 14,
    marginBottom: 14,
    minHeight: TOUCH_TARGET.inputHeight,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 12,
    minWidth: 0,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  searchClearBtn: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categories: {
    gap: 8,
    paddingBottom: 18,
  },
  categoryChip: {
    minHeight: TOUCH_TARGET.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONTS.sans,
  },
  categoryTextActive: {
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: RADIUS.md,
    marginBottom: 16,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  retryText: { fontSize: 13, fontWeight: '700' },
  emptyState: {
    paddingVertical: 46,
    alignItems: 'center',
    gap: 12,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDescription: { fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 320 },
  resetButton: {
    minHeight: TOUCH_TARGET.min,
    paddingHorizontal: 18,
    borderRadius: RADIUS.base,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  // MENU GRID & CARD
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  menuCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuImageWrap: { height: 142, width: '100%', overflow: 'hidden' },
  menuImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imageRing: {
    height: 72,
    width: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  imageCaption: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  soldOut: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  soldOutText: { fontSize: 10, fontWeight: '700' },
  menuCardBody: { padding: 14 },
  itemCategory: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
    fontFamily: FONTS.sans,
  },
  itemName: {
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 20,
    minHeight: 40,
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    minHeight: 36,
    fontFamily: FONTS.sans,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: FONTS.sans,
  },
  addButton: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  quantityButton: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 16,
    textAlign: 'center',
    fontFamily: FONTS.sans,
  },
  // ACTIVITY ROW
  activityHeading: { marginTop: 32, marginBottom: 14 },
  activityRow: { flexDirection: 'row', gap: 14 },
  activityCard: {
    flex: 1,
    borderWidth: 1,
    padding: 16,
    borderRadius: RADIUS.xl,
    minHeight: 100,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  activityValue: { fontSize: 24, fontWeight: '700', fontFamily: FONTS.serif },
  activityLabel: { fontSize: 12, marginTop: 2, fontFamily: FONTS.sans },
  activityArrow: { position: 'absolute', top: 18, right: 16 },
  activityNotice: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  activityNoticeText: { flex: 1, fontSize: 13 },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 32,
    letterSpacing: 0.5,
  },
  // FLOATING CART DOCK
  cartDock: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  floatingCart: {
    minHeight: 64,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  cartInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartBadge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { fontSize: 15, fontWeight: '800' },
  cartLabel: { fontSize: 11, marginBottom: 2, fontFamily: FONTS.sans },
  floatingCartTotal: { fontSize: 16, fontWeight: '800', fontFamily: FONTS.sans },
  checkoutArrow: {
    height: TOUCH_TARGET.min,
    width: TOUCH_TARGET.min,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // CHECKOUT MODAL STYLES
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
    padding: 20,
    paddingTop: 10,
    borderWidth: 1,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sheetTitle: { fontSize: 24, fontWeight: '800' },
  sheetSub: { fontSize: 12, marginTop: 2, fontFamily: FONTS.sans },
  closeBtn: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItems: {
    borderRadius: RADIUS.xl,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cartItemName: { fontSize: 14, fontWeight: '700', fontFamily: FONTS.sans },
  cartItemPrice: { fontSize: 12, marginTop: 2 },
  modalQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  modalQtyBtn: {
    width: 32,
    height: TOUCH_TARGET.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalQtyText: {
    fontSize: 13,
    fontWeight: '800',
    width: 22,
    textAlign: 'center',
  },
  deleteBtn: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: '800',
    width: 76,
    textAlign: 'right',
  },
  checkoutTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 8,
  },
  cartTotalLabel: { fontSize: 16, fontWeight: '800' },
  cartTotalAmt: { fontSize: 18, fontWeight: '800', fontFamily: FONTS.sans },
  stepLabel: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 14,
    fontFamily: FONTS.sans,
  },
  subStepLabel: {
    fontSize: 12,
    marginBottom: 6,
    fontFamily: FONTS.sans,
  },
  orderTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  orderTypeBtn: {
    flex: 1,
    borderRadius: RADIUS.base,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    minHeight: TOUCH_TARGET.min,
  },
  orderTypeLabel: { fontSize: 13, fontWeight: '800', marginTop: 6 },
  orderTypeDesc: { fontSize: 10, textAlign: 'center', marginTop: 2 },
  tableGrid: { flexDirection: 'row', gap: 8, paddingBottom: 6 },
  tableBtn: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  tableBtnText: { fontSize: 14, fontWeight: '800' },
  timeBtn: {
    paddingHorizontal: 16,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  timeBtnText: { fontSize: 13, fontWeight: '700' },
  addressInput: {
    borderRadius: RADIUS.base,
    padding: 14,
    height: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  paymentOpts: { gap: 10, marginBottom: 20 },
  payOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderRadius: RADIUS.base,
    borderWidth: 1,
    minHeight: TOUCH_TARGET.buttonHeight,
  },
  payOptLabel: { fontSize: 14, fontWeight: '700' },
  placeBtn: {
    minHeight: TOUCH_TARGET.largeButton,
    borderRadius: RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  placeBtnText: { fontSize: 16, fontWeight: '800', fontFamily: FONTS.sans },
  successWrap: { padding: 20, alignItems: 'center' },
  successTitle: { fontSize: 26, fontWeight: '800', marginTop: 8 },
  successSub: { fontSize: 14, marginTop: 4, marginBottom: 20, textAlign: 'center' },
  successDetails: {
    width: '100%',
    borderRadius: RADIUS.xl,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
  },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  successDetailLabel: { fontSize: 13 },
  successDetailValue: { fontSize: 14, fontWeight: '700' },
  successTotalRow: { borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
  successTotalLabel: { fontSize: 15, fontWeight: '800' },
  successTotalValue: { fontSize: 18, fontWeight: '800' },
  successBtn: {
    width: '100%',
    minHeight: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBtnText: { fontSize: 15, fontWeight: '700' },
  cardPickerSection: { marginBottom: 16 },
  cardPickerLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noCardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: RADIUS.base,
    padding: 14,
    borderWidth: 1,
    minHeight: TOUCH_TARGET.min,
  },
  noCardTitle: { fontSize: 14, fontWeight: '700' },
  noCardSub: { fontSize: 12, marginTop: 2 },
  miniCard: {
    width: 136,
    borderRadius: RADIUS.base,
    padding: 14,
    marginRight: 10,
    borderWidth: 1.5,
  },
  miniCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  miniDefaultDot: { width: 8, height: 8, borderRadius: 4 },
  miniCardNum: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  miniCardBrand: { fontSize: 11, fontWeight: '600' },
  miniSelected: { position: 'absolute', top: 8, right: 8 },
});

export default HomeScreen;
