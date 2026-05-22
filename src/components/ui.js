import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export function Loading({ label }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style }) {
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';
  const bg = isOutline ? 'transparent' : isDanger ? colors.danger : colors.primary;
  const fg = isOutline ? colors.primary : colors.white;
  const blocked = loading || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: blocked ? 0.5 : pressed ? 0.85 : 1 },
        isOutline && styles.buttonOutline,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.buttonRow}>
          {icon ? <Ionicons name={icon} size={18} color={fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function TextField({ label, hint, style, ...props }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A read-only field that opens a picker when tapped. */
export function SelectField({ label, valueLabel, placeholder, onPress, color, style }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable style={[styles.input, styles.selectRow]} onPress={onPress}>
        {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
        <Text style={[styles.selectText, !valueLabel && { color: colors.muted }]} numberOfLines={1}>
          {valueLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

export function Badge({ label, color = colors.muted }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, subtitle }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={52} color={colors.border} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function MonthSwitcher({ label, onPrev, onNext }) {
  return (
    <View style={styles.monthRow}>
      <Pressable onPress={onPrev} hitSlop={12} style={styles.monthBtn}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
      </Pressable>
      <Text style={styles.monthLabel}>{label}</Text>
      <Pressable onPress={onNext} hitSlop={12} style={styles.monthBtn}>
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </Pressable>
    </View>
  );
}

/** A bottom-sheet style single-choice picker. */
export function PickerModal({ visible, title, options, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {options.map((opt) => (
              <Pressable
                key={String(opt.value)}
                style={styles.modalOption}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
              >
                {opt.color ? <View style={[styles.dot, { backgroundColor: opt.color }]} /> : null}
                {opt.icon ? (
                  <Ionicons name={opt.icon} size={18} color={colors.muted} style={{ marginRight: 10 }} />
                ) : null}
                <Text style={styles.modalOptionText}>{opt.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Button title="Cancel" variant="outline" onPress={onClose} style={{ marginTop: 8 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingLabel: { marginTop: 12, color: colors.muted, fontSize: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutline: { borderWidth: 1.5, borderColor: colors.primary },
  buttonRow: { flexDirection: 'row', alignItems: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  hint: { fontSize: 12, color: colors.muted, marginTop: 4 },
  selectRow: { flexDirection: 'row', alignItems: 'center' },
  selectText: { flex: 1, fontSize: 15, color: colors.text },
  dot: { width: 14, height: 14, borderRadius: 7, marginRight: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '700', color: colors.text },
  emptySubtitle: { marginTop: 4, fontSize: 13, color: colors.muted, textAlign: 'center' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  monthBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 14,
    minWidth: 130,
    textAlign: 'center',
  },
  modalBackdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 28,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionText: { fontSize: 15, color: colors.text },
});
