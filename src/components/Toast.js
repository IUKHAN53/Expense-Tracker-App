import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

/**
 * App-wide toast notifications. Mounted once near the root (see App.js);
 * any screen calls `const toast = useToast()` then `toast.success('Saved')`,
 * `toast.error('Could not save')` or `toast.info('…')`.
 *
 * A single toast shows at a time — a new one replaces whatever is on screen.
 * It floats above the bottom tab bar, auto-dismisses, and can be tapped away.
 */

const ToastContext = createContext({
  show: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

const VARIANTS = {
  success: { icon: 'checkmark-circle', tint: '#9bc06a' },
  error: { icon: 'alert-circle', tint: '#e89a86' },
  info: { icon: 'information-circle', tint: '#e3a86b' },
};

const DEFAULT_DURATION = 3000;

export function ToastProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null); // { message, type }
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const hideTimer = useRef(null);

  const hide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 20, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [opacity, translateY]);

  const show = useCallback(
    (message, type = 'info', duration = DEFAULT_DURATION) => {
      if (!message) return;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast({ message: String(message), type });
      translateY.setValue(20);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      hideTimer.current = setTimeout(hide, duration);
    },
    [opacity, translateY, hide],
  );

  const api = useRef({
    show,
    success: (m, d) => show(m, 'success', d),
    error: (m, d) => show(m, 'error', d),
    info: (m, d) => show(m, 'info', d),
  });
  // Keep the stable api object pointing at the latest closures.
  api.current.show = show;
  api.current.success = (m, d) => show(m, 'success', d);
  api.current.error = (m, d) => show(m, 'error', d);
  api.current.info = (m, d) => show(m, 'info', d);

  useEffect(() => () => hideTimer.current && clearTimeout(hideTimer.current), []);

  const variant = toast ? VARIANTS[toast.type] || VARIANTS.info : null;

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      {toast ? (
        <View
          pointerEvents="box-none"
          style={[styles.overlay, { paddingBottom: insets.bottom + 70 }]}
        >
          <Animated.View style={{ opacity, transform: [{ translateY }], width: '100%' }}>
            <Pressable onPress={hide} style={styles.toast}>
              <Ionicons name={variant.icon} size={20} color={variant.tint} />
              <Text style={styles.text} numberOfLines={3}>
                {toast.message}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  text: {
    flex: 1,
    color: colors.bg,
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 19,
  },
});
