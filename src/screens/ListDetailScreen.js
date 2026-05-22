import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api, { errorMessage } from '../api/client';
import {
  Avatar,
  Card,
  EmptyState,
  Loading,
  MonthSwitcher,
  SectionHeader,
} from '../components/ui';
import { CategoryBreakdown, ExpenseItem } from '../components/bits';
import { colors, currentMonthKey, fonts, money, monthLabel, shiftMonth } from '../theme';

export default function ListDetailScreen({ route, navigation }) {
  const { list } = route.params;
  const [month, setMonth] = useState(route.params.month || currentMonthKey());
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [grand, setGrand] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({ title: list.name });
  }, [navigation, list.name]);

  const load = useCallback(
    async (targetMonth) => {
      try {
        setError('');
        const [e, s] = await Promise.all([
          api.get('/entries', { params: { spending_list_id: list.id, month: targetMonth } }),
          api.get('/summary', { params: { month: targetMonth } }),
        ]);
        setEntries(e.data.data || []);
        setTotal(e.data.total || 0);
        setGrand(s.data.grand_total || 0);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [list.id],
  );

  useFocusEffect(
    useCallback(() => {
      load(month);
    }, [month, load]),
  );

  const byCategory = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const name = e.category ? e.category.name : 'Uncategorised';
      map[name] = (map[name] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).map(([name, amount]) => ({ name, amount }));
  }, [entries]);

  if (loading) {
    return <Loading label="Loading entries…" />;
  }

  const share = grand > 0 ? Math.round((total / grand) * 100) : 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(month);
            }}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.monthRow}>
          <MonthSwitcher
            label={monthLabel(month)}
            onPrev={() => setMonth((m) => shiftMonth(m, -1))}
            onNext={() => setMonth((m) => shiftMonth(m, 1))}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Hero */}
        <Card style={styles.hero}>
          <View style={styles.heroTop}>
            <Avatar name={list.name} type={list.type} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName} numberOfLines={1}>{list.name}</Text>
              <Text style={styles.heroMeta}>
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                {grand > 0 ? ` · ${share}% of household` : ''}
              </Text>
            </View>
          </View>
          <Text style={styles.heroValue}>{money(total)}</Text>
          <View style={styles.heroBreakdown}>
            <CategoryBreakdown data={byCategory} emptyHint="No spending this month." />
          </View>
        </Card>

        {/* Entries */}
        <Card style={styles.panel}>
          <SectionHeader title="Entries" />
          {entries.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="No entries this month"
              subtitle="Tap + to add a purchase."
            />
          ) : (
            entries.map((e) => (
              <ExpenseItem
                key={e.id}
                entry={e}
                showList={false}
                onPress={() => navigation.navigate('AddEntry', { entry: e, listId: list.id })}
              />
            ))
          )}
        </Card>
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('AddEntry', { listId: list.id })}
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 110 },
  monthRow: { alignItems: 'center', marginBottom: 14 },
  error: { color: colors.alarm, fontSize: 13, marginBottom: 10, fontFamily: fonts.sans },
  hero: { padding: 20, marginBottom: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroName: {
    fontFamily: fonts.serifMedium,
    fontSize: 26,
    color: colors.ink,
  },
  heroMeta: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  heroValue: {
    fontFamily: fonts.serifMedium,
    fontSize: 44,
    color: colors.ink,
    marginTop: 14,
    letterSpacing: -1,
  },
  heroBreakdown: { marginTop: 16 },
  panel: { padding: 18 },
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
