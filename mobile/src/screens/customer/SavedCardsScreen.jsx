import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Platform, RefreshControl,
  Modal, TextInput, ScrollView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cardsAPI } from '../../api';
import { useTheme } from '../../context/ThemeContext';
import { Alert } from '../../utils/alert';
import { RADIUS, TOUCH_TARGET } from '../../constants/spacing';
import { FONTS } from '../../constants/typography';
import { SHADOWS } from '../../constants/colors';
import CoffeeLoader from '../../components/common/CoffeeLoader';

const BRAND_COLORS = {
  Visa: { main: '#1C2942', accent: '#D4AF37', text: '#FAF5EE' },
  Mastercard: { main: '#3D1C1C', accent: '#E06B3E', text: '#FAF5EE' },
  Amex: { main: '#1A3344', accent: '#6293B8', text: '#FAF5EE' },
  Other: { main: '#2B1810', accent: '#C35E3D', text: '#FAF5EE' },
};

const formatExpiry = (month, year) => {
  const m = String(month).padStart(2, '0');
  const y = String(year).slice(-2);
  return `${m}/${y}`;
};

const detectBrand = (num) => {
  if (num.startsWith('4')) return 'Visa';
  if (['51', '52', '53', '54', '55'].some((p) => num.startsWith(p)) || (parseInt(num.slice(0, 4)) >= 2221 && parseInt(num.slice(0, 4)) <= 2720)) return 'Mastercard';
  if (['34', '37'].some((p) => num.startsWith(p))) return 'Amex';
  return 'Other';
};

