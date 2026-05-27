import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import api, { errorMessage } from '../api/client';
import { AppHeader } from '../components/Header';
import { Card, EmptyState, Loading } from '../components/ui';
import { colors, fonts, formatDate } from '../theme';
import { useMoney } from '../hooks/useMoney';

/** "2026.05.10" — matches the CarExpenses layout. */
function ymdDot(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

function nfmt(n) {
  return (n ?? 0).toLocaleString('en-US');
}

export default function FuelScreen({ navigation }) {
  const money = useMoney();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await api.get('/fuel');
      setData(res.data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Fuel" />
        <Loading label="Loading fuel records…" />
      </View>
    );
  }

  const stats = (data && data.stats) || {};
  const records = (data && data.records) || [];

  return (
    <View style={styles.screen}>
      <AppHeader title="Fuel" />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.accent}
          />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>AVERAGE · {(stats.avg_window || '').toUpperCase()}</Text>
          <View style={styles.heroValueRow}>
            <Text style={styles.heroValue}>
              {stats.avg_km_per_liter != null ? stats.avg_km_per_liter.toFixed(2) : '—'}
            </Text>
            <Text style={styles.heroUnit}>km/L</Text>
          </View>
          {stats.avg_km_per_liter_all_time != null ? (
            <Text style={styles.heroSub}>
              All-time {stats.avg_km_per_liter_all_time.toFixed(2)} km/L · {stats.total_records} fills
            </Text>
          ) : null}
        </View>

        <View style={styles.statGrid}>
          <StatTile
            label="This month spent"
            value={money(stats.month_spent || 0)}
            sub={`${(stats.month_liters || 0).toFixed(2)} L`}
          />
          <StatTile
            label="This month km"
            value={nfmt(stats.month_kms || 0)}
            sub="distance"
          />
          <StatTile
            label="Last fill"
            value={stats.last_odometer ? nfmt(stats.last_odometer) : '—'}
            sub={stats.last_fill_date ? formatDate(stats.last_fill_date) : ''}
          />
          <StatTile
            label="Lifetime spent"
            value={money(stats.all_time_spent || 0)}
            sub={`${(stats.all_time_liters || 0).toFixed(0)} L total`}
          />
        </View>

        {records.length >= 3 ? (
          <KmplChart records={[...records].reverse().slice(-14)} />
        ) : null}

        <View style={styles.recordsHead}>
          <Text style={styles.recordsTitle}>Refills</Text>
          <Text style={styles.recordsCount}>{records.length}</Text>
        </View>
        {records.length === 0 ? (
          <EmptyState
            icon="car-sport-outline"
            title="No fuel records yet"
            subtitle="Tap + to log your first refill."
          />
        ) : (
          records.map((r) => (
            <FuelCard
              key={r.id}
              record={r}
              onPress={() => navigation.navigate('FuelEntry', { entry: r })}
            />
          ))
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => navigation.navigate('FuelEntry', {})}>
        <Ionicons name="add" size={30} color={colors.white} />
      </Pressable>
    </View>
  );
}

