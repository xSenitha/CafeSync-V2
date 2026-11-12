import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { assistantAPI } from '../../api/assistant.api';
import { useCart } from '../../context/CartContext';

const PALETTE = {
  cream: '#F7F4EF', forest: '#264D3C', copper: '#B77C4B', ink: '#24342B',
  muted: '#68736A', white: '#FFFFFF', line: '#E3E5DB', soft: '#EAF0E8', error: '#A73D32',
};
const PROMPTS = [
  { icon: 'cafe-outline', label: 'Find my next favourite', message: 'Recommend something from the menu for me.' },
  { icon: 'wallet-outline', label: 'Something within my budget', message: 'What are the most affordable options on the menu?' },
  { icon: 'receipt-outline', label: 'Check my order', message: 'What is the status of my latest order?' },
  { icon: 'calendar-outline', label: 'Plan a cafe visit', message: 'How can I reserve a table?' },
];
const ALLOWED_SCREENS = ['Home', 'Orders', 'Reservations'];
const MAX_MESSAGE_LENGTH = 1000;
const money = (amount) => `LKR ${Number(amount).toLocaleString('en-LK', { maximumFractionDigits: 2 })}`;
const categoryIcon = (category) => ({
  Coffee: 'cafe-outline', Tea: 'leaf-outline', Snacks: 'fast-food-outline',
  Desserts: 'ice-cream-outline', Beverages: 'wine-outline',
}[category] || 'restaurant-outline');

