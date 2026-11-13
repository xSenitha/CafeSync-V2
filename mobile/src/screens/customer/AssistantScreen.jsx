import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { assistantAPI } from '../../api/assistant.api';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, TOUCH_TARGET } from '../../constants/spacing';
import { FONTS } from '../../constants/typography';
import { SHADOWS } from '../../constants/colors';

const PROMPTS = [
  { icon: 'cafe-outline', label: 'Find my next favourite', message: 'Recommend something from the menu for me.' },
  { icon: 'wallet-outline', label: 'Something within my budget', message: 'What are the most affordable options on the menu?' },
  { icon: 'receipt-outline', label: 'Check my order', message: 'What is the status of my latest order?' },
  { icon: 'calendar-outline', label: 'Plan a cafe visit', message: 'How can I reserve a table?' },
];

const ALLOWED_SCREENS = ['Home', 'Orders', 'Reservations'];
const MAX_MESSAGE_LENGTH = 1000;
const money = (amount) => `Rs. ${Number(amount).toLocaleString('en-LK', { maximumFractionDigits: 2 })}`;

const categoryIcon = (category) => ({
  Coffee: 'cafe-outline',
  Tea: 'leaf-outline',
  Snacks: 'fast-food-outline',
  Desserts: 'ice-cream-outline',
  Beverages: 'wine-outline',
}[category] || 'restaurant-outline');

