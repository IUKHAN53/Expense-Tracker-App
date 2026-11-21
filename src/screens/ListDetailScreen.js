import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getDb } from '../db';
import { errorMessage } from '../support/errors';
import { grouped } from '../support/currency';
import { on, EVENTS } from '../support/events';
import { colors, currentMonthKey, fonts, monthLabel, shiftMonth, type } from '../theme';
import { useCurrency } from '../hooks/useMoney';
import { ActionBar, Caps, dayGroup, EntryRow, IconButton, openEntry, PrimaryAction } from '../components/kit';
import { EmptyState, Loading } from '../components/ui';

export default function ListDetailScreen({ route, navigation }) {
  const { list } = route.params;
  const ccy = useCurrency();
  const [month, setMonth] = useState(route.params?.month || currentMonthKey());
  const isCurrent = month === currentMonthKey();
  const [entries, setEntries] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: list.name,
      headerRight: () => (
        <IconButton icon="bar-chart-outline" label={`${list.name} report`} onPress={() => navigation.navigate('Reports', { listIds: [list.id] })} />
      ),
    });
  }, [navigation, list.name, list.id]);

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await (await getDb()).entries.list({ spending_list_id: list.id, month });
      setEntries(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(errorMessage(e));
      setEntries([]);
    } finally {
      setRefreshing(false);
    }
  }, [list.id, month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => on(EVENTS.ENTRIES_CHANGED, load), [load]);

  const byCategory = useMemo(() => {
    const m = new Map();
    for (const e of entries || []) {
      const k = e.category?.name || 'Uncategorised';
      m.set(k, (m.get(k) || 0) + e.amount);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const days = useMemo(() => {
    const groups = [];
    for (const e of entries || []) {
      const g = dayGroup(e.purchased_at);
      if (groups.at(-1)?.label !== g) groups.push({ label: g, items: [] });
      groups.at(-1).items.push(e);
    }
    return groups;
  }, [entries]);

  if (!entries) return <Loading />;

  const budget = list.monthly_budget;
  const pct = budget ? Math.min(total / budget, 1) : 0;
  const now = new Date();
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const top = byCategory[0]?.[1] || 1;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.ink} />}
      >
        <View style={styles.hero}>
          <View style={styles.monthRow}>
            <Pressable onPress={() => setMonth((m) => shiftMonth(m, -1))} hitSlop={10} accessibilityLabel="Previous month" style={styles.monthBtn}>
              <Ionicons name="chevron-back" size={18} color={colors.ink} />
            </Pressable>
            <Caps>{list.name} · {isCurrent ? monthLabel(month).split(' ')[0] : monthLabel(month)}</Caps>
            <Pressable
              onPress={() => setMonth((m) => shiftMonth(m, 1))}
              disabled={isCurrent}
              hitSlop={10}
              accessibilityLabel="Next month"
              style={[styles.monthBtn, isCurrent && { opacity: 0.25 }]}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.ink} />
            </Pressable>
          </View>
          <View style={styles.heroRow}>
            <Text style={styles.symbol}>{ccy.symbol}</Text>
            <Text style={[type.hero, { fontSize: 52, lineHeight: 56 }]} numberOfLines={1} adjustsFontSizeToFit>
              {grouped(total)}
            </Text>
          </View>
          {budget ? (
            <>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct * 100}%` }, total > budget && { backgroundColor: colors.bad }]} />
              </View>
              <View style={styles.budgetRow}>
                <Text style={styles.small}>{Math.round((total / budget) * 100)}% of {ccy.symbol} {grouped(budget)} budget</Text>
                <Text style={[styles.small, total > budget && { color: colors.bad }]}>
                  {total > budget
                    ? `${ccy.symbol} ${grouped(total - budget)} over`
                    : `${ccy.symbol} ${grouped(budget - total)} left${isCurrent ? ` · ${daysLeft} days` : ''}`}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {error ? <EmptyState icon="alert-circle-outline" title="Couldn’t load" subtitle={error} /> : null}

        {byCategory.length ? (
          <View style={styles.section}>
            <Caps>By category</Caps>
            {byCategory.map(([name, amt]) => (
              <View key={name} style={styles.catRow}>
                <Text style={styles.catName} numberOfLines={1}>{name}</Text>
                <View style={styles.catTrack}>
                  <View style={[styles.catFill, { width: `${(amt / top) * 100}%` }]} />
                </View>
                <Text style={styles.catAmt}>{grouped(amt)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 20 }}>
          {days.length ? days.map((g) => (
            <View key={g.label} style={{ paddingBottom: 12 }}>
              <Caps style={{ paddingBottom: 4 }}>{g.label}</Caps>
              {g.items.map((e, i) => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  meta={e.category?.name || (e.fuel_liters ? `${e.fuel_liters} L` : 'Uncategorised')}
                  last={i === g.items.length - 1}
                  onPress={() => openEntry(navigation, e)}
                />
              ))}
            </View>
          )) : (
            <EmptyState icon="receipt-outline" title={isCurrent ? 'Nothing here this month' : `Nothing in ${monthLabel(month)}`} subtitle={`Expenses for ${list.name} will show up here.`} />
          )}
        </View>
      </ScrollView>

      <ActionBar>
        <PrimaryAction
          title={`Add to ${list.name}`}
          onPress={() => navigation.navigate(list.type === 'vehicle' ? 'Fuel' : 'AddEntry', list.type === 'vehicle' ? undefined : { listId: list.id })}
        />
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  symbol: { fontFamily: fonts.sansMedium, fontSize: 20, color: colors.inkSoft },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.soft, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.ink },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  small: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft },
  section: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catName: { width: 104, flexShrink: 0, fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  catTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.soft },
  catFill: { height: 10, borderRadius: 5, backgroundColor: colors.ink },
  catAmt: { width: 72, flexShrink: 0, textAlign: 'right', fontFamily: fonts.mono, fontSize: 14, color: colors.ink },
});