function StatTile({ label, value, sub }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      {sub ? <Text style={styles.statSub} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}

/**
 * Two-column refill card, modelled on the CarExpenses layout:
 *   left  — date / E92 + Rs/L / Rs/km / km/L
 *   right — odometer (+km) / total Rs / litres / Full|Partial
 */
function FuelCard({ record, onPress }) {
  const dim = (v) => (v == null ? '—' : v);
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.recordCard}>
        <View style={styles.recordRow}>
          <View style={styles.fuelIcon}>
            <MaterialCommunityIcons name="gas-station" size={22} color={colors.white} />
          </View>

          {/* Left column */}
          <View style={styles.recordLeft}>
            <Text style={styles.recordDate}>{ymdDot(record.date)}</Text>
            <View style={styles.inlineRow}>
              <Text style={styles.fuelTypeText}>{record.fuel_type || 'E92'}</Text>
              <Text style={styles.recordMeta}>
                {' '}
                {record.rate != null ? `${record.rate.toFixed(2)} Rs/L` : ''}
              </Text>
            </View>
            <Text style={styles.recordMeta}>
              {record.rs_per_km != null ? `${record.rs_per_km.toFixed(2)} Rs/km` : '—'}
            </Text>
            <Text style={styles.recordKmpl}>
              {record.km_per_liter != null ? `${record.km_per_liter.toFixed(2)} km/L` : '—'}
            </Text>
          </View>

          {/* Right column */}
          <View style={styles.recordRight}>
            <Text style={styles.recordOdo}>
              {dim(record.odometer != null ? nfmt(record.odometer) : null)} km
              {record.km_since_last != null ? (
                <Text style={styles.recordOdoDelta}> (+{nfmt(record.km_since_last)})</Text>
              ) : null}
            </Text>
            <Text style={styles.recordAmount}>{money(record.amount)}</Text>
            <Text style={styles.recordLiters}>{record.liters.toFixed(2)} L</Text>
            <Text style={[styles.recordTopUp, !record.is_full_tank && styles.recordPartial]}>
              {record.is_full_tank ? 'FULL' : 'PARTIAL'}
            </Text>
          </View>
        </View>
        {record.notes && !record.notes.startsWith('Imported from CarExpenses') ? (
          <Text style={styles.recordNote} numberOfLines={2}>{record.notes}</Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

function KmplChart({ records }) {
  const series = records.filter((r) => r.km_per_liter != null && r.km_per_liter > 0);
  if (series.length < 2) return null;

  const W = 320;
  const H = 110;
  const padX = 14;
  const padY = 16;
  const values = series.map((s) => s.km_per_liter);
  const min = Math.min(...values) * 0.92;
  const max = Math.max(...values) * 1.08;
  const stepX = (W - padX * 2) / (values.length - 1);
  const yFor = (v) => H - padY - ((v - min) / Math.max(max - min, 0.0001)) * (H - padY * 2);
  const points = values.map((v, i) => `${padX + i * stepX},${yFor(v)}`).join(' ');
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  return (
    <Card style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>km/L · last {values.length} fills</Text>
        <Text style={styles.chartAvg}>avg {avg.toFixed(2)}</Text>
      </View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke={colors.rule} strokeWidth="1" />
        <Line
          x1={padX}
          y1={yFor(avg)}
          x2={W - padX}
          y2={yFor(avg)}
          stroke={colors.inkSoft}
          strokeWidth="0.75"
          strokeDasharray="3 4"
          opacity={0.5}
        />
        <Polyline
          points={points}
          fill="none"
          stroke={colors.accent}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {values.map((v, i) => (
          <Circle key={i} cx={padX + i * stepX} cy={yFor(v)} r="2.8" fill={colors.accent} />
        ))}
      </Svg>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 110 },
  error: { color: colors.alarm, fontSize: 13, marginBottom: 10, fontFamily: fonts.sans },
  hero: { alignItems: 'center', paddingVertical: 14 },
  heroLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.8, color: colors.inkSoft },
  heroValueRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4, gap: 6 },
  heroValue: {
    fontFamily: fonts.serifMedium,
    fontSize: 56,
    color: colors.ink,
    letterSpacing: -1.5,
    lineHeight: 56,
  },
  heroUnit: { fontFamily: fonts.serifItalic, fontSize: 18, color: colors.inkSoft, marginBottom: 8 },
  heroSub: { fontFamily: fonts.serifItalic, fontSize: 13, color: colors.inkSoft, marginTop: 4 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginTop: 6 },
  statTile: { width: '50%', paddingHorizontal: 5, paddingVertical: 5 },
  statLabel: { fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 1.3, color: colors.inkSoft },
  statValue: {
    fontFamily: fonts.serifMedium,
    fontSize: 22,
    color: colors.ink,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  statSub: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },

  chartCard: { padding: 14, marginTop: 14, marginBottom: 8 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chartTitle: { fontFamily: fonts.serifMediumItalic, fontSize: 15, color: colors.ink },
  chartAvg: { fontFamily: fonts.mono, fontSize: 11, color: colors.inkSoft },

  recordsHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  recordsTitle: { fontFamily: fonts.serifMediumItalic, fontSize: 19, color: colors.ink },
  recordsCount: { fontFamily: fonts.mono, fontSize: 12, color: colors.inkSoft },

  recordCard: { padding: 14, marginBottom: 10 },
  recordRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fuelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  recordLeft: { flex: 1 },
  recordRight: { alignItems: 'flex-end' },
  recordDate: { fontFamily: fonts.sansMedium, fontSize: 17, color: colors.ink, letterSpacing: 0 },
  inlineRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 3 },
  fuelTypeText: { fontFamily: fonts.monoMedium, fontSize: 12, color: colors.accent, letterSpacing: 0.5 },
  recordMeta: { fontFamily: fonts.mono, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  recordKmpl: { fontFamily: fonts.monoMedium, fontSize: 13, color: colors.ink, marginTop: 3 },
  recordOdo: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  recordOdoDelta: { fontFamily: fonts.mono, fontSize: 12, color: colors.inkSoft },
  recordAmount: { fontFamily: fonts.monoMedium, fontSize: 14.5, color: colors.ink, marginTop: 3 },
  recordLiters: { fontFamily: fonts.mono, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  recordTopUp: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.accent2, letterSpacing: 1, marginTop: 3 },
  recordPartial: { color: colors.inkSoft },
  recordNote: {
    fontFamily: fonts.serifItalic,
    fontSize: 12.5,
    color: colors.inkSoft,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