function Recommendation({ item, quantity, onAdd, colors }) {
  const available = Number.isFinite(Number(item.stock)) && Number(item.stock) > quantity;
  return (
    <View style={[styles.recommendation, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
      <View style={[styles.productIcon, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={categoryIcon(item.category)} size={22} color={colors.primary} />
      </View>
      <View style={styles.productDetails}>
        <Text style={[styles.productCategory, { color: colors.accent }]}>{item.category || 'FROM THE MENU'}</Text>
        <Text style={[styles.productName, { color: colors.text, fontFamily: FONTS.serif }]}>{item.name}</Text>
        {!!item.description && (
          <Text style={[styles.productDescription, { color: colors.textLight }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text style={[styles.productPrice, { color: colors.text }]}>{money(item.price)}</Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={available ? `Add ${item.name} to your cart` : `${item.name}, ${quantity ? 'stock limit reached' : 'unavailable'}`}
        accessibilityState={{ disabled: !available }}
        disabled={!available}
        onPress={() => onAdd(item)}
        style={[
          styles.addButton,
          { backgroundColor: available ? colors.primary : colors.surfaceAlt },
        ]}
      >
        <Ionicons
          name={available ? 'add' : 'checkmark'}
          size={18}
          color={available ? colors.surface : colors.textLight}
        />
        <Text
          style={[
            styles.addLabel,
            { color: available ? colors.surface : colors.textLight },
          ]}
        >
          {available ? 'Add' : quantity ? 'In bag' : 'Sold out'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AssistantScreen({ navigation }) {
  const { cart, addToCart, cartCount } = useCart();
  const { colors } = useTheme();

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
          message: 'AI replies are resting. You can still use our crafted menu guide.',
        }
        : null;
      setAvailability(latestAvailability);
      const assistantMessage = {
        id: `assistant-${++sequenceRef.current}`,
        role: 'assistant',
        content: result.reply,
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
        ? 'Your session has expired. Please sign in again to chat with the assistant.'
        : status === 429
          ? 'The assistant is currently busy. Please wait a moment, then try again.'
          : typeof serverMessage === 'string' ? serverMessage
            : 'Could not reach the cafe assistant. Please check your connection and try again.';
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
      history: messages
        .filter((entry) => entry.role === 'assistant' || entry.status === 'sent')
        .slice(-10)
        .map(({ role, content }) => ({ role, content })),
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
      setCartNotice('You have reached the available stock for this item.');
      return;
    }
    quantitiesRef.current[item._id] = quantity + 1;
    addToCart(item);
    setCartNotice(`${item.name} added to your bag.`);
  };

  const goToScreen = (screen) => {
    if (ALLOWED_SCREENS.includes(screen)) navigation.navigate('CustomerTabs', { screen });
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back to cafe"
            onPress={() => navigation.goBack()}
            style={[styles.headerButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleGroup}>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
              Cafe Companion
            </Text>
            <View style={styles.modeRow}>
              <View style={[styles.statusDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.modeLabel, { color: colors.textLight }]}>
                {mode === 'ai' ? 'AI Barista Active' : mode === 'guide' ? 'Menu Guide' : 'Here for your pause'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Start a new conversation"
            onPress={clearChat}
            style={[styles.headerButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
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
                <View style={[styles.welcomeIcon, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}>
                  <Ionicons name="sparkles" size={32} color={colors.accent} />
                </View>
                <Text style={[styles.eyebrow, { color: colors.accent }]}>A LITTLE TIME FOR YOURSELF</Text>
                <Text style={[styles.welcomeTitle, { color: colors.text, fontFamily: FONTS.serif }]}>
                  What sounds wonderful today?
                </Text>
                <Text style={[styles.welcomeDescription, { color: colors.textMid }]}>
                  Find your next favorite roast, check an active order, or plan your next quiet visit.
                </Text>

                <View style={styles.promptList}>
                  {PROMPTS.map((prompt) => (
                    <TouchableOpacity
                      key={prompt.label}
                      style={[styles.prompt, { backgroundColor: colors.surface, borderColor: colors.divider }, SHADOWS.card.web]}
                      onPress={() => sendMessage(prompt.message)}
                      accessibilityRole="button"
                    >
                      <View style={[styles.promptIcon, { backgroundColor: colors.surfaceAlt }]}>
                        <Ionicons name={prompt.icon} size={20} color={colors.primary} />
                      </View>
                      <Text style={[styles.promptText, { color: colors.text }]}>{prompt.label}</Text>
                      <Ionicons name="arrow-forward" size={17} color={colors.accent} />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.welcomeNote, { color: colors.textLight }]}>
                  Suggestions reflect our freshly updated cafe menu. Please inform baristas of any dietary restrictions.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.conversationStart}>
                  <Text style={[styles.conversationStartText, { color: colors.textLight }]}>
                    A slow moment, a conversation away
                  </Text>
                </View>

                {messages.map((message) => (
                  <View
                    key={message.id}
                    style={[styles.messageGroup, message.role === 'user' && styles.userMessageGroup]}
                  >
                    {message.role === 'assistant' && (
                      <View style={styles.assistantLabel}>
                        <Ionicons
                          name={message.mode === 'ai' ? 'sparkles' : 'cafe-outline'}
                          size={13}
                          color={colors.accent}
                        />
                        <Text style={[styles.assistantLabelText, { color: colors.accent }]}>
                          {message.mode === 'ai' ? 'CAFE AI' : 'MENU GUIDE'}
                        </Text>
                      </View>
                    )}

                    <View
                      style={[
                        styles.messageBubble,
                        message.role === 'user'
                          ? [styles.userBubble, { backgroundColor: colors.primary }]
                          : [styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.divider }],
                      ]}
                    >
                      <Text
                        selectable
                        style={[
                          styles.messageText,
                          { color: message.role === 'user' ? colors.surface : colors.text },
                        ]}
                      >
                        {message.content}
                      </Text>
                    </View>

                    {message.status === 'failed' && (
                      <Text style={[styles.notSent, { color: colors.danger }]}>Not sent</Text>
                    )}

                    {message.recommendations?.map((item) => (
                      <Recommendation
                        key={`${message.id}-${item._id}`}
                        item={item}
                        quantity={cart[item._id]?.quantity || 0}
                        onAdd={addRecommendation}
                        colors={colors}
                      />
                    ))}

                    {!!message.actions?.length && (
                      <View style={styles.actions}>
                        {message.actions.map((action, index) => (
                          <TouchableOpacity
                            key={`${action.screen}-${index}`}
                            style={[styles.actionButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
                            accessibilityRole="button"
                            onPress={() => goToScreen(action.screen)}
                          >
                            <Text style={[styles.actionLabel, { color: colors.primary }]}>{action.label}</Text>
                            <Ionicons name="arrow-forward" size={15} color={colors.primary} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))}

                {pending && (
                  <View style={styles.thinking} accessibilityLiveRegion="polite">
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.thinkingText, { color: colors.textMid }]}>
                      Checking the cafe corner for you…
                    </Text>
                  </View>
                )}
              </>
            )}

            {!!error && (
              <View
                style={[styles.errorBox, { backgroundColor: colors.dangerLight, borderColor: colors.danger + '40' }]}
                accessibilityLiveRegion="polite"
              >
                <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
                <View style={styles.errorContent}>
                  <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                  {!!failedRequest && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => performRequest(failedRequest)}
                      style={styles.retryButton}
                    >
                      <Text style={[styles.retryText, { color: colors.danger }]}>Try again</Text>
                      <Ionicons name="refresh" size={14} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Composer Bar */}
        <View style={[styles.composerArea, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
          <View style={styles.contentColumn}>
            {!!cartNotice && (
              <View style={styles.cartNotice} accessibilityLiveRegion="polite">
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.cartNoticeText, { color: colors.text }]}>{cartNotice}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('CustomerTabs', { screen: 'Home', params: { openCart: true } })}
                >
                  <Text style={[styles.viewCart, { color: colors.accent }]}>
                    View bag{cartCount ? ` (${cartCount})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'guide' && (
              <Text style={[styles.guideNote, { color: colors.textLight }]} accessibilityLiveRegion="polite">
                {availability?.message || 'Menu guide is active. Ask about brews, pastries, or reservations.'}
              </Text>
            )}

            <View style={[styles.composer, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}>
              <TextInput
                style={[styles.input, { color: colors.text, fontFamily: FONTS.sans }]}
                placeholder="Ask your cafe companion…"
                placeholderTextColor={colors.textLight}
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
                style={[
                  styles.sendButton,
                  { backgroundColor: colors.primary },
                  (!draft.trim() || pending) && styles.sendDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                accessibilityState={{ disabled: !draft.trim() || pending }}
                disabled={!draft.trim() || pending}
                onPress={() => sendMessage()}
              >
                {pending ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Ionicons name="arrow-up" size={20} color={colors.surface} />
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.composerNote, { color: colors.textLight }]}>
              {draft.length >= 900 ? `${draft.length}/${MAX_MESSAGE_LENGTH} characters · ` : ''}
              You review your bag before placing any order.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  headerTitleGroup: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { height: 6, width: 6, borderRadius: 3 },
  modeLabel: { fontSize: 11, fontFamily: FONTS.sans },
  conversation: { flex: 1 },
  conversationContent: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 20 },
  contentColumn: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  welcome: { paddingTop: 16, paddingBottom: 16, alignItems: 'center' },
  welcomeIcon: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    textAlign: 'center',
    fontFamily: FONTS.sans,
  },
  welcomeTitle: {
    maxWidth: 360,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 8,
  },
  welcomeDescription: {
    maxWidth: 400,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    fontFamily: FONTS.sans,
  },
  promptList: { width: '100%', maxWidth: 460, marginTop: 24, gap: 10 },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: RADIUS.base,
    borderWidth: 1,
    minHeight: TOUCH_TARGET.buttonHeight,
  },
  promptIcon: {
    height: 38,
    width: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: { flex: 1, fontWeight: '600', fontSize: 14, fontFamily: FONTS.sans },
  welcomeNote: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 18,
    maxWidth: 360,
    marginTop: 22,
    fontFamily: FONTS.sans,
  },
  conversationStart: { alignItems: 'center', marginBottom: 20 },
  conversationStartText: { fontSize: 11, fontFamily: FONTS.sans },
  messageGroup: { alignSelf: 'flex-start', width: '100%', maxWidth: '94%', marginBottom: 20, minWidth: 80 },
  userMessageGroup: { alignSelf: 'flex-end', width: 'auto', maxWidth: '88%' },
  assistantLabel: { flexDirection: 'row', gap: 5, alignItems: 'center', marginBottom: 6, marginLeft: 2 },
  assistantLabelText: { fontWeight: '700', fontSize: 10, letterSpacing: 1, fontFamily: FONTS.sans },
  messageBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: RADIUS.xl },
  assistantBubble: { borderTopLeftRadius: 4, borderWidth: 1 },
  userBubble: { borderBottomRightRadius: 4 },
  messageText: { fontSize: 14, lineHeight: 22, fontFamily: FONTS.sans },
  notSent: { textAlign: 'right', fontSize: 11, marginTop: 4 },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: RADIUS.base,
    borderWidth: 1,
    padding: 12,
    marginTop: 10,
    width: '100%',
  },
  productIcon: {
    width: 44,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetails: { flex: 1, minWidth: 0 },
  productCategory: {
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: FONTS.sans,
  },
  productName: { fontWeight: '700', fontSize: 14, marginTop: 2 },
  productDescription: { fontSize: 11, lineHeight: 16, marginTop: 2, fontFamily: FONTS.sans },
  productPrice: { fontSize: 13, fontWeight: '700', marginTop: 4, fontFamily: FONTS.sans },
  addButton: {
    minWidth: 56,
    minHeight: TOUCH_TARGET.min,
    paddingHorizontal: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addLabel: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.sans },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actionButton: {
    minHeight: TOUCH_TARGET.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  actionLabel: { fontWeight: '600', fontSize: 13, fontFamily: FONTS.sans },
  thinking: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 20, paddingLeft: 4 },
  thinkingText: { fontSize: 13, fontFamily: FONTS.sans },
  errorBox: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    padding: 14,
    borderRadius: RADIUS.base,
    marginBottom: 14,
  },
  errorContent: { flex: 1 },
  errorText: { fontSize: 13, lineHeight: 19, fontFamily: FONTS.sans },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TOUCH_TARGET.min, alignSelf: 'flex-start' },
  retryText: { fontSize: 13, fontWeight: '700' },
  composerArea: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, borderTopWidth: 1 },
  guideNote: { fontSize: 11, lineHeight: 16, marginBottom: 8, fontFamily: FONTS.sans },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 6,
    borderWidth: 1,
    borderRadius: RADIUS.xxl,
  },
  input: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    minHeight: TOUCH_TARGET.min,
    maxHeight: 120,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  sendButton: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
  composerNote: { fontSize: 10, textAlign: 'center', lineHeight: 15, marginTop: 6, fontFamily: FONTS.sans },
  cartNotice: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingBottom: 10, flexWrap: 'wrap' },
  cartNoticeText: { flex: 1, fontSize: 12, minWidth: 100, fontFamily: FONTS.sans },
  viewCart: { fontSize: 12, fontWeight: '700', paddingVertical: 6, fontFamily: FONTS.sans },
});
