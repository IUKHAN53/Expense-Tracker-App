import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import api, { errorMessage } from '../api/client';
import { AppHeader } from '../components/Header';
import { Badge, Card, EmptyState, Loading } from '../components/ui';
import { colors, fonts, formatDate, money } from '../theme';

export default function FuelScreen({ navigation }) {
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

        {/* Big km/L hero */}
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

        {/* Stat grid */}
        <View style={styles.statGrid}>
          <StatTile
            label="This month spent"
            value={money(stats.month_spent || 0)}
            sub={`${(stats.month_liters || 0).toFixed(2)} L`}
          />
          <StatTile
            label="This month km"
            value={(stats.month_kms || 0).toLocaleString()}
            sub="distance"
          />
          <StatTile
            label="Last fill"
            value={stats.last_odometer ? stats.last_odometer.toLocaleString() : '—'}
            sub={stats.last_fill_date ? formatDate(stats.last_fill_date) : ''}
          />
          <StatTile
            label="Lifetime spent"
            value={money(stats.all_time_spent || 0)}
            sub={`${(stats.all_time_liters || 0).toFixed(0)} L total`}
          />
        </View>

        {/* km/L trend chart */}
        {records.length >= 3 ? (
          <KmplChart records={[...records].reverse().slice(-14)} />
        ) : null}

        {/* Records list */}
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

function FuelCard({ record, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.recordCard}>
        <View style={styles.recordTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
            <View style={styles.recordBadges}>
              <Badge label={record.fuel_type || 'E92'} color={colors.accent} />
              {record.is_full_tank ? (
                <Badge label="Full" color={colors.accent2} />
              ) : (
                <Badge label="Partial" color={colors.inkSoft} />
              )}
            </View>
          </View>
          <Text style={styles.recordAmount}>{money(record.amount)}</Text>
        </View>
        <View style={styles.recordGrid}>
          <Metric label="Liters" value={`${record.liters.toFixed(2)} L`} />
          <Metric label="Rate" value={record.rate != null ? `Rs ${record.rate.toFixed(2)}` : '—'} />
          <Metric
            label="Odometer"
            value={record.odometer != null ? `${record.odometer.toLocaleString()} km` : '—'}
          />
        </View>
        {record.km_per_liter != null || record.km_since_last != null ? (
          <View style={styles.econRow}>
            {record.km_since_last != null ? (
              <Text style={styles.econKm}>+{record.km_since_last.toLocaleString()} km</Text>
            ) : null}
            {record.km_per_liter != null ? (
              <Text style={styles.econKmpl}>{record.km_per_liter.toFixed(2)} km/L</Text>
            ) : null}
          </View>
        ) : null}
        {record.notes && record.notes !== 'Imported from CarExpenses CSV.' ? (
          <Text style={styles.recordNote} numberOfLines={2}>{record.notes}</Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

function Metric({ label, value }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
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
          <Circle
            key={i}
            cx={padX + i * stepX}
            cy={yFor(v)}
            r="2.8"
            fill={colors.accent}
          />
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
  heroLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.8,
    color: colors.inkSoft,
  },
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
  statTile: {
    width: '50%',
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
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
  recordTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordDate: { fontFamily: fonts.sansMedium, fontSize: 14.5, color: colors.ink },
  recordBadges: { flexDirection: 'row', gap: 6, marginTop: 5 },
  recordAmount: { fontFamily: fonts.monoMedium, fontSize: 16, color: colors.ink },
  recordGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    paddingTop: 10,
  },
  metricLabel: { fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 1.2, color: colors.inkSoft },
  metricValue: { fontFamily: fonts.sansMedium, fontSize: 13.5, color: colors.ink, marginTop: 3 },
  econRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  econKm: { fontFamily: fonts.mono, fontSize: 12, color: colors.inkSoft },
  econKmpl: { fontFamily: fonts.monoMedium, fontSize: 13, color: colors.accent },
  recordNote: { fontFamily: fonts.serifItalic, fontSize: 12.5, color: colors.inkSoft, marginTop: 8 },
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
