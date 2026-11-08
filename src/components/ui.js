// Form + state primitives (Kharcha 2.0 styling). Screen layout pieces live in kit.js.
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

export function Loading({ label }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.ink} />
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

/** Soft filled panel. */
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Uppercase mini-label, used above fields. */
export function KLabel({ children, style }) {
  return <Text style={[styles.kLabel, style]}>{children}</Text>;
}

// primary = the one yellow action on a screen; dark = secondary solid.
const BUTTON_VARIANTS = {
  primary: { bg: colors.primary, fg: colors.ink, border: null },
  dark: { bg: colors.ink, fg: colors.white, border: null },
  outline: { bg: 'transparent', fg: colors.ink, border: colors.ink },
  danger: { bg: colors.bad, fg: colors.white, border: null },
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style }) {
  const v = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const blocked = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border, borderWidth: v.border ? 1.5 : 0 },
        blocked && { opacity: 0.45 },
        pressed && !blocked && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.buttonRow}>
          {icon ? <Ionicons name={icon} size={18} color={v.fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.buttonText, { color: v.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function TextField({ label, hint, style, multiline, ...props }) {
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {label ? <KLabel style={{ marginBottom: 8 }}>{label}</KLabel> : null}
      <TextInput
        placeholderTextColor={colors.inkSoft}
        selectionColor={colors.primary}
        cursorColor={colors.ink}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 80, paddingTop: 14, textAlignVertical: 'top' }]}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function EmptyState({ icon = 'leaf-outline', title, subtitle }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={36} color={colors.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingLabel: { marginTop: 14, color: colors.inkSoft, fontSize: 14, fontFamily: fonts.sans },
  card: { backgroundColor: colors.soft, borderRadius: 14, padding: 16 },
  kLabel: {
    fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 1,
    textTransform: 'uppercase', color: colors.inkSoft,
  },
  button: { borderRadius: 14, minHeight: 56, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  buttonRow: { flexDirection: 'row', alignItems: 'center' },
  buttonText: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3 },
  input: {
    backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.rule, borderRadius: 14,
    paddingHorizontal: 16, minHeight: 56, fontSize: 16, fontFamily: fonts.sans, color: colors.ink,
  },
  hint: { fontSize: 13, color: colors.inkSoft, marginTop: 6, fontFamily: fonts.sans },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontFamily: fonts.display, letterSpacing: -0.4, color: colors.ink },
  emptySubtitle: { marginTop: 4, fontSize: 14, color: colors.inkSoft, textAlign: 'center', fontFamily: fonts.sans },
});
