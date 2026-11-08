import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../db';
import { errorMessage } from '../support/errors';
import { grouped } from '../support/currency';
import { on, EVENTS } from '../support/events';
import { colors, currentMonthKey, fonts, monthLabel, shiftMonth, type } from '../theme';
import { useCurrency } from '../hooks/useMoney';
import { Brand } from '../components/Logo';
import { ActionBar, Caps, EntryRow, IconButton, PrimaryAction, SquareAction } from '../components/kit';
import { EmptyState, Loading } from '../components/ui';
import { ShareSheet } from '../components/ShareSheet';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const ccy = useCurrency();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const month = currentMonthKey();
      const db = await getDb();
      const [summary, prev, recent] = await Promise.all([
        db.summary({ month }),
        db.summary({ month: shiftMonth(month, -1) }),
        db.entries.list({ month, limit: 8 }),
      ]);
      setData({ month, summary, prevTotal: prev.grand_total, prevMonth: prev.month, recent: recent.data });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => on(EVENTS.ENTRIES_CHANGED, load), [load]);

  const openEntry = (e) => {
    if (e.fuel_liters) {
      navigation.navigate('FuelEntry', {
        entry: {
          id: e.id, amount: e.amount, rate: e.fuel_rate, odometer: e.odometer,
          fuel_type: e.fuel_type, is_full_tank: e.is_full_tank, notes: e.notes, date: e.purchased_at,
        },
      });
    } else {
      navigation.navigate('AddEntry', { entry: e });
    }
  };

  if (!data && !error) return <Loading />;

  const total = data?.summary.grand_total ?? 0;
  const diff = data ? total - data.prevTotal : 0;
  const hasCar = data?.summary.lists.some((l) => l.type === 'vehicle');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Brand />
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setShareOpen(true)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.sharePill, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="share-outline" size={16} color={colors.ink} />
            <Text style={styles.shareText}>Share app</Text>
          </Pressable>
          <IconButton icon="options-outline" label="Settings" onPress={() => navigation.navigate('Settings')} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.ink} />}
      >
        {error ? <EmptyState icon="alert-circle-outline" title="Couldn’t load" subtitle={error} /> : null}

        {data ? (
          <>
            <View style={styles.hero}>
              <Caps>Spent in {monthLabel(data.month).split(' ')[0]}</Caps>
              <View style={styles.heroRow}>
                <Text style={styles.heroSymbol}>{ccy.symbol}</Text>
                <Text style={type.hero} numberOfLines={1} adjustsFontSizeToFit>{grouped(total)}</Text>
              </View>
              {data.prevTotal > 0 ? (
                <Text style={type.bodySoft}>
                  <Text style={{ color: diff <= 0 ? colors.good : colors.bad, fontFamily: fonts.sansMedium }}>
                    {diff <= 0 ? '↓' : '↑'} {ccy.symbol} {grouped(Math.abs(diff))}
                  </Text>
                  {diff <= 0 ? ' less' : ' more'} than {monthLabel(data.prevMonth).split(' ')[0]}
                </Text>
              ) : null}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Caps>Lists</Caps>
                <Pressable onPress={() => navigation.navigate('ManageLists')} hitSlop={8}>
                  <Text style={styles.link}>Manage</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
                {/* Biggest spend first, so this month's active lists are on screen. */}
                {[...data.summary.lists].sort((a, b) => b.total - a.total).map((l) => (
                  <Pressable
                    key={l.id}
                    onPress={() => navigation.navigate('ListDetail', { list: l })}
                    style={({ pressed }) => [styles.listCol, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={type.label} numberOfLines={1}>{l.name}</Text>
                    <Text style={styles.listAmount}>{grouped(l.total)}</Text>
                    {l.monthly_budget ? (
                      <Text style={[styles.listSub, l.budget_remaining < 0 && { color: colors.bad }]}>
                        {l.budget_remaining < 0 ? 'Over budget' : `${grouped(l.budget_remaining)} left`}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={[styles.section, { paddingHorizontal: 20 }]}>
              <Caps style={{ paddingBottom: 4 }}>Recent</Caps>
              {data.recent.length ? (
                data.recent.map((e, i) => (
                  <EntryRow key={e.id} entry={e} last={i === data.recent.length - 1} onPress={() => openEntry(e)} />
                ))
              ) : (
                <EmptyState icon="receipt-outline" title="Nothing yet this month" subtitle="Add your first expense below." />
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <ActionBar>
        <PrimaryAction title="Add expense" onPress={() => navigation.navigate('AddEntry', {})} />
        {hasCar ? <SquareAction icon="car-outline" label="Fuel" onPress={() => navigation.navigate('Fuel')} /> : null}
      </ActionBar>

      <ShareSheet visible={shareOpen} onClose={() => setShareOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sharePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14,
    borderRadius: 18, borderWidth: 1.5, borderColor: colors.ink,
  },
  shareText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  hero: { paddingHorizontal: 20, paddingTop: 36, paddingBottom: 28, gap: 6 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  heroSymbol: { fontFamily: fonts.sansMedium, fontSize: 22, color: colors.inkSoft },
  section: { paddingBottom: 28 },
  sectionHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    paddingHorizontal: 20, paddingBottom: 14,
  },
  link: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  listCol: { width: 112, paddingTop: 12, borderTopWidth: 3, borderTopColor: colors.ink, gap: 6 },
  listAmount: { fontFamily: fonts.monoMedium, fontSize: 16, letterSpacing: -0.3, color: colors.ink },
  listSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkSoft },
});
