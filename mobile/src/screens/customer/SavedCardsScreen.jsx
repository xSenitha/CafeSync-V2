import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Platform, RefreshControl, Alert,
  Modal, TextInput, ScrollView, Animated, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cardsAPI } from '../../api';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');

const CARD_BRANDS = ['Visa', 'Mastercard', 'Amex', 'Other'];
const BRAND_COLORS = {
  Visa:       { main: '#1A1F71', accent: '#F7B731', bg: '#EDF0FF' },
  Mastercard: { main: '#EB001B', accent: '#F79E1B', bg: '#FFF0F0' },
  Amex:       { main: '#016FD0', accent: '#FFFFFF', bg: '#EAF4FF' },
  Other:      { main: COLORS.secondary, accent: COLORS.textLight, bg: '#F3F4F6' },
};

const BRAND_ICONS = {
  Visa: 'card',
  Mastercard: 'card',
  Amex: 'card',
  Other: 'card-outline',
};

const formatExpiry = (month, year) => {
  const m = String(month).padStart(2, '0');
  const y = String(year).slice(-2);
  return `${m}/${y}`;
};

const detectBrand = (num) => {
  if (num.startsWith('4')) return 'Visa';
  if (['51','52','53','54','55'].some(p => num.startsWith(p)) || (parseInt(num.slice(0,4)) >= 2221 && parseInt(num.slice(0,4)) <= 2720)) return 'Mastercard';
  if (['34','37'].some(p => num.startsWith(p))) return 'Amex';
  return 'Other';
};

