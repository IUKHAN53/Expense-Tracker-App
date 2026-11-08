// Building blocks from the Kharcha 2.0 designs (Paper file), shared by the
// rebuilt screens: caps labels, icon buttons, entry rows, the bottom action bar.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoryStyle, colors, fonts, type } from '../theme';
import { useMoney } from '../hooks/useMoney';

export function Caps({ children, style }) {
  return <Text style={[type.caps, style]}>{children}</Text>;
}

/** 36dp round soft button holding one icon. */
export function IconButton({ icon, onPress, label, size = 36, dark }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconBtn,
        { width: size, height: size, borderRadius: size / 2 },
        dark && { backgroundColor: colors.ink },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={icon} size={18} color={dark ? colors.white : colors.ink} />
    </Pressable>
  );
}

/** "Today", "Yesterday" or "6 Nov". */
export function dayLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** One expense: category code chip · name + meta · amount (fixed lane). */
export function EntryRow({ entry, onPress, meta, last }) {
  const money = useMoney();
  const cat = categoryStyle(entry.category?.name || (entry.fuel_liters ? 'fuel' : 'other'));
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowRule, pressed && { opacity: 0.6 }]}
    >
      <View style={styles.chip}>
        <Text style={styles.chipText}>{cat.short}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={type.label} numberOfLines={1}>{entry.item_name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta ?? `${entry.spending_list?.name ?? ''} · ${dayLabel(entry.purchased_at)}`}
          {entry.split_group_id ? ' · split' : ''}
        </Text>
      </View>
      <Text style={styles.amount} numberOfLines={1}>{money(entry.amount)}</Text>
    </Pressable>
  );
}

/** Fixed bottom bar; children are laid out in a row (yellow primary first). */
export function ActionBar({ children }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bar, { paddingBottom: 16 + insets.bottom }]}>{children}</View>;
}

/** The yellow primary action. */
export function PrimaryAction({ icon = 'add', title, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.primary, (pressed || disabled) && { opacity: disabled ? 0.45 : 0.85 }]}
    >
      {icon ? <Ionicons name={icon} size={20} color={colors.ink} /> : null}
      <Text style={styles.primaryText}>{title}</Text>
    </Pressable>
  );
}

/** 56dp square secondary action in the bar. */
export function SquareAction({ icon, onPress, label, dark }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.square, dark && { backgroundColor: colors.ink }, pressed && { opacity: 0.8 }]}
    >
      <Ionicons name={icon} size={22} color={dark ? colors.white : colors.ink} />
    </Pressable>
  );
}

/** Day-key for grouping rows: "Today", "Yesterday", "5 November". */
export function dayGroup(iso) {
  const label = dayLabel(iso);
  if (label === 'Today' || label === 'Yesterday') return label;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

const styles = StyleSheet.create({
  iconBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowRule: { borderBottomWidth: 1, borderBottomColor: colors.rule },
  chip: {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center',
  },
  chipText: { fontFamily: fonts.display, fontSize: 13, color: colors.ink },
  meta: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft },
  amount: { ...type.amount, width: 96, textAlign: 'right', flexShrink: 0 },
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 16,
    backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.rule,
  },
  primary: {
    flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryText: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, color: colors.ink },
  square: {
    width: 56, height: 56, borderRadius: 14, flexShrink: 0,
    backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center',
  },
});
