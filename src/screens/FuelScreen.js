import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDb } from '../db';
import { errorMessage } from '../support/errors';
import { grouped } from '../support/currency';
import { on, EVENTS } from '../support/events';
import { colors, currentMonthKey, fonts, shiftMonth, type } from '../theme';
import { useCurrency } from '../hooks/useMoney';
import { ActionBar, Caps, PrimaryAction } from '../components/kit';
import { EmptyState, Loading } from '../components/ui';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthOf = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function FuelScreen({ navigation }) {
  const ccy = useCurrency();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      setData(await (await getDb()).fuel());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => on(EVENTS.ENTRIES_CHANGED, load), [load]);

  // Last 6 months of fuel spend, oldest first.
  const chart = useMemo(() => {
    if (!data) return [];
    const now = currentMonthKey();
    const keys = Array.from({ length: 6 }, (_, i) => shiftMonth(now, i - 5));
    const sums = Object.fromEntries(keys.map((k) => [k, 0]));
    for (const r of data.records) {
      const k = monthOf(r.date);
      if (k in sums) sums[k] += r.amount;
    }
    return keys.map((k) => ({ key: k, label: MONTHS[Number(k.slice(5)) - 1], value: sums[k] }));
  }, [data]);

  const perKm = useMemo(() => {
    const v = (data?.records || []).map((r) => r.rs_per_km).filter((x) => x > 0).slice(0, 5);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  }, [data]);

  if (!data && !error) return <Loading />;

  const s = data?.stats;
  const trend = s?.avg_km_per_liter != null && s?.avg_km_per_liter_all_time != null
    ? Math.round((s.avg_km_per_liter - s.avg_km_per_liter_all_time) * 10) / 10 : 0;
  const max = Math.max(...chart.map((c) => c.value), 1);
  const thisMonth = chart.at(-1)?.value || 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.ink} />}
      >
        {error ? <EmptyState icon="alert-circle-outline" title="Couldn’t load" subtitle={error} /> : null}

        {data ? (
          <>
            <View style={styles.hero}>
              <Caps>Average · {s.avg_window}</Caps>
              <View style={styles.heroRow}>
                <Text style={type.hero}>{s.avg_km_per_liter ?? '—'}</Text>
                <Text style={styles.unit}>km/L</Text>
              </View>
              <Text style={type.bodySoft}>
                {perKm ? `${ccy.symbol} ${perKm.toFixed(1)} per km` : 'Add two refills with odometer readings to see km/L'}
                {trend ? (
                  <Text style={{ color: trend > 0 ? colors.good : colors.bad, fontFamily: fonts.sansMedium }}>
                    {`  ${trend > 0 ? '↑' : '↓'} ${Math.abs(trend)} km/L`}
                  </Text>
                ) : null}
                {trend ? ' vs your average' : ''}
              </Text>
            </View>

            <View style={styles.section}>
              <View style={styles.chart}>
                {chart.map((c, i) => (
                  <View
                    key={c.key}
                    style={[
                      styles.bar,
                      { height: Math.max((c.value / max) * 96, c.value ? 4 : 0) },
                      i === chart.length - 1 ? { backgroundColor: colors.ink } : null,
                    ]}
                  />
                ))}
              </View>
              <View style={styles.chartLabels}>
                {chart.map((c, i) => (
                  <Text key={c.key} style={[styles.chartLabel, i === chart.length - 1 && { color: colors.ink, fontFamily: fonts.sansMedium }]}>
                    {c.label}
                  </Text>
                ))}
              </View>
              <Text style={styles.small}>
                Fuel spend per month · this month so far <Text style={styles.mono}>{ccy.symbol} {grouped(thisMonth)}</Text>
              </Text>
            </View>

            <View style={{ paddingHorizontal: 20 }}>
              <Caps style={{ paddingBottom: 4 }}>Refills</Caps>
              {data.records.length ? data.records.map((r, i) => {
                const d = new Date(r.date);
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => navigation.navigate('FuelEntry', { entry: r })}
                    style={({ pressed }) => [styles.row, i < data.records.length - 1 && styles.rule, pressed && { opacity: 0.6 }]}
                  >
                    <View style={styles.date}>
                      <Text style={styles.day}>{d.getDate()}</Text>
                      <Caps style={{ fontSize: 11 }}>{MONTHS[d.getMonth()]}</Caps>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={type.label}>{r.liters} L · {r.fuel_type}</Text>
                      <Text style={styles.small} numberOfLines={1}>
                        {[r.odometer != null && `${grouped(r.odometer)} km`, r.km_per_liter && `${r.km_per_liter} km/L`]
                          .filter(Boolean).join(' · ') || (r.notes || 'No odometer reading')}
                      </Text>
                    </View>
                    <Text style={styles.amount}>{grouped(r.amount)}</Text>
                  </Pressable>
                );
              }) : (
                <EmptyState icon="car-outline" title="No refills yet" subtitle="Log one with the button below." />
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <ActionBar>
        <PrimaryAction title="Add refill" onPress={() => navigation.navigate('FuelEntry', {})} />
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 6 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  unit: { fontFamily: fonts.sansMedium, fontSize: 22, color: colors.inkSoft },
  section: { paddingHorizontal: 20, paddingBottom: 28, gap: 8 },
  chart: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 96,
    borderBottomWidth: 1.5, borderBottomColor: colors.ink,
  },
  bar: { flex: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: '#D9D9D9' },
  chartLabels: { flexDirection: 'row', gap: 10 },
  chartLabel: { flex: 1, textAlign: 'center', fontFamily: fonts.sans, fontSize: 12, color: colors.inkSoft },
  small: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft },
  mono: { fontFamily: fonts.mono, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.rule },
  date: { width: 44, flexShrink: 0, alignItems: 'center' },
  day: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  amount: { ...type.amount, width: 80, textAlign: 'right', flexShrink: 0 },
});
