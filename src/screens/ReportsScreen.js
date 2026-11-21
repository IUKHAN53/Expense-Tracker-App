import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../db';
import { applyFilters, buildReport, change, UNCATEGORISED } from '../db/report';
import { shareEntriesCsv } from '../backup';
import { errorMessage } from '../support/errors';
import { grouped } from '../support/currency';
import { on, EVENTS } from '../support/events';
import { colors, fonts, formatDate, monthLabel, monthLabelShort, type } from '../theme';
import { useCurrency } from '../hooks/useMoney';
import { ActionBar, Caps, EntryRow, openEntry, PrimaryAction } from '../components/kit';
import { EmptyState, Loading } from '../components/ui';
import { useToast } from '../components/Toast';

const DAY = 86400000;
const PERIODS = [
  { id: 'month', label: 'This month' },
  { id: 'last', label: 'Last month' },
  { id: 'q', label: '3 months' },
  { id: 'year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
];
const TABS = [
  { id: 'category', label: 'Category' },
  { id: 'list', label: 'List' },
  { id: 'month', label: 'Month' },
  { id: 'items', label: 'Items' },
];
const SHOW = 60; // entries listed under the breakdown

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * [from, to) for a period, plus the period before it for comparison. A period
 * still in progress is compared to date (same number of days), not to a full one.
 */
function rangeFor(period, custom) {
  const r = baseRange(period, custom);
  const now = new Date();
  if (r.cur[1] > now && now > r.cur[0]) {
    r.prev = [r.prev[0], new Date(r.prev[0].getTime() + (now - r.cur[0]))];
    r.toDate = true;
  }
  return r;
}

function baseRange(period, custom) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const months = (a, b) => [new Date(y, m + a, 1), new Date(y, m + b, 1)];
  switch (period) {
    case 'last': return { cur: months(-1, 0), prev: months(-2, -1) };
    case 'q': return { cur: months(-2, 1), prev: months(-5, -2) };
    case 'year': return { cur: [new Date(y, 0, 1), new Date(y + 1, 0, 1)], prev: [new Date(y - 1, 0, 1), new Date(y, 0, 1)] };
    case 'custom': {
      const from = startOfDay(custom.from);
      const to = new Date(startOfDay(custom.to).getTime() + DAY);
      return { cur: [from, to], prev: [new Date(from - (to - from)), from] };
    }
    default: return { cur: months(0, 1), prev: months(-1, 0) };
  }
}

function periodTitle(period, [from, to]) {
  if (period === 'month' || period === 'last') return monthLabel(`${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`);
  if (period === 'year') return String(from.getFullYear());
  return `${formatDate(from.toISOString())} – ${formatDate(new Date(to - DAY).toISOString())}`;
}

/**
 * Reports: any period, filtered by lists, categories and text, broken down by
 * category, list, month and top items, compared with the period before.
 */
