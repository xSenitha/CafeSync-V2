import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform, useWindowDimensions, RefreshControl,
  Image, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { COLORS } from '../../constants/colors';
import { ordersAPI, reservationsAPI, menuAPI, paymentsAPI, cardsAPI } from '../../api';
import apiClient from '../../api/client';

const ORDER_TYPES = [
  { key: 'Dine-In', icon: 'restaurant-outline', label: 'Dine-In', desc: 'Eat at the cafe' },
  { key: 'Takeaway', icon: 'bag-handle-outline', label: 'Takeaway', desc: 'Pick up & go' },
  { key: 'Online Delivery', icon: 'bicycle-outline', label: 'Delivery', desc: 'Delivered to you' },
];
const PAYMENT_OPTIONS = {
  'Dine-In': [{ key: 'Cash', label: 'Cash', icon: 'cash-outline' }, { key: 'Card', label: 'Card (Debit/Credit)', icon: 'card-outline' }],
  'Takeaway': [{ key: 'Cash', label: 'Cash', icon: 'cash-outline' }, { key: 'Card', label: 'Card (Debit/Credit)', icon: 'card-outline' }],
  'Online Delivery': [{ key: 'Cash', label: 'Cash on Delivery', icon: 'cash-outline' }, { key: 'Card', label: 'Card (Debit/Credit)', icon: 'card-outline' }],
};
const TABLES = Array.from({ length: 20 }, (_, i) => i + 1);
const TIME_SLOTS = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'];
const CATEGORY_ICONS = { All: 'grid-outline', Coffee: 'cafe-outline', Tea: 'leaf-outline', Snacks: 'fast-food-outline', Desserts: 'ice-cream-outline', Beverages: 'wine-outline', Other: 'restaurant-outline' };