function Recommendation({ item, quantity, onAdd }) {
  const available = Number.isFinite(Number(item.stock)) && Number(item.stock) > quantity;
  return (
    <View style={styles.recommendation}>
      <View style={styles.productIcon}><Ionicons name={categoryIcon(item.category)} size={24} color={PALETTE.forest} /></View>
      <View style={styles.productDetails}>
        <Text style={styles.productCategory}>{item.category || 'FROM THE MENU'}</Text>
        <Text style={styles.productName}>{item.name}</Text>
        {!!item.description && <Text style={styles.productDescription} numberOfLines={2}>{item.description}</Text>}
        <Text style={styles.productPrice}>{money(item.price)}</Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={available ? `Add ${item.name} to your cart` : `${item.name}, ${quantity ? 'stock limit reached' : 'unavailable'}`}
        accessibilityState={{ disabled: !available }}
        disabled={!available}
        onPress={() => onAdd(item)}
        style={[styles.addButton, !available && styles.addButtonDisabled]}
      >
        <Ionicons name={available ? 'add' : 'checkmark'} size={20} color={available ? PALETTE.white : PALETTE.muted} />
        <Text style={[styles.addLabel, !available && styles.disabledLabel]}>{available ? 'Add' : quantity ? 'In cart' : 'Sold out'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AssistantScreen({ navigation }) {
  const { cart, addToCart, cartCount } = useCart();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [failedRequest, setFailedRequest] = useState(null);
  const [error, setError] = useState('');
  const [cartNotice, setCartNotice] = useState('');
  const scrollRef = useRef(null);
  const requestRef = useRef(null);
  const sessionRef = useRef(0);
  const sequenceRef = useRef(0);
  const quantitiesRef = useRef({});
  quantitiesRef.current = Object.fromEntries(Object.entries(cart).map(([id, value]) => [id, value.quantity]));

  useEffect(() => () => {
    sessionRef.current += 1;
    requestRef.current?.abort();
  }, []);

  const scrollToEnd = () => scrollRef.current?.scrollToEnd({ animated: true });

  const performRequest = async (request) => {
    if (requestRef.current) return;
    const controller = new AbortController();
    const session = sessionRef.current;
    requestRef.current = controller;
    setPending(true);
    setError('');
    setFailedRequest(null);
    setMessages((current) => current.map((message) => message.id === request.id ? { ...message, status: 'sending' } : message));
    try {
      const response = await assistantAPI.chat({ message: request.message, history: request.history }, { signal: controller.signal });
      if (session !== sessionRef.current) return;
      const result = response.data?.data;
      if (!response.data?.success || typeof result?.reply !== 'string' || !['ai', 'guide'].includes(result.mode)) {
        throw new Error('The assistant returned an incomplete response. Please try again.');
      }
      setMode(result.mode);
      const latestAvailability = result.mode === 'guide' && result.availability
        ? {
          code: typeof result.availability.code === 'string' ? result.availability.code : 'unavailable',
          message: 'AI replies are unavailable right now. You can still use the menu guide.',
        }
        : null;
      setAvailability(latestAvailability);
      const assistantMessage = {
        id: `assistant-${++sequenceRef.current}`, role: 'assistant', content: result.reply,
        mode: result.mode,
        availability: latestAvailability,
        recommendations: (Array.isArray(result.recommendations) ? result.recommendations : [])
          .filter((item) => item?._id && typeof item.name === 'string' && Number.isFinite(Number(item.price))),
        actions: (Array.isArray(result.actions) ? result.actions : [])
          .filter((action) => action?.type === 'navigate' && ALLOWED_SCREENS.includes(action.screen) && typeof action.label === 'string'),
      };
      setMessages((current) => [
        ...current.map((message) => message.id === request.id ? { ...message, status: 'sent' } : message),
        assistantMessage,
      ]);
    } catch (requestError) {
      if (session !== sessionRef.current || controller.signal.aborted) return;
      const status = requestError.response?.status;
      const serverMessage = requestError.response?.data?.error;
      const message = status === 401
        ? 'Your session has expired. Please sign in again to use the assistant.'
        : status === 429
          ? 'The assistant is busy. Please wait a moment, then try again.'
          : typeof serverMessage === 'string' ? serverMessage
            : 'Could not reach the cafe assistant. Check your connection and try again.';
      setError(message);
      setFailedRequest(request);
      setMessages((current) => current.map((entry) => entry.id === request.id ? { ...entry, status: 'failed' } : entry));
    } finally {
      if (session === sessionRef.current) {
        requestRef.current = null;
        setPending(false);
      }
    }
  };

  const sendMessage = (text = draft) => {
    const message = text.trim();
    if (!message || message.length > MAX_MESSAGE_LENGTH || requestRef.current) return;
    const request = {
      id: `user-${++sequenceRef.current}`,
      message,
      history: messages.filter((entry) => entry.role === 'assistant' || entry.status === 'sent')
        .slice(-10).map(({ role, content }) => ({ role, content })),
    };
    setMessages((current) => [...current, { id: request.id, role: 'user', content: message, status: 'sending' }]);
    setDraft('');
    performRequest(request);
  };

  const clearChat = () => {
    sessionRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    setMessages([]);
    setDraft('');
    setError('');
    setFailedRequest(null);
    setPending(false);
    setMode(null);
    setAvailability(null);
    setCartNotice('');
  };

  const addRecommendation = (item) => {
    const quantity = quantitiesRef.current[item._id] || 0;
    if (!Number.isFinite(Number(item.stock)) || quantity >= Number(item.stock)) {
      setCartNotice('You have reached the available quantity for this item.');
      return;
    }
    quantitiesRef.current[item._id] = quantity + 1;
    addToCart(item);
    setCartNotice(`${item.name} added to your cart.`);
  };

  const goToScreen = (screen) => {
    if (ALLOWED_SCREENS.includes(screen)) navigation.navigate('CustomerTabs', { screen });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to cafe" onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={22} color={PALETTE.ink} />
          </TouchableOpacity>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>Cafe companion</Text>
            <View style={styles.modeRow}>
              <View style={styles.statusDot} />
              <Text style={styles.modeLabel}>{mode === 'ai' ? 'AI assistant' : mode === 'guide' ? 'Menu guide' : 'Here to help'}</Text>
            </View>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Start a new conversation" onPress={clearChat} style={styles.headerButton}>
            <Ionicons name="create-outline" size={22} color={PALETTE.forest} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.conversation}
          contentContainerStyle={styles.conversationContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
        >
          <View style={styles.contentColumn}>
            {messages.length === 0 ? (
              <View style={styles.welcome}>
                <View style={styles.welcomeIcon}><Ionicons name="sparkles" size={32} color={PALETTE.white} /></View>
                <Text style={styles.eyebrow}>A LITTLE HELP, FRESHLY BREWED</Text>
                <Text style={styles.welcomeTitle}>What sounds good today?</Text>
                <Text style={styles.welcomeDescription}>Find a new favourite, check your order, or plan your next visit. Let’s make it easy.</Text>
                <View style={styles.promptList}>
                  {PROMPTS.map((prompt) => (
                    <TouchableOpacity key={prompt.label} style={styles.prompt} onPress={() => sendMessage(prompt.message)} accessibilityRole="button">
                      <View style={styles.promptIcon}><Ionicons name={prompt.icon} size={22} color={PALETTE.forest} /></View>
                      <Text style={styles.promptText}>{prompt.label}</Text>
                      <Ionicons name="arrow-forward" size={18} color={PALETTE.copper} />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.welcomeNote}>Recommendations use the cafe’s current menu. Always check ingredients and allergies with the team.</Text>
              </View>
            ) : (
              <>
                <View style={styles.conversationStart}><Text style={styles.conversationStartText}>Your cafe, a conversation away</Text></View>
                {messages.map((message) => (
                  <View key={message.id} style={[styles.messageGroup, message.role === 'user' && styles.userMessageGroup]}>
                    {message.role === 'assistant' && (
                      <View style={styles.assistantLabel}><Ionicons name={message.mode === 'ai' ? 'sparkles' : 'cafe-outline'} size={14} color={PALETTE.forest} /><Text style={styles.assistantLabelText}>{message.mode === 'ai' ? 'CAFE AI' : 'MENU GUIDE'}</Text></View>
                    )}
                    <View style={[styles.messageBubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                      <Text selectable style={[styles.messageText, message.role === 'user' && styles.userText]}>{message.content}</Text>
                    </View>
                    {message.status === 'failed' && <Text style={styles.notSent}>Not sent</Text>}
                    {message.recommendations?.map((item) => (
                      <Recommendation key={`${message.id}-${item._id}`} item={item} quantity={cart[item._id]?.quantity || 0} onAdd={addRecommendation} />
                    ))}
                    {!!message.actions?.length && <View style={styles.actions}>
                      {message.actions.map((action, index) => (
                        <TouchableOpacity key={`${action.screen}-${index}`} style={styles.actionButton} accessibilityRole="button" onPress={() => goToScreen(action.screen)}>
                          <Text style={styles.actionLabel}>{action.label}</Text><Ionicons name="arrow-forward" size={16} color={PALETTE.forest} />
                        </TouchableOpacity>
                      ))}
                    </View>}
                  </View>
                ))}
                {pending && <View style={styles.thinking} accessibilityLiveRegion="polite"><ActivityIndicator size="small" color={PALETTE.forest} /><Text style={styles.thinkingText}>Checking the cafe for you…</Text></View>}
              </>
            )}
            {!!error && <View style={styles.errorBox} accessibilityLiveRegion="polite">
              <Ionicons name="cloud-offline-outline" size={20} color={PALETTE.error} />
              <View style={styles.errorContent}><Text style={styles.errorText}>{error}</Text>
                {!!failedRequest && <TouchableOpacity accessibilityRole="button" onPress={() => performRequest(failedRequest)} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text><Ionicons name="refresh" size={14} color={PALETTE.error} /></TouchableOpacity>}
              </View>
            </View>}
          </View>
        </ScrollView>

        <View style={styles.composerArea}>
          <View style={styles.contentColumn}>
            {!!cartNotice && <View style={styles.cartNotice} accessibilityLiveRegion="polite"><Ionicons name="checkmark-circle" size={16} color={PALETTE.forest} /><Text style={styles.cartNoticeText}>{cartNotice}</Text><TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('CustomerTabs', { screen: 'Home', params: { openCart: true } })}><Text style={styles.viewCart}>View cart{cartCount ? ` (${cartCount})` : ''}</Text></TouchableOpacity></View>}
            {mode === 'guide' && <Text style={styles.guideNote} accessibilityLiveRegion="polite">{availability?.message || 'Menu guide is active. Ask about menu items, your orders, or reservations.'}</Text>}
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                placeholder="Ask your cafe companion…"
                placeholderTextColor={PALETTE.muted}
                value={draft}
                onChangeText={setDraft}
                multiline
                maxLength={MAX_MESSAGE_LENGTH}
                accessibilityLabel="Message your cafe companion"
                editable={!pending}
                onKeyPress={(event) => {
                  if (Platform.OS === 'web' && event.nativeEvent.key === 'Enter' && !event.shiftKey && !event.nativeEvent.shiftKey) {
                    event.preventDefault?.();
                    sendMessage();
                  }
                }}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!draft.trim() || pending) && styles.sendDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                accessibilityState={{ disabled: !draft.trim() || pending }}
                disabled={!draft.trim() || pending}
                onPress={() => sendMessage()}
              >{pending ? <ActivityIndicator size="small" color={PALETTE.white} /> : <Ionicons name="arrow-up" size={22} color={PALETTE.white} />}</TouchableOpacity>
            </View>
            <Text style={styles.composerNote}>{draft.length >= 900 ? `${draft.length}/${MAX_MESSAGE_LENGTH} characters · ` : ''}You review your cart before placing an order.</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PALETTE.cream },
  keyboardView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: PALETTE.line, backgroundColor: PALETTE.cream },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: PALETTE.white },
  headerTitleGroup: { flex: 1 },
  headerTitle: { color: PALETTE.ink, fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  statusDot: { height: 6, width: 6, borderRadius: 3, backgroundColor: PALETTE.forest },
  modeLabel: { color: PALETTE.muted, fontSize: 12 },
  conversation: { flex: 1 },
  conversationContent: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 },
  contentColumn: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  welcome: { paddingTop: 20, paddingBottom: 16, alignItems: 'center' },
  welcomeIcon: { width: 72, height: 72, borderRadius: 25, backgroundColor: PALETTE.forest, alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
  eyebrow: { color: PALETTE.copper, fontSize: 10, fontWeight: '700', letterSpacing: 1.7, textAlign: 'center' },
  welcomeTitle: { maxWidth: 360, fontSize: 40, lineHeight: 46, letterSpacing: -1.8, color: PALETTE.ink, textAlign: 'center', fontWeight: '700', marginTop: 12 },
  welcomeDescription: { maxWidth: 380, textAlign: 'center', color: PALETTE.muted, fontSize: 15, lineHeight: 24, marginTop: 15 },
  promptList: { width: '100%', maxWidth: 460, marginTop: 30, gap: 10 },
  prompt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: PALETTE.white, borderWidth: 1, borderColor: PALETTE.line },
  promptIcon: { height: 42, width: 42, borderRadius: 14, backgroundColor: PALETTE.soft, alignItems: 'center', justifyContent: 'center' },
  promptText: { flex: 1, color: PALETTE.ink, fontWeight: '600', fontSize: 14 },
  welcomeNote: { color: PALETTE.muted, textAlign: 'center', fontSize: 11, lineHeight: 18, maxWidth: 360, marginTop: 24 },
  conversationStart: { alignItems: 'center', marginBottom: 24 },
  conversationStartText: { color: PALETTE.muted, fontSize: 11 },
  messageGroup: { alignSelf: 'flex-start', width: '100%', maxWidth: '94%', marginBottom: 24, minWidth: 80 },
  userMessageGroup: { alignSelf: 'flex-end', width: 'auto', maxWidth: '88%' },
  assistantLabel: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 8, marginLeft: 2 },
  assistantLabelText: { color: PALETTE.forest, fontWeight: '700', fontSize: 10, letterSpacing: 1 },
  messageBubble: { paddingHorizontal: 17, paddingVertical: 14, borderRadius: 20 },
  assistantBubble: { backgroundColor: PALETTE.white, borderTopLeftRadius: 4, borderWidth: 1, borderColor: PALETTE.line },
  userBubble: { backgroundColor: PALETTE.forest, borderBottomRightRadius: 4 },
  messageText: { color: PALETTE.ink, fontSize: 15, lineHeight: 24 },
  userText: { color: PALETTE.white },
  notSent: { color: PALETTE.error, textAlign: 'right', fontSize: 11, marginTop: 5 },
  recommendation: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: PALETTE.white, borderRadius: 18, borderWidth: 1, borderColor: PALETTE.line, padding: 14, marginTop: 10, width: '100%' },
  productIcon: { width: 44, height: 54, borderRadius: 14, backgroundColor: PALETTE.soft, alignItems: 'center', justifyContent: 'center' },
  productDetails: { flex: 1, minWidth: 0 },
  productCategory: { color: PALETTE.copper, fontWeight: '700', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
  productName: { color: PALETTE.ink, fontWeight: '700', fontSize: 14, marginTop: 4 },
  productDescription: { color: PALETTE.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  productPrice: { color: PALETTE.forest, fontSize: 13, fontWeight: '700', marginTop: 7 },
  addButton: { minWidth: 54, minHeight: 52, paddingHorizontal: 10, borderRadius: 14, backgroundColor: PALETTE.forest, alignItems: 'center', justifyContent: 'center', gap: 2 },
  addButtonDisabled: { backgroundColor: PALETTE.soft },
  addLabel: { color: PALETTE.white, fontSize: 10, fontWeight: '700' },
  disabledLabel: { color: PALETTE.muted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actionButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 13, backgroundColor: PALETTE.soft },
  actionLabel: { color: PALETTE.forest, fontWeight: '600', fontSize: 13 },
  thinking: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 24, paddingLeft: 4 },
  thinkingText: { color: PALETTE.muted, fontSize: 13 },
  errorBox: { flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#E8CFC7', backgroundColor: '#FFF6F1', padding: 16, borderRadius: 18, marginBottom: 14 },
  errorContent: { flex: 1 },
  errorText: { color: PALETTE.error, fontSize: 13, lineHeight: 20 },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start' },
  retryText: { color: PALETTE.error, fontSize: 13, fontWeight: '700' },
  composerArea: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, backgroundColor: PALETTE.cream, borderTopWidth: 1, borderTopColor: PALETTE.line },
  guideNote: { color: PALETTE.muted, fontSize: 11, lineHeight: 17, marginBottom: 10 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 8, borderWidth: 1, borderColor: PALETTE.line, backgroundColor: PALETTE.white, borderRadius: 22 },
  input: { flex: 1, fontSize: 14, lineHeight: 21, color: PALETTE.ink, minHeight: 44, maxHeight: 126, paddingVertical: 12, paddingHorizontal: 8, textAlignVertical: 'center', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  sendButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: PALETTE.forest, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.45 },
  composerNote: { fontSize: 10, color: PALETTE.muted, textAlign: 'center', lineHeight: 16, marginTop: 8 },
  cartNotice: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingBottom: 12, flexWrap: 'wrap' },
  cartNoticeText: { flex: 1, fontSize: 12, color: PALETTE.forest, minWidth: 100 },
  viewCart: { color: PALETTE.forest, fontSize: 12, fontWeight: '700', paddingVertical: 8 },
});