export default function ReportsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const ccy = useCurrency();
  const toast = useToast();

  const [period, setPeriod] = useState('month');
  const [custom, setCustom] = useState(() => ({ from: new Date(Date.now() - 29 * DAY), to: new Date() }));
  const [picking, setPicking] = useState(null); // 'from' | 'to'
  const [listIds, setListIds] = useState(route.params?.listIds || []);
  const [categoryIds, setCategoryIds] = useState([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('category');
  const [sheet, setSheet] = useState(null); // 'lists' | 'categories'

  const [lists, setLists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState(null);
  const [prevRows, setPrevRows] = useState([]);
  const [error, setError] = useState('');

  const range = useMemo(() => rangeFor(period, custom), [period, custom]);

  const load = useCallback(async () => {
    try {
      setError('');
      const db = await getDb();
      const [l, c, cur, prev] = await Promise.all([
        db.lists.all(), db.categories.all(),
        db.entries.inRange(...range.cur), db.entries.inRange(...range.prev),
      ]);
      setLists(l.data);
      setCategories(c.data);
      setRows(cur);
      setPrevRows(prev);
    } catch (e) {
      setError(errorMessage(e));
      setRows([]);
    }
  }, [range]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => on(EVENTS.ENTRIES_CHANGED, load), [load]);

  const filters = { listIds, categoryIds, search };
  const filtered = useMemo(() => applyFilters(rows || [], filters), [rows, listIds, categoryIds, search]); // eslint-disable-line react-hooks/exhaustive-deps
  const report = useMemo(() => buildReport(filtered, ...range.cur, new Date()), [filtered, range]);
  const prevTotal = useMemo(() => applyFilters(prevRows, filters).reduce((s, e) => s + e.amount, 0), [prevRows, listIds, categoryIds, search]); // eslint-disable-line react-hooks/exhaustive-deps
  const delta = change(report.total, prevTotal);

  const toggle = (setter) => (id) => setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleList = toggle(setListIds);
  const toggleCategory = toggle(setCategoryIds);
  const filterCount = listIds.length + categoryIds.length + (search.trim() ? 1 : 0);
  const clearFilters = () => { setListIds([]); setCategoryIds([]); setSearch(''); };

  const exportCsv = async () => {
    if (!filtered.length) return toast.info('Nothing to export for these filters.');
    try {
      await shareEntriesCsv(filtered, lists, categories);
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t export the report.'));
    }
  };

  if (!rows) return <Loading />;

  const breakdown = tab === 'category' ? report.byCategory
    : tab === 'list' ? report.byList
      : tab === 'items' ? report.topItems
        : report.byMonth.map((mo) => ({ key: mo.key, name: monthLabelShort(mo.key), total: mo.total, share: report.total ? mo.total / report.total : 0 }));
  const top = Math.max(...breakdown.map((b) => b.total), 1);
  // Tapping a category or list row narrows the report to it.
  const onRow = tab === 'category' ? (b) => toggleCategory(b.key) : tab === 'list' ? (b) => toggleList(b.key) : null;
  const isOn = (b) => (tab === 'category' ? categoryIds.includes(b.key) : tab === 'list' ? listIds.includes(b.key) : false);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        {/* Period */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {PERIODS.map((p) => (
            <Chip key={p.id} label={p.label} on={period === p.id} onPress={() => setPeriod(p.id)} />
          ))}
        </ScrollView>
        {period === 'custom' ? (
          <View style={styles.customRow}>
            <Chip icon="calendar-outline" label={formatDate(custom.from.toISOString())} onPress={() => setPicking('from')} />
            <Text style={type.bodySoft}>to</Text>
            <Chip icon="calendar-outline" label={formatDate(custom.to.toISOString())} onPress={() => setPicking('to')} />
          </View>
        ) : null}

        {/* Filters */}
        <View style={styles.filterRow}>
          <Chip icon="person-outline" label={listIds.length ? `Lists · ${listIds.length}` : 'All lists'} on={!!listIds.length} onPress={() => setSheet('lists')} />
          <Chip icon="pricetag-outline" label={categoryIds.length ? `Categories · ${categoryIds.length}` : 'All categories'} on={!!categoryIds.length} onPress={() => setSheet('categories')} />
          {filterCount ? (
            <Pressable onPress={clearFilters} hitSlop={8} accessibilityRole="button">
              <Text style={styles.clear}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.inkSoft} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search items and notes"
            placeholderTextColor={colors.inkSoft}
            cursorColor={colors.ink}
            style={styles.search}
            returnKeyType="search"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {/* Summary */}
        <View style={styles.hero}>
          <Caps>{periodTitle(period, range.cur)}</Caps>
          <View style={styles.heroRow}>
            <Text style={styles.symbol}>{ccy.symbol}</Text>
            <Text style={[type.hero, { fontSize: 52, lineHeight: 56 }]} numberOfLines={1} adjustsFontSizeToFit>{grouped(report.total)}</Text>
          </View>
          {delta != null ? (
            <Text style={[styles.delta, { color: delta > 0 ? colors.bad : colors.good }]}>
              {delta > 0 ? '↑' : '↓'} {Math.abs(Math.round(delta * 100))}% vs {range.toDate ? 'the same days last period' : 'the previous period'} ({ccy.symbol} {grouped(prevTotal)})
            </Text>
          ) : null}
          <View style={styles.stats}>
            <Stat label="Expenses" value={String(report.count)} />
            <Stat label="Per day" value={`${ccy.symbol} ${grouped(report.perDay)}`} />
            <Stat label="Largest" value={report.largest ? `${ccy.symbol} ${grouped(report.largest.amount)}` : '–'} />
          </View>
        </View>

        {error ? <EmptyState icon="alert-circle-outline" title="Couldn’t load" subtitle={error} /> : null}

        {report.count ? (
          <>
            {/* Breakdown */}
            <View style={styles.tabs}>
              {TABS.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setTab(t.id)}
                  style={[styles.tab, tab === t.id && styles.tabOn]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === t.id }}
                >
                  <Text style={[styles.tabText, tab === t.id && { color: colors.white }]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.section}>
              {breakdown.map((b) => (
                <Pressable
                  key={String(b.key)}
                  onPress={onRow ? () => onRow(b) : undefined}
                  disabled={!onRow}
                  style={({ pressed }) => [styles.barRow, pressed && { opacity: 0.6 }]}
                  accessibilityRole={onRow ? 'button' : undefined}
                  accessibilityLabel={`${b.name}, ${ccy.symbol} ${grouped(b.total)}`}
                >
                  <View style={styles.barHead}>
                    <Text style={styles.barName} numberOfLines={1}>
                      {isOn(b) ? '✓ ' : ''}{b.name}{b.count > 1 && tab === 'items' ? ` × ${b.count}` : ''}
                    </Text>
                    <Text style={styles.barAmt}>{grouped(b.total)}</Text>
                    <Text style={styles.barPct}>{Math.round(b.share * 100)}%</Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${(b.total / top) * 100}%` }, isOn(b) && { backgroundColor: colors.primary }]} />
                  </View>
                </Pressable>
              ))}
              {onRow ? <Text style={[type.bodySoft, { paddingTop: 4 }]}>Tap a row to filter by it.</Text> : null}
            </View>

            {/* Entries */}
            <View style={{ paddingHorizontal: 20 }}>
              <Caps style={{ paddingBottom: 4 }}>
                {filtered.length > SHOW ? `Latest ${SHOW} of ${filtered.length}` : `${filtered.length} expense${filtered.length === 1 ? '' : 's'}`}
              </Caps>
              {filtered.slice(0, SHOW).map((e, i, arr) => (
                <EntryRow key={e.id} entry={e} last={i === arr.length - 1} onPress={() => openEntry(navigation, e)} />
              ))}
            </View>
          </>
        ) : (
          <EmptyState icon="bar-chart-outline" title="Nothing here" subtitle={filterCount ? 'No expenses match these filters.' : 'No expenses in this period.'} />
        )}
      </ScrollView>

      <ActionBar>
        <PrimaryAction icon="download-outline" title="Export CSV" onPress={exportCsv} disabled={!report.count} />
      </ActionBar>

      <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSheet(null)} />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <Text style={[type.title, { fontSize: 22, paddingBottom: 8 }]}>{sheet === 'lists' ? 'Lists' : 'Categories'}</Text>
          <ScrollView style={{ maxHeight: 400 }}>
            {(sheet === 'lists' ? lists : [...categories, { id: UNCATEGORISED, name: 'Uncategorised' }]).map((o) => {
              const sel = (sheet === 'lists' ? listIds : categoryIds).includes(o.id);
              return (
                <Pressable
                  key={String(o.id)}
                  onPress={() => (sheet === 'lists' ? toggleList : toggleCategory)(o.id)}
                  style={styles.option}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: sel }}
                >
                  <Text style={styles.optionText}>{o.name}</Text>
                  <Ionicons name={sel ? 'checkbox' : 'square-outline'} size={22} color={colors.ink} />
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={styles.done} onPress={() => setSheet(null)} accessibilityRole="button">
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </Modal>

      {picking ? (
        <DateTimePicker
          value={custom[picking]}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, picked) => {
            const which = picking;
            setPicking(null);
            if (event.type !== 'set' || !picked) return;
            setCustom((c) => {
              const next = { ...c, [which]: picked };
              // Moving one end past the other collapses the range onto the picked day.
              return next.from > next.to ? { from: picked, to: picked } : next;
            });
          }}
        />
      ) : null}
    </View>
  );
}

function Chip({ label, on, onPress, icon }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
    >
      {icon ? <Ionicons name={icon} size={14} color={on ? colors.white : colors.ink} /> : null}
      <Text style={[styles.chipText, on && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

function Stat({ label, value }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  chips: { paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 10 },
  filterRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingTop: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14,
    borderRadius: 19, backgroundColor: colors.soft,
  },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  clear: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink, textDecorationLine: 'underline', paddingHorizontal: 4 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 10,
    height: 46, borderRadius: 12, paddingHorizontal: 14, backgroundColor: colors.soft,
  },
  search: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, padding: 0 },
  hero: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, gap: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  symbol: { fontFamily: fonts.sansMedium, fontSize: 20, color: colors.inkSoft },
  delta: { fontFamily: fonts.sansMedium, fontSize: 14 },
  stats: { flexDirection: 'row', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.rule, marginTop: 8 },
  statValue: { fontFamily: fonts.mono, fontSize: 16, color: colors.ink },
  statLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkSoft, paddingTop: 2 },
  tabs: { flexDirection: 'row', gap: 6, marginHorizontal: 20, padding: 4, borderRadius: 14, backgroundColor: colors.soft },
  tab: { flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.ink },
  tabText: { fontFamily: fonts.sansMedium, fontSize: 13.5, color: colors.ink },
  section: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 14 },
  barRow: { gap: 6 },
  barHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  barName: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  barAmt: { fontFamily: fonts.mono, fontSize: 14, color: colors.ink },
  barPct: { width: 40, textAlign: 'right', fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.soft, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 52, borderBottomWidth: 1, borderBottomColor: colors.rule,
  },
  optionText: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.ink },
  done: { height: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  doneText: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
});