const MenuImage = ({ item }) => {
  const [failed, setFailed] = useState(false);
  const image = item.image;
  const uri = image && image !== 'no-photo.jpg'
    ? (/^https?:\/\//i.test(image) ? image : `${apiClient.defaults.baseURL.replace(/\/api\/?$/, '')}/uploads/${image}`)
    : null;
  useEffect(() => { setFailed(false); }, [image]);
  return (
    <View style={styles.menuImageWrap}>
      {uri && !failed ? <Image source={{ uri }} style={styles.menuImage} onError={() => setFailed(true)} accessibilityLabel={item.name} /> : (
        <View style={styles.imageFallback}>
          <View style={styles.imageRing}><Ionicons name={CATEGORY_ICONS[item.category] || 'restaurant-outline'} size={40} color={COLORS.primary} /></View>
          <Text style={styles.imageCaption}>{item.category || 'Made for you'}</Text>
        </View>
      )}
      {item.stock <= 0 && <View style={styles.soldOut}><Text style={styles.soldOutText}>Sold out</Text></View>}
    </View>
  );
};

const HomeScreen = ({ navigation, route }) => {
  const { user } = useContext(AuthContext);
  const { cart, addToCart, removeFromCart, removeItem, cartCount, cartTotal } = useCart();
  const { width: windowWidth } = useWindowDimensions();
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
  const { clearCart } = useCart();

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
    } catch (e) { console.log(e?.message); }
    finally { setLoadingCards(false); }
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
    } catch (e) { console.log(e?.message); }
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
            specialRequests: 'Auto-reserved via Order Checkout'
          });
        } catch (e) { console.log('Reservation auto-create error', e.message); }
      }

      const orderItems = Object.entries(cart).map(([id, qty]) => ({
        product: id,
        quantity: qty.quantity
      }));

      const res = await ordersAPI.createOrder({
        items: orderItems,
        orderType,
        tableNumber,
        deliveryAddress,
        paymentMethod
      });

      const order = res.data.data;

      if (paymentMethod === 'Card') {
        await paymentsAPI.createPayment({
          order: order._id,
          amount: cartTotal,
          paymentMethod: 'Card',
          cardId: selectedCard._id,
          transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        });
      }

      setLastOrder({
        _id: order._id,
        orderType,
        tableNumber,
        reservationTime,
        paymentMethod,
        total: cartTotal
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
      ordersAPI.getMyOrders(), reservationsAPI.getMyReservations(), menuAPI.getAll(),
    ]);
    if (ordRes.status === 'fulfilled') setOrders(ordRes.value.data.data || []);
    if (resRes.status === 'fulfilled') setReservations(resRes.value.data.data || []);
    setActivityError(ordRes.status === 'rejected' || resRes.status === 'rejected');
    if (menuRes.status === 'fulfilled') {
      setMenu(menuRes.value.data.data || []);
      setMenuError('');
    } else {
      setMenuError('We could not refresh the menu. Please try again.');
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Good Morning', icon: 'sunny-outline' };
    if (h < 17) return { text: 'Good Afternoon', icon: 'partly-sunny-outline' };
    return { text: 'Good Evening', icon: 'moon-outline' };
  };

  const activeOrders = orders.filter(o => !['Completed', 'Cancelled'].includes(o.status));
  const pendingRes = reservations.filter(r => ['Pending', 'Confirmed'].includes(r.status));
  const categories = ['All', ...new Set(menu.map(item => item.category).filter(Boolean))];
  const visibleMenu = menu.filter(item =>
    (activeCat === 'All' || item.category === activeCat) &&
    `${item.name} ${item.description || ''}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  const contentWidth = Math.min(windowWidth, 1120) - (windowWidth < 380 ? 32 : 48);
  const columns = windowWidth >= 1000 ? 4 : windowWidth >= 700 ? 3 : windowWidth >= 340 ? 2 : 1;
  const cardWidth = (contentWidth - (columns - 1) * 16) / columns;
  const addItem = item => {
    if ((cart[item._id]?.quantity || 0) >= item.stock) {
      Alert.alert('Stock limit', 'You already have all available portions of this item in your bag.');
      return;
    }
    addToCart(item);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topBarInner}>
          <View style={styles.brand}><View style={styles.brandMark}><Ionicons name="cafe" size={22} color={COLORS.white} /></View><Text style={styles.brandText}>cafe<Text style={styles.brandAccent}>sync</Text><Text style={styles.brandDot}>.</Text></Text></View>
          <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Open your profile">
            <Text style={styles.profileInitial}>{(user?.name || 'You').slice(0, 1).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, windowWidth < 380 && { paddingHorizontal: 16 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.greetingRow}><Ionicons name={getGreeting().icon} size={17} color={COLORS.accent} /><Text style={styles.greeting}>{getGreeting().text}, {user?.name?.split(' ')[0] || 'friend'}</Text></View>
        <View style={[styles.hero, windowWidth >= 700 && styles.heroWide]}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>YOUR DAILY MOMENT</Text>
            <Text style={[styles.heroTitle, windowWidth >= 700 && { fontSize: 48, lineHeight: 56 }]}>A little pause.{'\n'}A better day.</Text>
            <Text style={styles.heroDescription}>Find your next favorite, order something lovely, and make yourself at home.</Text>
            <TouchableOpacity style={styles.heroButton} onPress={() => navigation.navigate('Reservations')} accessibilityRole="button"><Text style={styles.heroButtonText}>Find your table</Text><Ionicons name="arrow-forward" size={17} color={COLORS.white} /></TouchableOpacity>
          </View>
          {windowWidth >= 500 && <View style={styles.heroArt}><View style={styles.heroOrbit} /><View style={styles.heroCup}><Ionicons name="cafe-outline" size={100} color={COLORS.primary} /></View><View style={styles.heroArtLabel}><Ionicons name="heart-outline" size={14} color={COLORS.accent} /><Text style={styles.heroArtText}>A moment well spent</Text></View></View>}
        </View>

        <TouchableOpacity style={styles.assistantCard} activeOpacity={0.85} onPress={() => navigation.navigate('Assistant')} accessibilityRole="button" accessibilityLabel="Ask the cafe assistant for menu recommendations">
          <View style={styles.assistantIcon}><Ionicons name="sparkles" size={24} color={COLORS.primary} /></View>
          <View style={styles.assistantCopy}><Text style={styles.assistantEyebrow}>MEET YOUR CAFE COMPANION</Text><Text style={styles.assistantTitle}>Something good starts with a chat.</Text><Text style={styles.assistantDescription}>Find a favorite, check an order, or plan your visit.</Text></View>
          <View style={styles.assistantArrow}><Ionicons name="arrow-forward" size={20} color={COLORS.primary} /></View>
        </TouchableOpacity>

        <View style={styles.menuHeading}><View><Text style={styles.eyebrow}>FRESH FINDS, FAMILIAR FAVORITES</Text><Text style={styles.sectionTitle}>What&apos;s your mood?</Text></View><Text style={styles.menuCount}>{loading ? '' : `${menu.length} items`}</Text></View>
        <View style={styles.searchBox}><Ionicons name="search-outline" size={20} color={COLORS.textLight} /><TextInput style={styles.searchInput} placeholder="Search coffee, treats, and more" placeholderTextColor={COLORS.textLight} value={search} onChangeText={setSearch} accessibilityLabel="Search the menu" returnKeyType="search" />{search.length > 0 && <TouchableOpacity onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Clear menu search"><Ionicons name="close-circle" size={20} color={COLORS.textLight} /></TouchableOpacity>}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {categories.map(category => <TouchableOpacity key={category} style={[styles.categoryChip, category === activeCat && styles.categoryChipActive]} onPress={() => setActiveCat(category)} accessibilityRole="button" accessibilityState={{ selected: category === activeCat }}><Ionicons name={CATEGORY_ICONS[category] || 'restaurant-outline'} size={17} color={category === activeCat ? COLORS.white : COLORS.textMid} /><Text style={[styles.categoryText, category === activeCat && styles.categoryTextActive]}>{category}</Text></TouchableOpacity>)}
        </ScrollView>

        {!!menuError && <View style={styles.errorBanner} accessibilityRole="alert"><Ionicons name="cloud-offline-outline" size={20} color={COLORS.danger} /><Text style={styles.errorText}>{menuError}</Text><TouchableOpacity onPress={onRefresh} accessibilityRole="button"><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>}
        {loading ? <View style={styles.emptyState}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.emptyDescription}>Preparing the menu for you...</Text></View> : visibleMenu.length === 0 ? <View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons name={search ? 'search-outline' : 'cafe-outline'} size={28} color={COLORS.primary} /></View><Text style={styles.emptyTitle}>{search || activeCat !== 'All' ? 'No matches just yet' : 'The menu is on its way'}</Text><Text style={styles.emptyDescription}>{search || activeCat !== 'All' ? 'Try another search or explore all our categories.' : 'Check back soon for something delicious.'}</Text>{(search || activeCat !== 'All') && <TouchableOpacity style={styles.resetButton} onPress={() => { setSearch(''); setActiveCat('All'); }}><Text style={styles.retryText}>Show all items</Text></TouchableOpacity>}</View> : (
          <View style={styles.menuGrid}>{visibleMenu.map(item => {
            const quantity = cart[item._id]?.quantity || 0;
            const unavailable = item.stock <= 0;
            return <View key={item._id} style={[styles.menuCard, { width: cardWidth }]}>
              <MenuImage item={item} />
              <View style={styles.menuCardBody}><Text style={styles.itemCategory}>{item.category}</Text><Text style={styles.itemName} numberOfLines={2}>{item.name}</Text><Text style={styles.itemDescription} numberOfLines={2}>{item.description || 'A little something to brighten your day.'}</Text>
                <View style={styles.itemFooter}><Text style={styles.itemPrice}>Rs. {Number(item.price).toFixed(2)}</Text>
                  {quantity > 0 ? <View style={styles.quantityControl}><TouchableOpacity style={styles.quantityButton} onPress={() => removeFromCart(item._id)} accessibilityRole="button" accessibilityLabel={`Remove one ${item.name}`}><Ionicons name="remove" size={16} color={COLORS.primary} /></TouchableOpacity><Text style={styles.quantity}>{quantity}</Text><TouchableOpacity style={styles.quantityButton} onPress={() => addItem(item)} disabled={quantity >= item.stock} accessibilityRole="button" accessibilityLabel={`Add one ${item.name}`} accessibilityState={{ disabled: quantity >= item.stock }}><Ionicons name="add" size={16} color={quantity >= item.stock ? COLORS.textLight : COLORS.primary} /></TouchableOpacity></View> : <TouchableOpacity style={[styles.addButton, unavailable && styles.addButtonDisabled]} disabled={unavailable} onPress={() => addItem(item)} accessibilityRole="button" accessibilityLabel={`Add ${item.name} to bag`} accessibilityState={{ disabled: unavailable }}><Ionicons name="add" size={22} color={unavailable ? COLORS.textLight : COLORS.white} /></TouchableOpacity>}
                </View>
              </View>
            </View>;
          })}</View>
        )}

        <View style={styles.activityHeading}><Text style={styles.sectionTitle}>Your cafe, at a glance</Text></View>
        {activityError ? <TouchableOpacity style={styles.activityNotice} onPress={onRefresh}><Ionicons name="refresh-outline" size={18} color={COLORS.primary} /><Text style={styles.activityNoticeText}>Tap to refresh your orders and reservations.</Text></TouchableOpacity> : <View style={styles.activityRow}>
          <TouchableOpacity style={styles.activityCard} onPress={() => navigation.navigate('Orders')} accessibilityRole="button"><View style={styles.activityIcon}><Ionicons name="bag-handle-outline" size={22} color={COLORS.primary} /></View><Text style={styles.activityValue}>{loading ? '?' : activeOrders.length}</Text><Text style={styles.activityLabel}>Active orders</Text><Ionicons style={styles.activityArrow} name="arrow-forward" size={17} color={COLORS.textLight} /></TouchableOpacity>
          <TouchableOpacity style={styles.activityCard} onPress={() => navigation.navigate('Reservations')} accessibilityRole="button"><View style={[styles.activityIcon, { backgroundColor: '#F1E8DC' }]}><Ionicons name="calendar-outline" size={22} color={COLORS.accent} /></View><Text style={styles.activityValue}>{loading ? '?' : pendingRes.length}</Text><Text style={styles.activityLabel}>Reservations</Text><Ionicons style={styles.activityArrow} name="arrow-forward" size={17} color={COLORS.textLight} /></TouchableOpacity>
        </View>}
        <Text style={styles.footerNote}>Good food. Good company. Your little everyday ritual.</Text>
      </ScrollView>
      {cartCount > 0 && <View pointerEvents="box-none" style={styles.cartDock}><TouchableOpacity style={[styles.floatingCart, { width: Math.min(contentWidth, 600) }]} onPress={() => { setOrderSuccess(false); setShowCheckout(true); }} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={`Review bag with ${cartCount} items, total ${cartTotal.toFixed(2)} rupees`}><View style={styles.cartInfo}><View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View><View><Text style={styles.cartLabel}>Review your bag</Text><Text style={styles.floatingCartTotal}>Rs. {cartTotal.toFixed(2)}</Text></View></View><View style={styles.checkoutArrow}><Ionicons name="arrow-forward" size={22} color={COLORS.white} /></View></TouchableOpacity></View>}
      {/* Checkout Modal */}
      <Modal visible={showCheckout} animationType="slide" transparent onRequestClose={() => !placing && setShowCheckout(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { width: Math.min(windowWidth, 640), alignSelf: 'center' }]}>
            <View style={styles.sheetHandle} />
            {orderSuccess ? (
              <View style={styles.successWrap}>
                <Ionicons name="checkmark-circle" size={80} color={COLORS.success} style={{ marginBottom: 10 }} />
                <Text style={styles.successTitle}>Order Placed!</Text>
                <Text style={styles.successSub}>You can follow its progress in Orders.</Text>
                {lastOrder && (
                  <View style={styles.successDetails}>
                    <View style={styles.successRow}>
                      <Text style={styles.successDetailLabel}>Order Type</Text>
                      <Text style={styles.successDetailValue}>{lastOrder.orderType}</Text>
                    </View>
                    {lastOrder.tableNumber && (
                      <View style={styles.successRow}>
                        <Text style={styles.successDetailLabel}>Table</Text>
                        <Text style={styles.successDetailValue}>#{lastOrder.tableNumber} at {lastOrder.reservationTime}</Text>
                      </View>
                    )}
                    <View style={styles.successRow}>
                      <Text style={styles.successDetailLabel}>Payment</Text>
                      <Text style={styles.successDetailValue}>{lastOrder.paymentMethod}</Text>
                    </View>
                    <View style={[styles.successRow, styles.successTotalRow]}>
                      <Text style={styles.successTotalLabel}>Total</Text>
                      <Text style={styles.successTotalValue}>Rs. {lastOrder.total.toFixed(2)}</Text>
                    </View>
                  </View>
                )}
                <TouchableOpacity style={styles.successBtn} onPress={() => { setShowCheckout(false); navigation.navigate('Orders'); }}>
                  <Text style={styles.successBtnText}>Track Order</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Checkout</Text>
                  <TouchableOpacity onPress={() => setShowCheckout(false)} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>

                {/* Cart summary */}
                <View style={styles.cartItems}>
                  {Object.entries(cart).length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                      <Ionicons name="cart-outline" size={40} color={COLORS.textLight} />
                      <Text style={{ color: COLORS.textLight, marginTop: 10, fontWeight: '600' }}>Your cart is empty</Text>
                      <TouchableOpacity
                        style={[styles.successBtn, { marginTop: 15, paddingVertical: 10 }]}
                        onPress={() => setShowCheckout(false)}
                      >
                        <Text style={styles.successBtnText}>Back to Menu</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {Object.entries(cart).map(([id, { item, quantity }]) => (
                        <View key={id} style={styles.cartRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.cartItemPrice}>Rs. {Number(item.price).toFixed(2)}</Text>
                          </View>
                          <View style={styles.modalQtyRow}>
                            <TouchableOpacity
                              style={styles.modalQtyBtn}
                              onPress={() => removeFromCart(id)}
                            >
                              <Ionicons name="remove" size={12} color={COLORS.textMid} />
                            </TouchableOpacity>
                            <Text style={styles.modalQtyText}>{quantity}</Text>
                            <TouchableOpacity
                              style={[styles.modalQtyBtn, { backgroundColor: COLORS.primary }]}
                              onPress={() => addItem(item)}
                            >
                              <Ionicons name="add" size={12} color={COLORS.white} />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => removeItem(id)}
                          >
                            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                          </TouchableOpacity>
                          <Text style={styles.cartItemTotal}>Rs. {(item.price * quantity).toFixed(2)}</Text>
                        </View>
                      ))}
                      <View style={styles.checkoutTotal}>
                        <Text style={styles.cartTotalLabel}>Total</Text>
                        <Text style={styles.cartTotalAmt}>Rs. {cartTotal.toFixed(2)}</Text>
                      </View>
                    </>
                  )}
                </View>

                {Object.entries(cart).length > 0 && (
                  <>
                    <Text style={styles.stepLabel}>1. Order Type</Text>
                    <View style={styles.orderTypeRow}>
                      {ORDER_TYPES.map(t => (
                        <TouchableOpacity
                          key={t.key}
                          style={[styles.orderTypeBtn, orderType === t.key && styles.orderTypeBtnActive]}
                          onPress={() => setOrderType(t.key)}
                        >
                          <Ionicons name={t.icon} size={24} color={orderType === t.key ? COLORS.primary : COLORS.textLight} />
                          <Text style={[styles.orderTypeLabel, orderType === t.key && { color: COLORS.primary }]}>{t.label}</Text>
                          <Text style={styles.orderTypeDesc}>{t.desc}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {orderType === 'Dine-In' && (
                      <>
                        <Text style={styles.stepLabel}>2. Select Table & Time</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                          <View style={styles.tableGrid}>
                            {TABLES.map(n => (
                              <TouchableOpacity
                                key={n}
                                style={[styles.tableBtn, tableNumber === n && styles.tableBtnActive]}
                                onPress={() => setTableNumber(n)}
                              >
                                <Text style={[styles.tableBtnText, tableNumber === n && { color: COLORS.white }]}>{n}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4, marginTop: 6 }}>
                          <View style={styles.tableGrid}>
                            {TIME_SLOTS.map(t => {
                              const isBooked = tableNumber && bookedSlots.some(b => b.tableNumber === tableNumber && b.time === t);
                              return (
                                <TouchableOpacity
                                  key={t}
                                  style={[
                                    styles.timeBtn,
                                    reservationTime === t && styles.tableBtnActive,
                                    isBooked && styles.timeBtnBooked
                                  ]}
                                  onPress={() => !isBooked && setReservationTime(t)}
                                  activeOpacity={isBooked ? 1 : 0.7}
                                >
                                  <Text style={[
                                    styles.timeBtnText,
                                    reservationTime === t && { color: COLORS.white },
                                    isBooked && styles.timeBtnTextBooked
                                  ]}>{t}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </>
                    )}

                    {orderType === 'Online Delivery' && (
                      <>
                        <Text style={styles.stepLabel}>2. Delivery Address</Text>
                        <TextInput
                          style={styles.addressInput}
                          placeholder="Enter your full delivery address..."
                          placeholderTextColor={COLORS.textLight}
                          value={deliveryAddress}
                          onChangeText={setDeliveryAddress}
                          multiline
                        />
                      </>
                    )}

                    <Text style={styles.stepLabel}>Payment Method</Text>
                    <View style={styles.paymentOpts}>
                      {PAYMENT_OPTIONS[orderType].map(opt => (
                        <TouchableOpacity
                          key={opt.key}
                          style={[styles.payOpt, paymentMethod === opt.key && styles.payOptActive]}
                          onPress={() => setPaymentMethod(opt.key)}
                        >
                          <Ionicons name={opt.icon} size={20} color={paymentMethod === opt.key ? COLORS.primary : COLORS.textLight} />
                          <Text style={[styles.payOptLabel, paymentMethod === opt.key && { color: COLORS.primary }]}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Saved Card Selector — shown when Card is chosen */}
                    {paymentMethod === 'Card' && (
                      <View style={styles.cardPickerSection}>
                        <Text style={styles.cardPickerLabel}>Select Card</Text>
                        {loadingCards ? (
                          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
                        ) : savedCards.length === 0 ? (
                          <TouchableOpacity style={styles.noCardBox} onPress={() => { setShowCheckout(false); navigation.navigate('SavedCards'); }}>
                            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.noCardTitle}>No saved cards</Text>
                              <Text style={styles.noCardSub}>Tap to add a card in your Profile</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
                          </TouchableOpacity>
                        ) : (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                            {savedCards.map(card => {
                              const isSelected = selectedCard?._id === card._id;
                              const expiry = `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`;
                              return (
                                <TouchableOpacity
                                  key={card._id}
                                  style={[styles.miniCard, isSelected && styles.miniCardActive]}
                                  onPress={() => setSelectedCard(card)}
                                  activeOpacity={0.8}
                                >
                                  <View style={styles.miniCardTop}>
                                    <Ionicons name="card" size={18} color={isSelected ? COLORS.white : COLORS.textMid} />
                                    {card.isDefault && <View style={styles.miniDefaultDot} />}
                                  </View>
                                  <Text style={[styles.miniCardNum, isSelected && { color: '#fff' }]}>
                                    •••• {card.last4}
                                  </Text>
                                  <Text style={[styles.miniCardBrand, isSelected && { color: 'rgba(255,255,255,0.8)' }]}>
                                    {card.brand} · {expiry}
                                  </Text>
                                  {isSelected && (
                                    <View style={styles.miniSelected}>
                                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
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
                      style={[styles.placeBtn, placing && { opacity: 0.7 }]}
                      onPress={() => handlePlaceOrder()}
                      disabled={placing}
                    >
                      {placing ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.placeBtnText}>Confirm Order</Text>}
                    </TouchableOpacity>
                  </>
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? 32 : 12, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  topBarInner: { width: '100%', maxWidth: 1120, paddingHorizontal: 24, paddingVertical: 14, alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 37, height: 37, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  brandText: { fontSize: 25, fontWeight: '800', color: COLORS.text, letterSpacing: -1 },
  brandAccent: { fontWeight: '400' }, brandDot: { color: COLORS.accent },
  profileButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E9E2D7', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.surface },
  profileInitial: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  scroll: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 18 },
  greeting: { color: COLORS.textMid, fontSize: 13, fontWeight: '500' },
  hero: { backgroundColor: '#EAE4D9', borderRadius: 26, padding: 25, marginBottom: 20, overflow: 'hidden' },
  heroWide: { flexDirection: 'row', padding: 38 },
  heroCopy: { flex: 1, zIndex: 1 },
  eyebrow: { color: COLORS.accent, fontSize: 9, letterSpacing: 1.7, fontWeight: '800', marginBottom: 9 },
  heroTitle: { color: COLORS.primary, fontSize: 36, lineHeight: 44, letterSpacing: -1.6, fontWeight: '800' },
  heroDescription: { color: COLORS.textMid, fontSize: 13, lineHeight: 21, marginTop: 12, maxWidth: 360 },
  heroButton: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 15, borderRadius: 13, paddingHorizontal: 18, paddingVertical: 13, marginTop: 22, alignSelf: 'flex-start' },
  heroButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  heroArt: { width: 250, alignItems: 'center', justifyContent: 'center', minHeight: 230 },
  heroOrbit: { width: 228, height: 228, borderRadius: 114, position: 'absolute', backgroundColor: '#E1D6C4', borderWidth: 1, borderColor: '#D8CBB8' },
  heroCup: { width: 172, height: 172, borderRadius: 86, backgroundColor: '#F9F5ED', justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-12deg' }], borderWidth: 8, borderColor: '#F1EBE0' },
  heroArtLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, marginTop: -8 },
  heroArtText: { color: COLORS.textMid, fontSize: 10, fontWeight: '600' },
  assistantCard: { backgroundColor: '#E6EDE5', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 32, borderWidth: 1, borderColor: '#D7E1D5' },
  assistantIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  assistantCopy: { flex: 1 },
  assistantEyebrow: { color: COLORS.primary, fontSize: 8, letterSpacing: 1.2, fontWeight: '800', marginBottom: 5 },
  assistantTitle: { color: COLORS.text, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  assistantDescription: { color: COLORS.textMid, fontSize: 11, lineHeight: 17, marginTop: 4 },
  assistantArrow: { alignItems: 'center', justifyContent: 'center', width: 28 },
  menuHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 17 },
  sectionTitle: { fontSize: 22, color: COLORS.text, fontWeight: '700', letterSpacing: -0.6 },
  menuCount: { fontSize: 11, color: COLORS.textLight },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.surface, borderRadius: 14, paddingHorizontal: 15, marginBottom: 16, minHeight: 49 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 13, paddingVertical: 13, minWidth: 0 },
  categories: { gap: 9, paddingBottom: 23 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 11, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.divider },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { color: COLORS.textMid, fontSize: 12, fontWeight: '600' },
  categoryTextActive: { color: COLORS.white },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, padding: 14, borderRadius: 12, marginBottom: 18, borderWidth: 1, borderColor: COLORS.divider },
  errorText: { flex: 1, fontSize: 12, lineHeight: 18, color: COLORS.textMid },
  retryText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  emptyState: { paddingVertical: 50, alignItems: 'center', gap: 13, backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.divider, marginBottom: 16, paddingHorizontal: 20 },
  emptyIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#E6EDE5', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyDescription: { fontSize: 12, lineHeight: 20, color: COLORS.textLight, textAlign: 'center' },
  resetButton: { padding: 10 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  menuCard: { borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.divider, overflow: 'hidden' },
  menuImageWrap: { height: 138, width: '100%', backgroundColor: '#EEE9E0', overflow: 'hidden' },
  menuImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', gap: 8 },
  imageRing: { height: 76, width: 76, borderRadius: 38, backgroundColor: '#F7F4EF', alignItems: 'center', justifyContent: 'center' },
  imageCaption: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.7, color: '#817461', fontWeight: '700' },
  soldOut: { position: 'absolute', top: 10, left: 10, backgroundColor: COLORS.surface, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  soldOutText: { color: COLORS.textLight, fontSize: 9, fontWeight: '700' },
  menuCardBody: { padding: 13 },
  itemCategory: { color: COLORS.accent, fontSize: 9, fontWeight: '700', marginBottom: 5 },
  itemName: { color: COLORS.text, fontWeight: '700', fontSize: 14, lineHeight: 19, minHeight: 38 },
  itemDescription: { color: COLORS.textLight, fontSize: 11, lineHeight: 17, marginTop: 5, minHeight: 34 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 15 },
  itemPrice: { color: COLORS.primary, fontSize: 12, fontWeight: '800', flexShrink: 1 },
  addButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  addButtonDisabled: { backgroundColor: COLORS.background },
  quantityControl: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, backgroundColor: '#E6EDE5' },
  quantityButton: { width: 29, height: 34, alignItems: 'center', justifyContent: 'center' },
  quantity: { fontSize: 11, fontWeight: '700', color: COLORS.primary, minWidth: 13, textAlign: 'center' },
  activityHeading: { marginTop: 34, marginBottom: 16 },
  activityRow: { flexDirection: 'row', gap: 14 },
  activityCard: { flex: 1, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.surface, padding: 18, borderRadius: 18 },
  activityIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#E6EDE5', justifyContent: 'center', alignItems: 'center', marginBottom: 13 },
  activityValue: { fontSize: 26, color: COLORS.text, fontWeight: '700' },
  activityLabel: { fontSize: 11, color: COLORS.textMid, marginTop: 4 },
  activityArrow: { position: 'absolute', top: 22, right: 18 },
  activityNotice: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 18, backgroundColor: COLORS.surface, borderRadius: 14 },
  activityNoticeText: { flex: 1, fontSize: 12, color: COLORS.textMid },
  footerNote: { textAlign: 'center', color: COLORS.textLight, fontSize: 10, lineHeight: 17, marginTop: 30 },
  cartDock: { position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center' },
  floatingCart: { minHeight: 68, backgroundColor: COLORS.primary, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, ...Platform.select({ ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 }, android: { elevation: 7 }, web: { boxShadow: '0 6px 18px rgba(38,77,60,0.2)' } }) },
  cartInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartBadge: { width: 34, height: 34, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  cartLabel: { fontSize: 11, color: '#DDE7DF', marginBottom: 3 },
  floatingCartTotal: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  checkoutArrow: { height: 36, width: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  // Checkout Styles
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    maxHeight: '92%', padding: 20, paddingTop: 10
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: COLORS.divider,
    borderRadius: 2, alignSelf: 'center', marginBottom: 15
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },

  cartItems: { backgroundColor: COLORS.background, borderRadius: 20, padding: 16, marginBottom: 20 },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cartItemName: { fontSize: 14, color: COLORS.text, fontWeight: '700' },
  cartItemPrice: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  modalQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 8 },
  modalQtyBtn: { width: 20, height: 20, borderRadius: 5, backgroundColor: COLORS.divider, justifyContent: 'center', alignItems: 'center' },
  modalQtyText: { fontSize: 13, fontWeight: '800', color: COLORS.text, width: 16, textAlign: 'center' },
  deleteBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
  cartItemTotal: { fontSize: 14, color: COLORS.primary, fontWeight: '800', width: 80, textAlign: 'right' },
  checkoutTotal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 12, marginTop: 5 },
  cartTotalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  cartTotalAmt: { fontSize: 18, fontWeight: '900', color: COLORS.primary },

  stepLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 12, marginTop: 10 },
  orderTypeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  orderTypeBtn: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 18,
    padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent'
  },
  orderTypeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.surface },
  orderTypeLabel: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginTop: 6 },
  orderTypeDesc: { fontSize: 10, color: COLORS.textLight, textAlign: 'center', marginTop: 2 },

  tableGrid: { flexDirection: 'row', gap: 8, paddingBottom: 10 },
  tableBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.divider
  },
  tableBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tableBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.text },

  timeBtn: {
    paddingHorizontal: 16, height: 40, borderRadius: 12, backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.divider
  },
  timeBtnBooked: { backgroundColor: COLORS.divider, opacity: 0.5 },
  timeBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  timeBtnTextBooked: { color: COLORS.textLight },

  addressInput: {
    backgroundColor: COLORS.background, borderRadius: 18, padding: 15,
    height: 80, textAlignVertical: 'top', fontSize: 14, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.divider, marginBottom: 20
  },

  paymentOpts: { gap: 10, marginBottom: 25 },
  payOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.background, padding: 16, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.divider
  },
  payOptActive: { borderColor: COLORS.primary, backgroundColor: COLORS.surface },
  payOptLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textMid },

  placeBtn: {
    backgroundColor: COLORS.primary, height: 60, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6
  },
  placeBtnText: { color: COLORS.white, fontSize: 18, fontWeight: '900' },

  successWrap: { padding: 20, alignItems: 'center' },
  successTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginTop: 10 },
  successSub: { fontSize: 15, color: COLORS.textLight, marginTop: 4, marginBottom: 25 },
  successDetails: { width: '100%', backgroundColor: COLORS.background, borderRadius: 24, padding: 20, marginBottom: 30 },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  successDetailLabel: { fontSize: 13, color: COLORS.textLight },
  successDetailValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  successTotalRow: { borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 12, marginTop: 5 },
  successTotalLabel: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  successTotalValue: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  successBtn: {
    backgroundColor: COLORS.primary, width: '100%', height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center'
  },
  successBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  // Saved Card Picker (Checkout)
  cardPickerSection: { marginBottom: 16 },
  cardPickerLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textLight, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  noCardBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: COLORS.divider,
  },
  noCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  noCardSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  miniCard: {
    width: 130, borderRadius: 16, padding: 14, marginRight: 12,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.divider,
  },
  miniCardActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  miniCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  miniDefaultDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  miniCardNum: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  miniCardBrand: { fontSize: 11, color: COLORS.textLight, fontWeight: '600' },
  miniSelected: { position: 'absolute', top: 10, right: 10 },
});

export default HomeScreen;