const SavedCardItem = ({ card, onSetDefault, onDelete, onEdit, isDeleting, colors }) => {
  const cfg = BRAND_COLORS[card.brand] || BRAND_COLORS.Other;
  const slideAnim = useRef(new Animated.Value(0)).current;

  return (
    <Animated.View style={[styles.cardItem, { transform: [{ translateX: slideAnim }] }]}>
      <View style={[styles.cardVisual, { backgroundColor: cfg.main }, SHADOWS.card.web]}>
        <View style={styles.cardVisualHeader}>
          <View style={styles.cardChip} />
          <Text style={[styles.cardBrand, { color: cfg.accent }]}>{card.brand}</Text>
        </View>

        <Text style={[styles.cardNumber, { color: cfg.text }]}>•••• •••• •••• {card.last4}</Text>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.cardHolderLabel}>CARD HOLDER</Text>
            <Text style={[styles.cardHolderName, { color: cfg.text }]}>{card.cardholderName}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cardHolderLabel}>EXPIRES</Text>
            <Text style={[styles.cardHolderName, { color: cfg.text }]}>{formatExpiry(card.expiryMonth, card.expiryYear)}</Text>
          </View>
        </View>

        {card.isDefault && (
          <View style={[styles.defaultTag, { backgroundColor: colors.accent }]}>
            <Ionicons name="checkmark-circle" size={12} color="#fff" />
            <Text style={styles.defaultTagText}>Default</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        {!card.isDefault && (
          <TouchableOpacity
            style={[styles.actionChip, { backgroundColor: colors.surface, borderColor: colors.divider }]}
            onPress={() => onSetDefault(card._id)}
            accessibilityRole="button"
          >
            <Ionicons name="star-outline" size={15} color={colors.primary} />
            <Text style={[styles.actionChipText, { color: colors.primary }]}>Set Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionChip, { backgroundColor: colors.surface, borderColor: colors.divider }]}
          onPress={() => onEdit(card)}
          accessibilityRole="button"
        >
          <Ionicons name="create-outline" size={15} color={colors.textMid} />
          <Text style={[styles.actionChipText, { color: colors.textMid }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionChip, { backgroundColor: colors.dangerLight, borderColor: colors.danger + '30' }]}
          onPress={() => onDelete(card._id)}
          disabled={isDeleting}
          accessibilityRole="button"
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={15} color={colors.danger} />
              <Text style={[styles.actionChipText, { color: colors.danger }]}>Remove</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const EMPTY_FORM = { cardNumber: '', cardholderName: '', expiryMM: '', expiryYY: '', brand: 'Other' };

const SavedCardsScreen = () => {
  const { colors } = useTheme();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchCards();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const fetchCards = async () => {
    try {
      const res = await cardsAPI.getAll();
      setCards(res.data.data || []);
    } catch (e) {
      console.log(e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openAdd = () => {
    setEditCard(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (card) => {
    setEditCard(card);
    setForm({
      cardNumber: card.last4,
      cardholderName: card.cardholderName,
      expiryMM: String(card.expiryMonth).padStart(2, '0'),
      expiryYY: String(card.expiryYear).slice(-2),
      brand: card.brand,
    });
    setErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errs = {};
    if (!editCard && (!form.cardNumber || form.cardNumber.length < 4)) {
      errs.cardNumber = 'Enter a valid card number';
    }
    if (!form.cardholderName.trim()) errs.cardholderName = 'Cardholder name is required';
    if (!form.expiryMM || parseInt(form.expiryMM) < 1 || parseInt(form.expiryMM) > 12) errs.expiry = 'Month must be 01–12';
    if (!form.expiryYY || form.expiryYY.length !== 2) errs.expiry = 'Year must be 2 digits (e.g. 27)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const last4 = form.cardNumber.replace(/\s/g, '').slice(-4);
      const detectedBrand = form.cardNumber.length > 4 ? detectBrand(form.cardNumber.replace(/\s/g, '')) : form.brand;
      const payload = {
        last4,
        brand: detectedBrand,
        cardholderName: form.cardholderName,
        expiryMonth: parseInt(form.expiryMM),
        expiryYear: parseInt(`20${form.expiryYY}`),
      };

      if (editCard) {
        const res = await cardsAPI.update(editCard._id, {
          cardholderName: form.cardholderName,
          expiryMonth: parseInt(form.expiryMM),
          expiryYear: parseInt(`20${form.expiryYY}`),
        });
        setCards((prev) => prev.map((c) => (c._id === editCard._id ? res.data.data : c)));
      } else {
        const res = await cardsAPI.add(payload);
        setCards((prev) => [...prev, res.data.data]);
      }
      setShowModal(false);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Remove Card', 'Are you sure you want to remove this saved card?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setDeleting(id);
          try {
            await cardsAPI.delete(id);
            setCards((prev) => prev.filter((c) => c._id !== id));
          } catch (e) {
            Alert.alert('Error', e?.message);
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (id) => {
    try {
      await cardsAPI.update(id, { isDefault: true });
      setCards((prev) => prev.map((c) => ({ ...c, isDefault: c._id === id })));
    } catch (e) {
      Alert.alert('Error', e?.message);
    }
  };

  const handleCardNumberChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
    const brand = detectBrand(digits);
    setForm((f) => ({ ...f, cardNumber: formatted, brand }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.headerSup, { color: colors.accent }]}>SAFE CHECKOUT</Text>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
              Saved Cards
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={openAdd}
            accessibilityRole="button"
            accessibilityLabel="Add new card"
            activeOpacity={0.88}
          >
            <Ionicons name="add" size={18} color={colors.surface} />
            <Text style={[styles.addBtnText, { color: colors.surface }]}>Add Card</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={cards}
          keyExtractor={(c) => c._id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCards(); }} tintColor={colors.accent} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <SavedCardItem
              card={item}
              onSetDefault={handleSetDefault}
              onDelete={handleDelete}
              onEdit={openEdit}
              isDeleting={deleting === item._id}
              colors={colors}
            />
          )}
          ListEmptyComponent={
            loading ? (
              <CoffeeLoader message="Loading saved cards…" size="compact" />
            ) : (
              <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
                <Ionicons name="card-outline" size={48} color={colors.textLight} />
                <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
                  No Saved Cards
                </Text>
                <Text style={[styles.emptySub, { color: colors.textLight }]}>
                  Save a card to complete your orders swiftly without re-entering details.
                </Text>
              </View>
            )
          }
        />
      </Animated.View>

      {/* Add / Edit Card Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
                {editCard ? 'Edit Card Details' : 'Add New Card'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={20} color={colors.textMid} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {!editCard && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textMid }]}>Card Number</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: errors.cardNumber ? colors.danger : colors.divider, color: colors.text }]}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={form.cardNumber}
                    onChangeText={handleCardNumberChange}
                  />
                  {errors.cardNumber ? <Text style={[styles.errText, { color: colors.danger }]}>{errors.cardNumber}</Text> : null}
                </>
              )}

              <Text style={[styles.inputLabel, { color: colors.textMid }]}>Cardholder Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: errors.cardholderName ? colors.danger : colors.divider, color: colors.text }]}
                placeholder="Full name as printed on card"
                placeholderTextColor={colors.textLight}
                value={form.cardholderName}
                onChangeText={(v) => setForm((p) => ({ ...p, cardholderName: v }))}
                autoCapitalize="words"
              />
              {errors.cardholderName ? <Text style={[styles.errText, { color: colors.danger }]}>{errors.cardholderName}</Text> : null}

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textMid }]}>Expiry Month</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: errors.expiry ? colors.danger : colors.divider, color: colors.text }]}
                    placeholder="MM (e.g. 08)"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    maxLength={2}
                    value={form.expiryMM}
                    onChangeText={(v) => setForm((p) => ({ ...p, expiryMM: v }))}
                  />
                </View>

                <View style={{ width: 12 }} />

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textMid }]}>Expiry Year</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: errors.expiry ? colors.danger : colors.divider, color: colors.text }]}
                    placeholder="YY (e.g. 28)"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    maxLength={2}
                    value={form.expiryYY}
                    onChangeText={(v) => setForm((p) => ({ ...p, expiryYY: v }))}
                  />
                </View>
              </View>
              {errors.expiry ? <Text style={[styles.errText, { color: colors.danger }]}>{errors.expiry}</Text> : null}

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                accessibilityRole="button"
              >
                {saving ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={[styles.saveBtnText, { color: colors.surface }]}>
                    {editCard ? 'Save Changes' : 'Add Card to Account'}
                  </Text>
                )}
              </TouchableOpacity>
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
  addBtn: {
    minHeight: TOUCH_TARGET.min,
    paddingHorizontal: 16,
    borderRadius: RADIUS.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', fontFamily: FONTS.sans },
  listContent: {
    padding: 20,
    paddingBottom: 100,
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
  },
  cardItem: { marginBottom: 20 },
  cardVisual: {
    borderRadius: RADIUS.xl,
    padding: 20,
    height: 170,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  cardVisualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardChip: {
    width: 38,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#E8D49E',
    borderWidth: 1,
    borderColor: '#C6B27E',
  },
  cardBrand: { fontSize: 16, fontWeight: '800', letterSpacing: 0.8 },
  cardNumber: { fontSize: 17, letterSpacing: 3, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardHolderLabel: { fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  cardHolderName: { fontSize: 12, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  defaultTag: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  defaultTagText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionChip: {
    minHeight: TOUCH_TARGET.min,
    paddingHorizontal: 16,
    borderRadius: RADIUS.base,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionChipText: { fontSize: 13, fontWeight: '600', fontFamily: FONTS.sans },
  empty: {
    borderRadius: RADIUS.xl,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', fontFamily: FONTS.sans, maxWidth: 300 },
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
    width: '90%',
    maxWidth: 440,
    maxHeight: '85%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  closeBtn: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 5, marginTop: 10, fontFamily: FONTS.sans },
  input: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    borderWidth: 1,
    minHeight: TOUCH_TARGET.inputHeight,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  row: { flexDirection: 'row' },
  errText: { fontSize: 11, marginTop: 4, fontFamily: FONTS.sans },
  saveBtn: {
    minHeight: TOUCH_TARGET.buttonHeight,
    borderRadius: RADIUS.base,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', fontFamily: FONTS.sans },
});

export default SavedCardsScreen;
