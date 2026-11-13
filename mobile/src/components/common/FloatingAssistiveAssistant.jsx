import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const BUTTON_SIZE = 56;
const SNAP_MARGIN = 16;
const IDLE_DELAY = 3000;
const IDLE_OPACITY = 0.70;
const ACTIVE_OPACITY = 1.0;

export default function FloatingAssistiveAssistant({ onPress }) {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Compute initial starting coordinates (docked on right edge, comfortable thumb reach)
  const initialX = windowWidth - BUTTON_SIZE - SNAP_MARGIN;
  const initialY = Math.max(
    insets.top + SNAP_MARGIN,
    windowHeight - Math.max(64, insets.bottom + 58) - BUTTON_SIZE - 32
  );

  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const currentPosition = useRef({ x: initialX, y: initialY });
  const opacityAnim = useRef(new Animated.Value(ACTIVE_OPACITY)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const idleTimer = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Keep track of latest current coordinates
  useEffect(() => {
    const listenerId = pan.addListener((value) => {
      currentPosition.current = value;
    });
    return () => {
      pan.removeListener(listenerId);
    };
  }, [pan]);

  // Gentle ambient pulse for AI sparkles
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1800,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1800,
          useNativeDriver: false,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  // Idle dimming logic (like iOS AssistiveTouch)
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
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      Animated.timing(opacityAnim, {
        toValue: IDLE_OPACITY,
        duration: 350,
        useNativeDriver: false,
      }).start();
    }, IDLE_DELAY);
  }, [opacityAnim]);

  useEffect(() => {
    scheduleDim();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [scheduleDim]);

  // Edge snap physics
  const snapToEdge = useCallback((currX, currY) => {
    const midpoint = (windowWidth - BUTTON_SIZE) / 2;
    const targetX = currX < midpoint ? SNAP_MARGIN : windowWidth - BUTTON_SIZE - SNAP_MARGIN;

    const minY = Math.max(SNAP_MARGIN, insets.top + 8);
    const maxY = windowHeight - Math.max(64, insets.bottom + 58) - BUTTON_SIZE - SNAP_MARGIN;
    const targetY = Math.min(Math.max(currY, minY), maxY);

    Animated.spring(pan, {
      toValue: { x: targetX, y: targetY },
      tension: 40,
      friction: 7,
      useNativeDriver: false,
    }).start(() => {
      scheduleDim();
    });
  }, [windowWidth, windowHeight, insets.top, insets.bottom, pan, scheduleDim]);

  // Handle window resize or screen orientation change
  useEffect(() => {
    if (currentPosition.current.x > windowWidth - BUTTON_SIZE - SNAP_MARGIN) {
      snapToEdge(windowWidth - BUTTON_SIZE - SNAP_MARGIN, currentPosition.current.y);
    }
  }, [windowWidth, windowHeight, snapToEdge]);

  const handlePress = useCallback(() => {
    wakeUp();
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.90, duration: 80, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1.0, tension: 80, friction: 6, useNativeDriver: false }),
    ]).start();

    if (onPress) {
      onPress();
    } else {
      navigation.navigate('Assistant');
    }
    scheduleDim();
  }, [navigation, onPress, scaleAnim, scheduleDim, wakeUp]);

  // PanResponder for drag and snap
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3;
      },
      onPanResponderGrant: () => {
        wakeUp();
        setIsDragging(true);
        Animated.spring(scaleAnim, {
          toValue: 1.08,
          tension: 100,
          friction: 8,
          useNativeDriver: false,
        }).start();

        pan.setOffset({
          x: currentPosition.current.x,
          y: currentPosition.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        setIsDragging(false);
        Animated.spring(scaleAnim, {
          toValue: 1.0,
          tension: 100,
          friction: 8,
          useNativeDriver: false,
        }).start();

        const distance = Math.hypot(gesture.dx, gesture.dy);
        if (distance < 7) {
          // Treated as tap
          handlePress();
        } else {
          // Dragged -> snap to nearest edge
          snapToEdge(currentPosition.current.x, currentPosition.current.y);
        }
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        setIsDragging(false);
        Animated.spring(scaleAnim, {
          toValue: 1.0,
          useNativeDriver: false,
        }).start();
        snapToEdge(currentPosition.current.x, currentPosition.current.y);
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View
        {...panResponder.panHandlers}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Cafe AI Assistant Assistive Touch"
        accessibilityHint="Tap to open the AI cafe assistant, or drag to reposition anywhere on screen"
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
            },
          }),
        ]}
      >
        {/* Outer AssistiveTouch Ring */}
        <View
          style={[
            styles.outerRing,
            isDark ? styles.outerRingDark : styles.outerRingLight,
          ]}
        >
          {/* Middle Concentric Translucent Ring */}
          <View style={styles.middleRing}>
            {/* Inner Core Icon Badge with gentle pulse */}
            <Animated.View
              style={[
                styles.innerCore,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Ionicons name="sparkles" size={19} color="#F4EDE4" />
            </Animated.View>
          </View>

          {/* AI Online Status Dot */}
          <View style={styles.statusDot} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    ...Platform.select({
      ios: {
        shadowColor: '#1A0C06',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.40,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 8px 24px rgba(43, 24, 16, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  outerRing: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  outerRingLight: {
    backgroundColor: 'rgba(43, 24, 16, 0.92)',
    borderColor: 'rgba(217, 119, 74, 0.45)',
  },
  outerRingDark: {
    backgroundColor: 'rgba(28, 19, 15, 0.94)',
    borderColor: 'rgba(217, 119, 74, 0.55)',
  },
  middleRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCore: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(217, 119, 74, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    borderWidth: 1.5,
    borderColor: '#2B1810',
  },
});
