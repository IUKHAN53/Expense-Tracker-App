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
import { categoryStyle, colors, fonts, personColor } from '../theme';
import { useMoneyShort } from '../hooks/useMoney';

/* ----------------------------------------------------------------------- */
/*  Primitives                                                             */
/* ----------------------------------------------------------------------- */

export function Loading({ label }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.accent} />
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Mono uppercase mini-label, used above fields and on stat cards. */
export function KLabel({ children, style }) {
  return <Text style={[styles.kLabel, style]}>{children}</Text>;
}

/** Italic Newsreader section heading. */
export function SectionHeader({ title, right }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right || null}
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style }) {
  const v = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const blocked = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
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
          {icon ? <Ionicons name={icon} size={17} color={v.fg} style={{ marginRight: 7 }} /> : null}
          <Text style={[styles.buttonText, { color: v.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const BUTTON_VARIANTS = {
  primary: { bg: colors.ink, fg: colors.bg, border: null },
  accent: { bg: colors.accent, fg: '#fff', border: null },
  outline: { bg: 'transparent', fg: colors.ink, border: colors.rule },
  danger: { bg: colors.alarm, fg: '#fff', border: null },
};

export function TextField({ label, hint, style, multiline, ...props }) {
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {label ? <KLabel style={{ marginBottom: 7 }}>{label}</KLabel> : null}
      <TextInput
        placeholderTextColor={colors.inkSoft}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 64, textAlignVertical: 'top' }]}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A read-only field that opens a picker when tapped. */
export function SelectField({ label, valueLabel, placeholder, onPress, swatch, style }) {
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {label ? <KLabel style={{ marginBottom: 7 }}>{label}</KLabel> : null}
      <Pressable style={[styles.input, styles.selectRow]} onPress={onPress}>
        {swatch ? <View style={[styles.swatchDot, { backgroundColor: swatch }]} /> : null}
        <Text style={[styles.selectText, !valueLabel && { color: colors.inkSoft }]} numberOfLines={1}>
          {valueLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={17} color={colors.inkSoft} />
      </Pressable>
    </View>
  );
}

export function Badge({ label, color = colors.inkSoft, fill }) {
  return (
    <View style={[styles.badge, { backgroundColor: fill || `${color}22` }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'leaf-outline', title, subtitle }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={colors.rule} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function MonthSwitcher({ label, onPrev, onNext }) {
  return (
    <View style={styles.monthRow}>
      <Pressable onPress={onPrev} hitSlop={12} style={styles.monthBtn}>
        <Ionicons name="chevron-back" size={16} color={colors.inkSoft} />
      </Pressable>
      <Text style={styles.monthLabel}>{label}</Text>
      <Pressable onPress={onNext} hitSlop={12} style={styles.monthBtn}>
        <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
      </Pressable>
    </View>
  );
}

/**
 * Bottom-sheet multi-select. `values` is the current array of selected
 * `option.value` ids; `onChange(next)` is called as the user toggles.
 * `helper` shows below the list (e.g. "Splits Rs 250 each").
 */
export function MultiPickerModal({ visible, title, options, values = [], onChange, onClose, helper }) {
  const toggle = (val) => {
    if (values.includes(val)) onChange(values.filter((v) => v !== val));
    else onChange([...values, val]);
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {options.map((opt) => {
              const selected = values.includes(opt.value);
              return (
                <Pressable
                  key={String(opt.value)}
                  style={styles.modalOption}
                  onPress={() => toggle(opt.value)}
                >
                  <View style={[styles.checkBox, selected && styles.checkBoxOn]}>
                    {selected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                  </View>
                  {opt.swatch ? <View style={[styles.swatchDot, { backgroundColor: opt.swatch }]} /> : null}
                  <Text style={styles.modalOptionText}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {helper ? <Text style={styles.modalHelper}>{helper}</Text> : null}
          <Button title={values.length > 1 ? `Split with ${values.length}` : 'Done'} onPress={onClose} style={{ marginTop: 8 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** A bottom-sheet single-choice picker. */
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
                {opt.swatch ? <View style={[styles.swatchDot, { backgroundColor: opt.swatch }]} /> : null}
                <Text style={styles.modalOptionText}>{opt.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Button title="Cancel" variant="outline" onPress={onClose} style={{ marginTop: 10 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ----------------------------------------------------------------------- */
/*  Kharcha display bits                                                   */
/* ----------------------------------------------------------------------- */

/** Round person/list avatar with an italic initial. Household = dashed. */
export function Avatar({ name, type, size = 32 }) {
  const isHousehold = type === 'household';
  const c = personColor(name);
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isHousehold ? 'transparent' : c.bg,
        borderWidth: isHousehold ? 1.5 : 0,
        borderColor: colors.inkSoft,
        borderStyle: 'dashed',
      }}
    >
      <Text
        style={{
          fontFamily: fonts.serifMediumItalic,
          fontSize: size * 0.48,
          color: isHousehold ? colors.inkSoft : c.ink,
        }}
      >
        {initial}
      </Text>
    </View>
  );
}

/** Rounded-square category chip with a two-letter code. */
export function CatChip({ name, size = 30 }) {
  const c = categoryStyle(name);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        backgroundColor: c.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: fonts.monoMedium, fontSize: size * 0.34, color: c.ink }}>
        {c.short}
      </Text>
    </View>
  );
}

/** A stat card — mono label, big serif value, optional sub-line. */
export function StatCard({ label, value, sub, accent, style }) {
  return (
    <View style={[styles.card, styles.statCard, style]}>
      <KLabel>{label}</KLabel>
      <Text style={[styles.statValue, accent && { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
      {sub != null ? <View style={{ marginTop: 6 }}>{typeof sub === 'string'
        ? <Text style={styles.statSub}>{sub}</Text> : sub}</View> : null}
    </View>
  );
}

/** A person/list row with a proportional spend bar. */
export function PersonBar({ name, type, amount, total, percent, onPress, active }) {
  const moneyShort = useMoneyShort();
  const pct = percent != null ? percent : (total > 0 ? (amount / total) * 100 : 0);
  const c = personColor(name);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.personRow, active && { backgroundColor: colors.soft }]}
    >
      <Avatar name={name} type={type} size={34} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.personName} numberOfLines={1}>{name}</Text>
        <View style={styles.barTrack}>
          <View
            style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: c.bg }]}
          />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.personAmount}>{moneyShort(amount)}</Text>
        <Text style={styles.personPct}>{pct.toFixed(0)}%</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingLabel: {
    marginTop: 14,
    color: colors.inkSoft,
    fontSize: 14,
    fontFamily: fonts.serifItalic,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  kLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.serifMediumItalic,
    fontSize: 19,
    color: colors.ink,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: { flexDirection: 'row', alignItems: 'center' },
  buttonText: { fontFamily: fonts.sansSemibold, fontSize: 14.5 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.sans,
    color: colors.ink,
  },
  hint: { fontSize: 12, color: colors.inkSoft, marginTop: 5, fontFamily: fonts.sans },
  selectRow: { flexDirection: 'row', alignItems: 'center' },
  selectText: { flex: 1, fontSize: 15, color: colors.ink, fontFamily: fonts.sans },
  swatchDot: { width: 14, height: 14, borderRadius: 7, marginRight: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontFamily: fonts.monoMedium, fontSize: 10, letterSpacing: 0.4 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 44, paddingHorizontal: 24 },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontFamily: fonts.serifMediumItalic,
    color: colors.ink,
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.inkSoft,
    textAlign: 'center',
    fontFamily: fonts.sans,
  },
  monthRow: { flexDirection: 'row', alignItems: 'center' },
  monthBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.rule,
    backgroundColor: colors.card,
  },
  monthLabel: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
    marginHorizontal: 10,
    minWidth: 122,
    textAlign: 'center',
  },
  modalBackdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  modalTitle: {
    fontFamily: fonts.serifMediumItalic,
    fontSize: 21,
    color: colors.ink,
    marginBottom: 10,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  modalOptionText: { fontSize: 15, color: colors.ink, fontFamily: fonts.sans, flex: 1 },
  modalHelper: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkSoft,
    paddingVertical: 10,
    textAlign: 'center',
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.inkSoft,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkBoxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  statCard: { padding: 17 },
  statValue: {
    fontFamily: fonts.serifMedium,
    fontSize: 34,
    color: colors.ink,
    marginTop: 5,
  },
  statSub: { fontSize: 12.5, color: colors.inkSoft, fontFamily: fonts.sans },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  personName: { fontSize: 14.5, fontFamily: fonts.sansMedium, color: colors.ink },
  barTrack: {
    marginTop: 7,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.rule,
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 3 },
  personAmount: {
    fontFamily: fonts.monoMedium,
    fontSize: 13.5,
    color: colors.ink,
  },
  personPct: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.inkSoft, marginTop: 1 },
});