const SavedCardItem = ({ card, onSetDefault, onDelete, onEdit, isDeleting }) => {
  const cfg = BRAND_COLORS[card.brand] || BRAND_COLORS.Other;
  const slideAnim = useRef(new Animated.Value(0)).current;

  return (
    <Animated.View style={[styles.cardItem, { transform: [{ translateX: slideAnim }] }]}>
      <View style={[styles.cardVisual, { backgroundColor: cfg.main }]}>
        <View style={styles.cardChip} />
        <Text style={styles.cardBrand}>{card.brand}</Text>
        <Text style={styles.cardNumber}>•••• •••• •••• {card.last4}</Text>
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.cardHolderLabel}>CARD HOLDER</Text>
            <Text style={styles.cardHolderName}>{card.cardholderName}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cardHolderLabel}>EXPIRES</Text>
            <Text style={styles.cardHolderName}>{formatExpiry(card.expiryMonth, card.expiryYear)}</Text>
          </View>
        </View>
        {card.isDefault && (
          <View style={styles.defaultTag}>
            <Ionicons name="checkmark-circle" size={12} color="#fff" />
            <Text style={styles.defaultTagText}>Default</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        {!card.isDefault && (
          <TouchableOpacity style={styles.actionChip} onPress={() => onSetDefault(card._id)}>
            <Ionicons name="star-outline" size={14} color={COLORS.primary} />
            <Text style={[styles.actionChipText, { color: COLORS.primary }]}>Set Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionChip} onPress={() => onEdit(card)}>
          <Ionicons name="create-outline" size={14} color={COLORS.textMid} />
          <Text style={styles.actionChipText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionChip, { borderColor: COLORS.danger + '30', backgroundColor: '#FEF2F2' }]}
          onPress={() => onDelete(card._id)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={COLORS.danger} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
              <Text style={[styles.actionChipText, { color: COLORS.danger }]}>Remove</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const EMPTY_FORM = { cardNumber: '', cardholderName: '', expiryMM: '', expiryYY: '', brand: 'Other' };

const SavedCardsScreen = () => {
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
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const fetchCards = async () => {
    try {
      const res = await cardsAPI.getAll();
      setCards(res.data.data || []);
    } catch (e) { console.log(e?.message); }
    finally { setLoading(false); setRefreshing(false); }
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
    if (!form.expiryMM || parseInt(form.expiryMM) < 1 || parseInt(form.expiryMM) > 12) errs.expiry = 'Invalid month (01–12)';
    if (!form.expiryYY || form.expiryYY.length !== 2) errs.expiry = 'Invalid year (2 digits, e.g. 27)';
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
        setCards(prev => prev.map(c => c._id === editCard._id ? res.data.data : c));
      } else {
        const res = await cardsAPI.add(payload);
        setCards(prev => [...prev, res.data.data]);
      }
      setShowModal(false);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Something went wrong');
    } finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    Alert.alert('Remove Card', 'Are you sure you want to remove this saved card?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setDeleting(id);
          try {
            await cardsAPI.delete(id);
            setCards(prev => prev.filter(c => c._id !== id));
          } catch (e) { Alert.alert('Error', e?.message); }
          finally { setDeleting(null); }
        }
      }
    ]);
  };

  const handleSetDefault = async (id) => {
    try {
      await cardsAPI.update(id, { isDefault: true });
      setCards(prev => prev.map(c => ({ ...c, isDefault: c._id === id })));
    } catch (e) { Alert.alert('Error', e?.message); }
  };

  const handleCardNumberChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
    const brand = detectBrand(digits);
    setForm(f => ({ ...f, cardNumber: formatted, brand }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={cards}
          keyExtractor={c => c._id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCards(); }} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <View style={styles.hero}>
                <View style={styles.heroCircle} />
                <Text style={styles.heroTitle}>Saved Cards</Text>
                <Text style={styles.heroSub}>Manage your payment methods</Text>
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.85}>
                <Ionicons name="add-circle" size={22} color={COLORS.white} />
                <Text style={styles.addBtnText}>Add New Card</Text>
              </TouchableOpacity>
              {cards.length > 0 && (
                <Text style={styles.sectionTitle}>YOUR CARDS</Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <SavedCardItem
              card={item}
              onSetDefault={handleSetDefault}
              onDelete={handleDelete}
              onEdit={openEdit}
              isDeleting={deleting === item._id}
            />
          )}
          ListEmptyComponent={!loading && (
            <View style={styles.empty}>
              <Ionicons name="card-outline" size={72} color={COLORS.divider} />
              <Text style={styles.emptyTitle}>No Saved Cards</Text>
              <Text style={styles.emptySub}>Add a card to speed up checkout. Your cards are safely stored.</Text>
            </View>
          )}
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
      </Animated.View>
      {loading && <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editCard ? 'Edit Card' : 'Add New Card'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Card Preview */}
              <View style={[styles.previewCard, { backgroundColor: BRAND_COLORS[form.brand]?.main || COLORS.secondary }]}>
                <View style={styles.cardChip} />
                <Text style={styles.cardBrand}>{form.brand}</Text>
                <Text style={styles.cardNumber}>
                  {editCard
                    ? `•••• •••• •••• ${form.cardNumber}`
                    : (form.cardNumber || '•••• •••• •••• ••••')}
                </Text>
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.cardHolderLabel}>CARD HOLDER</Text>
                    <Text style={styles.cardHolderName}>{form.cardholderName || 'YOUR NAME'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.cardHolderLabel}>EXPIRES</Text>
                    <Text style={styles.cardHolderName}>{form.expiryMM || 'MM'}/{form.expiryYY || 'YY'}</Text>
                  </View>
                </View>
              </View>

              {!editCard && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Card Number</Text>
                  <TextInput
                    style={[styles.field, errors.cardNumber && styles.fieldError]}
                    value={form.cardNumber}
                    onChangeText={handleCardNumberChange}
                    placeholder="1234 5678 9012 3456"
                    keyboardType="number-pad"
                    maxLength={19}
                  />
                  {errors.cardNumber && <Text style={styles.errText}>{errors.cardNumber}</Text>}
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Cardholder Name</Text>
                <TextInput
                  style={[styles.field, errors.cardholderName && styles.fieldError]}
                  value={form.cardholderName}
                  onChangeText={t => setForm(f => ({ ...f, cardholderName: t.toUpperCase() }))}
                  placeholder="AS ON CARD"
                  autoCapitalize="characters"
                />
                {errors.cardholderName && <Text style={styles.errText}>{errors.cardholderName}</Text>}
              </View>

              <View style={styles.expiryRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Exp. Month</Text>
                  <TextInput
                    style={[styles.field, errors.expiry && styles.fieldError]}
                    value={form.expiryMM}
                    onChangeText={t => setForm(f => ({ ...f, expiryMM: t.replace(/\D/g, '').slice(0, 2) }))}
                    placeholder="MM"
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Exp. Year</Text>
                  <TextInput
                    style={[styles.field, errors.expiry && styles.fieldError]}
                    value={form.expiryYY}
                    onChangeText={t => setForm(f => ({ ...f, expiryYY: t.replace(/\D/g, '').slice(0, 2) }))}
                    placeholder="YY"
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              </View>
              {errors.expiry && <Text style={styles.errText}>{errors.expiry}</Text>}

              {!editCard && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Card Brand</Text>
                  <View style={styles.brandRow}>
                    {CARD_BRANDS.map(b => (
                      <TouchableOpacity
                        key={b}
                        style={[styles.brandChip, form.brand === b && { backgroundColor: BRAND_COLORS[b].main, borderColor: BRAND_COLORS[b].main }]}
                        onPress={() => setForm(f => ({ ...f, brand: b }))}
                      >
                        <Text style={[styles.brandChipText, form.brand === b && { color: '#fff' }]}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.securityNote}>
                <Ionicons name="lock-closed" size={14} color={COLORS.success} />
                <Text style={styles.securityText}>Only the last 4 digits are stored. Your full card number is never saved.</Text>
              </View>

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>{editCard ? 'Save Changes' : 'Add Card'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(249,250,251,0.8)', justifyContent: 'center', alignItems: 'center' },

  listContent: { paddingBottom: 20 },
  hero: {
    backgroundColor: COLORS.secondary,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 35, paddingHorizontal: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroCircle: { position: 'absolute', top: -30, right: -20, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.07)' },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 4 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.primary, borderRadius: 16, padding: 16,
    marginHorizontal: 20, marginTop: 20, marginBottom: 8,
    ...Platform.select({ ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 }, android: { elevation: 4 } }),
  },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textLight, marginHorizontal: 24, marginTop: 24, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' },

  cardItem: { marginHorizontal: 20, marginBottom: 20 },
  cardVisual: {
    borderRadius: 20, padding: 22, minHeight: 160,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 }, android: { elevation: 8 } }),
  },
  cardChip: { width: 36, height: 28, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.35)', marginBottom: 20 },
  cardBrand: { position: 'absolute', top: 20, right: 22, fontSize: 16, fontWeight: '900', color: 'rgba(255,255,255,0.8)' },
  cardNumber: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 2.5, marginBottom: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardHolderLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: 0.8 },
  cardHolderName: { fontSize: 13, fontWeight: '800', color: '#fff', marginTop: 2, letterSpacing: 0.5 },
  defaultTag: { position: 'absolute', top: 20, left: 22, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  defaultTagText: { fontSize: 10, color: '#fff', fontWeight: '800' },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  actionChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textMid },

  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40, gap: 14 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', lineHeight: 22 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#F9FAFB', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '92%' },
  modalHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },

  previewCard: {
    borderRadius: 20, padding: 22, minHeight: 150, marginBottom: 28,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14 }, android: { elevation: 6 } }),
  },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textLight, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  field: { backgroundColor: '#fff', borderRadius: 14, padding: 15, fontSize: 15, color: COLORS.text, borderWidth: 1.5, borderColor: '#E5E7EB' },
  fieldError: { borderColor: COLORS.danger },
  errText: { fontSize: 12, color: COLORS.danger, marginTop: 4, fontWeight: '600' },
  expiryRow: { flexDirection: 'row', gap: 14 },

  brandRow: { flexDirection: 'row', gap: 10 },
  brandChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  brandChipText: { fontSize: 13, fontWeight: '700', color: COLORS.textMid },

  securityNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F0FDF4', padding: 14, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: '#D1FAE5' },
  securityText: { fontSize: 12, color: COLORS.textMid, fontWeight: '600', flex: 1, lineHeight: 18 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 18, padding: 18, alignItems: 'center', marginBottom: 20 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});

export default SavedCardsScreen;
