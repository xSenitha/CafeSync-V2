import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { FONTS } from '../../constants/typography';

const BUTTON_SIZE = 50;
const SNAP_MARGIN = 14;
const IDLE_DELAY = 3000;
const IDLE_OPACITY = 0.70;
const ACTIVE_OPACITY = 1.0;

const QUICK_PROMPTS = [
  { icon: 'cafe-outline',     label: 'Recommend something special', message: 'Recommend something special from the menu for me.' },
  { icon: 'sparkles-outline', label: 'Coffee & pastry pairing',     message: 'What pastry or snack pairs best with a cappuccino?' },
  { icon: 'receipt-outline',  label: 'Check order status',          message: 'What is the status of my latest order?' },
  { icon: 'calendar-outline', label: 'Reserve a quiet table',       message: 'How do I reserve a quiet table today?' },
];

export default function FloatingAssistiveAssistant({ onPress }) {
  const { isDark, colors } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const safeWidth = windowWidth > 0 ? windowWidth : 390;
  const safeHeight = windowHeight > 0 ? windowHeight : 844;

  const tabOffset = Platform.select({
    web: 76,
    default: Math.max(72, insets.bottom + 60),
  });

  const getDockPosition = useCallback((w, h) => {
    const maxX = Math.max(SNAP_MARGIN, w - BUTTON_SIZE - SNAP_MARGIN);
    const maxY = Math.max(
      insets.top + SNAP_MARGIN,
      h - tabOffset - BUTTON_SIZE - 12
    );
    return { x: maxX, y: maxY };
  }, [insets.top, tabOffset]);

  const defaultPos = getDockPosition(safeWidth, safeHeight);

  const pan          = useRef(new Animated.ValueXY(defaultPos)).current;
  const currentPos   = useRef(defaultPos);
  const opacityAnim  = useRef(new Animated.Value(ACTIVE_OPACITY)).current;
  const scaleAnim    = useRef(new Animated.Value(0.1)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const auraAnim     = useRef(new Animated.Value(1)).current;
  const auraOpacity  = useRef(new Animated.Value(0.45)).current;

  const [isOpen, setIsOpen] = useState(false);
  const popupScale   = useRef(new Animated.Value(0.8)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;

  const idleTimer  = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Track pan coordinates
  useEffect(() => {
    const id = pan.addListener((v) => { currentPos.current = v; });
    return () => pan.removeListener(id);
  }, [pan]);

  // Entrance spring animation on mount: pops in nicely
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 65,
      friction: 6,
      useNativeDriver: false,
    }).start();
  }, [scaleAnim]);

  // Pulse + aura loops for living ambient feel
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1600, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1.0,  duration: 1600, useNativeDriver: false }),
      ])
    );
    const aura = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(auraAnim,    { toValue: 1.35, duration: 2200, useNativeDriver: false }),
          Animated.timing(auraOpacity, { toValue: 0,    duration: 2200, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(auraAnim,    { toValue: 1.0,  duration: 0,   useNativeDriver: false }),
          Animated.timing(auraOpacity, { toValue: 0.45, duration: 300, useNativeDriver: false }),
        ]),
      ])
    );
    pulse.start();
    aura.start();
    return () => { pulse.stop(); aura.stop(); };
  }, [pulseAnim, auraAnim, auraOpacity]);

  // Idle dimming
  const wakeUp = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
    Animated.timing(opacityAnim, {
      toValue: ACTIVE_OPACITY,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [opacityAnim]);

  const scheduleDim = useCallback(() => {
    if (isOpen) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      Animated.timing(opacityAnim, {
        toValue: IDLE_OPACITY,
        duration: 350,
        useNativeDriver: false,
      }).start();
    }, IDLE_DELAY);
  }, [isOpen, opacityAnim]);

  useEffect(() => {
    scheduleDim();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [scheduleDim]);

  // Edge snap physics
  const snapToEdge = useCallback((cx, cy) => {
    const mid = (safeWidth - BUTTON_SIZE) / 2;
    const tx  = cx < mid ? SNAP_MARGIN : safeWidth - BUTTON_SIZE - SNAP_MARGIN;
    const minY = Math.max(SNAP_MARGIN, insets.top + 8);
    const maxY = Math.max(minY, safeHeight - tabOffset - BUTTON_SIZE - 10);
    const ty   = Math.min(Math.max(cy, minY), maxY);

    Animated.spring(pan, {
      toValue: { x: tx, y: ty },
      tension: 45,
      friction: 7,
      useNativeDriver: false,
    }).start(() => scheduleDim());
  }, [safeWidth, safeHeight, insets.top, tabOffset, pan, scheduleDim]);

  // Sync / Dock position when screen dimensions update
  useEffect(() => {
    if (windowWidth > 0 && windowHeight > 0) {
      const { x: dockX, y: dockY } = getDockPosition(windowWidth, windowHeight);
      if (
        currentPos.current.x <= 0 ||
        currentPos.current.x > windowWidth - BUTTON_SIZE ||
        currentPos.current.y <= 0 ||
        currentPos.current.y > windowHeight - BUTTON_SIZE
      ) {
        pan.setValue({ x: dockX, y: dockY });
        currentPos.current = { x: dockX, y: dockY };
      }
    }
  }, [windowWidth, windowHeight, getDockPosition, pan]);

  // Popup open/close
  const openPopup = useCallback(() => {
    wakeUp();
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(popupScale,  { toValue: 1, tension: 80, friction: 7, useNativeDriver: false }),
      Animated.timing(popupOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start();
  }, [popupOpacity, popupScale, wakeUp]);

  const closePopup = useCallback(() => {
    Animated.parallel([
      Animated.timing(popupScale,   { toValue: 0.8, duration: 150, useNativeDriver: false }),
      Animated.timing(popupOpacity, { toValue: 0,   duration: 150, useNativeDriver: false }),
    ]).start(() => {
      setIsOpen(false);
      scheduleDim();
    });
  }, [popupOpacity, popupScale, scheduleDim]);

  const handlePress = useCallback(() => {
    wakeUp();
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.90, duration: 80, useNativeDriver: false }),
      Animated.spring(scaleAnim,  { toValue: 1.0, tension: 80, friction: 6, useNativeDriver: false }),
    ]).start();

    if (isOpen) {
      closePopup();
    } else {
      openPopup();
    }
  }, [closePopup, isOpen, openPopup, scaleAnim, wakeUp]);

  const handleNavigateToChat = useCallback((msg) => {
    closePopup();
    if (onPress) {
      onPress(msg);
    } else {
      navigation.navigate('Assistant', msg ? { initialMessage: msg } : undefined);
    }
  }, [closePopup, navigation, onPress]);

  // Pan responder for drag & drop
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
    onPanResponderGrant: () => {
      wakeUp();
      if (isOpen) closePopup();
      setIsDragging(true);
      Animated.spring(scaleAnim, { toValue: 1.08, tension: 100, friction: 8, useNativeDriver: false }).start();
      pan.setOffset({ x: currentPos.current.x, y: currentPos.current.y });
      pan.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      pan.flattenOffset();
      setIsDragging(false);
      Animated.spring(scaleAnim, { toValue: 1.0, tension: 100, friction: 8, useNativeDriver: false }).start();
      if (Math.hypot(g.dx, g.dy) < 7) {
        handlePress();
      } else {
        snapToEdge(currentPos.current.x, currentPos.current.y);
      }
    },
    onPanResponderTerminate: () => {
      pan.flattenOffset();
      setIsDragging(false);
      Animated.spring(scaleAnim, { toValue: 1.0, useNativeDriver: false }).start();
      snapToEdge(currentPos.current.x, currentPos.current.y);
    },
    onPanResponderTerminationRequest: () => false,
  })).current;

  const isDockedLeft = currentPos.current.x < (safeWidth - BUTTON_SIZE) / 2;
  const isBottomHalf = currentPos.current.y > safeHeight / 2;
  const popupH = isDockedLeft ? { left: SNAP_MARGIN } : { right: SNAP_MARGIN };
  const popupV = isBottomHalf
    ? { bottom: Math.max(16, safeHeight - currentPos.current.y + 12) }
    : { top:    Math.max(16, currentPos.current.y + BUTTON_SIZE + 12) };

  return (
    <>
      {/* Backdrop: only active when popup is open */}
      {isOpen && (
        <TouchableWithoutFeedback onPress={closePopup}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
      )}

      {/* Concierge popup card */}
      {isOpen && (
        <Animated.View
          style={[
            styles.popupCard,
            popupH, popupV,
            {
              backgroundColor: isDark ? '#201511' : '#FFFDF9',
              borderColor: isDark ? 'rgba(217,119,74,0.35)' : 'rgba(217,119,74,0.25)',
              transform: [{ scale: popupScale }],
              opacity: popupOpacity,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.popupHeader}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconBadge, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="sparkles" size={16} color={colors.accent} />
              </View>
              <View style={styles.headerTextCol}>
                <Text style={[styles.popupTitle,    { color: colors.text,      fontFamily: FONTS.serif }]}>CafeSync Assistant</Text>
                <Text style={[styles.popupSubtitle, { color: colors.textLight, fontFamily: FONTS.sans  }]}>A little time for yourself</Text>
              </View>
            </View>
            <TouchableOpacity onPress={closePopup} accessibilityRole="button" accessibilityLabel="Close assistant menu"
              style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="close" size={16} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Quick prompts */}
          <View style={styles.promptsSection}>
            <Text style={[styles.promptsLabel, { color: colors.textLight, fontFamily: FONTS.sans }]}>QUICK CONCIERGE PROMPTS</Text>
            {QUICK_PROMPTS.map((p, i) => (
              <TouchableOpacity key={i} activeOpacity={0.7} onPress={() => handleNavigateToChat(p.message)}
                style={[styles.promptRow, { backgroundColor: isDark ? '#2B1C17' : '#F9F5F0', borderColor: isDark ? '#3D2821' : '#EFE5DA' }]}>
                <View style={[styles.promptIconWrap, { backgroundColor: isDark ? '#38251E' : '#F2E8DC' }]}>
                  <Ionicons name={p.icon} size={15} color={colors.accent} />
                </View>
                <Text numberOfLines={1} style={[styles.promptText, { color: colors.text, fontFamily: FONTS.sans }]}>{p.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Primary CTA */}
          <TouchableOpacity activeOpacity={0.85} onPress={() => handleNavigateToChat()} style={[styles.fullChatBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="chatbubbles" size={16} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={[styles.fullChatText, { fontFamily: FONTS.sans }]}>Open Full AI Chat</Text>
            <Ionicons name="arrow-forward" size={15} color="#FFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <Text style={[styles.footerHint, { color: colors.textLight, fontFamily: FONTS.sans }]}>✦ Drag the floating orb anywhere to dock</Text>
        </Animated.View>
      )}

      {/* Floating Orb: pointerEvents="box-none" lets all touches pass through to app */}
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          {...panResponder.panHandlers}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Cafe AI Assistant"
          accessibilityHint="Tap to open the AI assistant. Drag to reposition."
          style={[
            styles.container,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { scale: scaleAnim },
              ],
              opacity: opacityAnim,
            },
            Platform.select({
              web: {
                cursor: isDragging ? 'grabbing' : 'pointer',
                userSelect: 'none',
                touchAction: 'none',
                outline: 'none',
                border: 'none',
                backgroundColor: 'transparent',
              },
            }),
          ]}
        >
          {/* Ambient Breathing Aura */}
          <Animated.View pointerEvents="none" style={[styles.auraRing, {
            transform: [{ scale: auraAnim }],
            opacity: auraOpacity,
            borderColor: isDark ? 'rgba(217,119,74,0.35)' : 'rgba(217,119,74,0.25)',
          }]} />

          {/* Outer Circular Jewel Disc */}
          <View style={[styles.outerDisc, isDark ? styles.outerDiscDark : styles.outerDiscLight]}>
            {/* Middle Champagne Ring */}
            <View style={[styles.middleRing, isDark ? styles.middleRingDark : styles.middleRingLight]}>
              {/* Inner Glowing Core */}
              <Animated.View style={[styles.innerCore, { transform: [{ scale: pulseAnim }] }]}>
                <Ionicons name="sparkles" size={16} color="#FFF8EE" />
              </Animated.View>
            </View>

            {/* Glowing Live AI Status Pearl */}
            <View style={styles.statusPearl}>
              <View style={styles.statusPearlInner} />
            </View>
          </View>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 9998,
    elevation: 9998,
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    elevation: 10000,
    backgroundColor: 'transparent',
    overflow: 'visible',
    borderWidth: 0,
  },
  auraRing: {
    position: 'absolute',
    width: BUTTON_SIZE + 6,
    height: BUTTON_SIZE + 6,
    borderRadius: (BUTTON_SIZE + 6) / 2,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  outerDisc: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#1A0C06',
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.38,
        shadowRadius: 14,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 10px 28px rgba(43,24,16,0.32), 0 2px 8px rgba(217,119,74,0.25), inset 0 1px 1px rgba(255,255,255,0.25)',
      },
    }),
  },
  outerDiscLight: {
    backgroundColor: '#342720',
    borderColor: 'rgba(244,237,228,0.32)',
  },
  outerDiscDark: {
    backgroundColor: '#231812',
    borderColor: 'rgba(244,237,228,0.22)',
  },
  middleRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  middleRingLight: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(244,237,228,0.26)',
  },
  middleRingDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(244,237,228,0.18)',
  },
  innerCore: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPearl: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#1A0C06',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  statusPearlInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34D399',
    ...Platform.select({
      web: { boxShadow: '0 0 6px rgba(52,211,153,0.9)' },
    }),
  },
  popupCard: {
    position: 'absolute',
    width: 310,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
    zIndex: 9999,
    elevation: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#2B1810',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '0 16px 42px rgba(43,24,16,0.22), 0 4px 14px rgba(43,24,16,0.08)',
      },
    }),
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217,119,74,0.15)',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  popupSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptsSection: {
    marginBottom: 14,
  },
  promptsLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  promptIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  promptText: {
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  fullChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
    marginTop: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#2B1810',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(43,24,16,0.25)',
      },
    }),
  },
  fullChatText: {
    color: '#FFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  footerHint: {
    fontSize: 10.5,
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.75,
  },
});
