import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Platform, Modal,
  TextInput, ScrollView, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminInventoryAPI } from '../../api';
import { COLORS } from '../../constants/colors';

const CATEGORIES = ['Coffee', 'Tea', 'Snacks', 'Desserts', 'Beverages', 'Other'];
const CAT_ICONS = { Coffee: 'cafe', Tea: 'leaf', Snacks: 'fast-food', Desserts: 'ice-cream', Beverages: 'wine', Other: 'restaurant' };
const EMPTY_FORM = { name: '', description: '', price: '', stock: '', category: 'Coffee', image: '' };

const InventoryScreen = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const res = await adminInventoryAPI.getAll();
      setItems(res.data.data || []);
    } catch (e) { console.log(e?.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setErrors({}); setShowModal(true); };
  const openEdit = (item) => {
    setEditing(item._id);
    setForm({ 
      name: item.name, 
      description: item.description || '', 
      price: String(item.price), 
      stock: String(item.stock), 
      category: item.category,
      image: item.image || '',
    });
    setErrors({});
    setShowModal(true);
  };

  const setField = (key, value) => { setForm(prev => ({ ...prev, [key]: value })); setErrors(prev => ({ ...prev, [key]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!form.description.trim()) e.description = 'Description required';
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) e.price = 'Valid price required';
    if (!form.stock || isNaN(form.stock) || Number(form.stock) < 0) e.stock = 'Valid stock required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const payload = { 
      name: form.name, 
      description: form.description, 
      price: Number(form.price), 
      stock: Number(form.stock), 
      category: form.category,
      image: form.image || '',
    };
    try {
      if (editing) {
        await adminInventoryAPI.update(editing, payload);
        setItems(prev => prev.map(i => i._id === editing ? { ...i, ...payload } : i));
      } else {
        const res = await adminInventoryAPI.create(payload);
        if (res.data.data) setItems(prev => [res.data.data, ...prev]);
      }
      setShowModal(false);
    } catch (e) { setErrors({ general: e.response?.data?.error || 'Failed to save' }); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try {
      await adminInventoryAPI.delete(id);
      setItems(prev => prev.filter(i => i._id !== id));
    } catch (e) { console.log(e?.message); }
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={[styles.itemIconBg, { backgroundColor: COLORS.primaryGlow }]}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.itemImg} />
        ) : (
          <Ionicons name={CAT_ICONS[item.category] || 'restaurant'} size={24} color={COLORS.primary} />
        )}
      </View>
      <View style={styles.itemInfo}>
        <View style={styles.itemTitleRow}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {item.stock < 5 && (
            <View style={styles.lowBadge}>
              <Ionicons name="alert-circle" size={10} color={COLORS.danger} style={{ marginRight: 2 }} />
              <Text style={styles.lowText}>Low</Text>
            </View>
          )}
        </View>
        <Text style={styles.itemCat}>{item.category}</Text>
        <View style={styles.itemPriceRow}>
          <Text style={styles.itemPrice}>Rs. {item.price?.toFixed(2)}</Text>
          <Text style={styles.itemStock}>Stock: {item.stock}</Text>
        </View>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Ionicons name="create-outline" size={18} color={COLORS.info} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item._id)}>
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Inventory</Text>
            <Text style={styles.headerSub}>{items.length} menu items</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="add" size={18} color={COLORS.white} />
              <Text style={styles.addBtnText}>Add Item</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.warning} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchItems(); }} tintColor={COLORS.warning} />}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="restaurant-outline" size={60} color={COLORS.divider} />
              <Text style={styles.emptyText}>No items yet. Tap "Add Item"</Text>
            </View>
          }
        />
      )}

      {/* Form Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editing ? 'Edit Item' : 'Add Item'}</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {errors.general ? <Text style={styles.generalError}>{errors.general}</Text> : null}

              {[
                { key: 'name', label: 'Item Name', placeholder: 'e.g. Espresso', extra: { autoCapitalize: 'words' } },
                { key: 'description', label: 'Description', placeholder: 'Brief description…', multiline: true },
                { key: 'image', label: 'Image URL', placeholder: 'https://example.com/image.jpg' },
              ].map(({ key, label, placeholder, extra, multiline }) => (
                <View key={key}>
                  <Text style={styles.label}>{label}</Text>
                  <TextInput
                    style={[styles.input, multiline && styles.textarea, errors[key] && styles.inputErr]}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textLight}
                    value={form[key]}
                    onChangeText={v => setField(key, v)}
                    multiline={multiline}
                    {...(extra || {})}
                  />
                  {errors[key] ? <Text style={styles.fieldErr}>{errors[key]}</Text> : null}
                </View>
              ))}

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Price (Rs.)</Text>
                  <TextInput style={[styles.input, errors.price && styles.inputErr]} placeholder="0.00" placeholderTextColor={COLORS.textLight} keyboardType="numeric" value={form.price} onChangeText={v => setField('price', v)} />
                  {errors.price ? <Text style={styles.fieldErr}>{errors.price}</Text> : null}
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Stock</Text>
                  <TextInput style={[styles.input, errors.stock && styles.inputErr]} placeholder="0" placeholderTextColor={COLORS.textLight} keyboardType="numeric" value={form.stock} onChangeText={v => setField('stock', v)} />
                  {errors.stock ? <Text style={styles.fieldErr}>{errors.stock}</Text> : null}
                </View>
              </View>

              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, form.category === c && styles.catChipActive]}
                    onPress={() => setField('category', c)}
                  >
                    <Ionicons name={CAT_ICONS[c]} size={16} color={form.category === c ? COLORS.white : COLORS.primary} />
                    <Text style={[styles.catText, form.category === c && { color: COLORS.white }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitText}>{editing ? 'Update Item ✓' : 'Add Item ✓'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.warning,
    paddingTop: Platform.OS === 'android' ? 36 : 16,
    paddingBottom: 22, paddingHorizontal: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: COLORS.warning, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0 6px 12px rgba(245,158,11,0.3)' },
    }),
  },
  headerCircle: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  addBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  itemCard: {
    backgroundColor: COLORS.surface, borderRadius: 18,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 3px 8px rgba(0,0,0,0.07)' },
    }),
  },
  itemIconBg: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  itemImg: { width: '100%', height: '100%' },
  itemEmoji: { fontSize: 26 },
  itemInfo: { flex: 1 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  lowBadge: { backgroundColor: COLORS.dangerLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  lowText: { fontSize: 10, color: COLORS.danger, fontWeight: '700' },
  itemCat: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  itemPriceRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  itemStock: { fontSize: 12, color: COLORS.textLight },
  itemActions: { gap: 8 },
  editBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.infoLight, justifyContent: 'center', alignItems: 'center' },
  editBtnText: { fontSize: 16 },
  deleteBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.dangerLight, justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { fontSize: 16 },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyEmoji: { fontSize: 42 },
  emptyText: { color: COLORS.textLight, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 50, maxHeight: '92%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: COLORS.divider, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 19, fontWeight: '900', color: COLORS.text },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: COLORS.textLight, fontSize: 14, fontWeight: '700' },
  generalError: { color: COLORS.danger, fontSize: 13, backgroundColor: COLORS.dangerLight, padding: 10, borderRadius: 10, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textMid, marginBottom: 7, marginTop: 14 },
  input: { backgroundColor: COLORS.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text, borderWidth: 1.5, borderColor: COLORS.divider },
  inputErr: { borderColor: COLORS.danger },
  textarea: { height: 72, textAlignVertical: 'top' },
  fieldErr: { color: COLORS.danger, fontSize: 11, marginTop: 4 },
  row: { flexDirection: 'row' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surfaceAlt, marginRight: 8, borderWidth: 1.5, borderColor: COLORS.divider },
  catChipActive: { backgroundColor: COLORS.warning, borderColor: COLORS.warning },
  catEmoji: { fontSize: 15 },
  catText: { fontSize: 12, fontWeight: '600', color: COLORS.textLight },
  submitBtn: { backgroundColor: COLORS.warning, borderRadius: 16, padding: 15, alignItems: 'center', marginTop: 20, ...Platform.select({ ios: { shadowColor: COLORS.warning, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 }, web: { boxShadow: '0 4px 8px rgba(245,158,11,0.3)' } }) },
  submitText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
});

export default InventoryScreen;
