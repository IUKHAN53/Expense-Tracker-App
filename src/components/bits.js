import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, CatChip } from './ui';
import { categoryStyle, colors, fonts } from '../theme';
import { useMoney, useMoneyShort } from '../hooks/useMoney';

function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/** A single expense row — category chip, name + meta line, amount. */
export function ExpenseItem({ entry, onPress, showList = true }) {
  const money = useMoney();
  const catName = entry.category ? entry.category.name : null;
  const person = entry.spending_list;
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <CatChip name={catName} size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.name} numberOfLines={1}>{entry.item_name}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{shortDate(entry.purchased_at)}</Text>
          {showList && person ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Avatar name={person.name} type={person.type} size={15} />
              <Text style={styles.metaText}>{person.name}</Text>
            </>
          ) : null}
          {catName ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.metaText} numberOfLines={1}>{catName}</Text>
            </>
          ) : null}
          {entry.split_group_id ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.splitTag}>SPLIT</Text>
            </>
          ) : null}
        </View>
      </View>
      <Text style={styles.amount}>{money(entry.amount)}</Text>
    </Pressable>
  );
}

/** Stacked horizontal bar + two-column legend for a category split. */
export function CategoryBreakdown({ data, emptyHint }) {
  const moneyShort = useMoneyShort();
  const ordered = [...(data || [])]
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  if (!ordered.length) {
    return (
      <Text style={styles.breakdownEmpty}>{emptyHint || 'No spending yet.'}</Text>
    );
  }

  return (
    <View>
      <View style={styles.stack}>
        {ordered.map((d) => (
          <View
            key={d.name}
            style={{ flex: Math.max(d.amount, 0.0001), backgroundColor: categoryStyle(d.name).bg }}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {ordered.map((d) => (
          <View key={d.name} style={styles.legendItem}>
            <CatChip name={d.name} size={22} />
            <Text style={styles.legendLabel} numberOfLines={1}>{d.name}</Text>
            <Text style={styles.legendAmount}>{moneyShort(d.amount)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  name: { fontSize: 14, fontFamily: fonts.sansMedium, color: colors.ink },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 5, flexWrap: 'nowrap' },
  metaText: { fontSize: 11.5, color: colors.inkSoft, fontFamily: fonts.sans },
  dot: { fontSize: 11, color: colors.inkSoft },
  amount: {
    fontFamily: fonts.monoMedium,
    fontSize: 14,
    color: colors.ink,
  },
  splitTag: {
    fontFamily: fonts.monoMedium,
    fontSize: 9.5,
    color: colors.accent,
    letterSpacing: 1,
  },
  stack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: colors.rule,
    marginBottom: 12,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap' },
  legendItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 6,
    paddingRight: 8,
  },
  legendLabel: { flex: 1, fontSize: 12, color: colors.ink, fontFamily: fonts.sans },
  legendAmount: { fontFamily: fonts.mono, fontSize: 11, color: colors.inkSoft },
  breakdownEmpty: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkSoft,
    paddingVertical: 8,
  },
});
