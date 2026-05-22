import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api, { errorMessage } from '../api/client';
import { AppHeader } from '../components/Header';
import {
  Card,
  EmptyState,
  Loading,
  PersonBar,
  SectionHeader,
} from '../components/ui';
import { CategoryBreakdown, ExpenseItem } from '../components/bits';
import { colors, currentMonthKey, fonts, money, monthLabelShort } from '../theme';

export default function HomeScreen({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // The mobile app always shows the current month; pick up the latest "now" on each focus.
  const load = useCallback(async () => {
    try {
      setError('');
      const month = currentMonthKey();
      const [s, e] = await Promise.all([
        api.get('/summary', { params: { month } }),
        api.get('/entries', { params: { month, limit: 8 } }),
      ]);
      setSummary(s.data);
      setEntries(e.data.data || []);
    } catch (err) {
      setError(errorMessage(err));
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
        <AppHeader />
        <Loading label="Loading your ledger…" />
      </View>
    );
  }

  const monthKey = currentMonthKey();
  const grandTotal = summary ? summary.grand_total : 0;
  const lists = summary ? [...summary.lists].sort((a, b) => b.total - a.total) : [];
  const byCategory = summary
    ? summary.by_category.map((c) => ({ name: c.category_name, amount: c.total }))
    : [];
  const entryCount = summary
    ? summary.by_category.reduce((n, c) => n + (c.count || 0), 0)
    : 0;

  return (
    <View style={styles.screen}>
      <AppHeader />

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

        {/* Hero total — always this month */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>TOTAL · {monthLabelShort(monthKey).toUpperCase()}</Text>
          <Text style={styles.heroValue}>{money(grandTotal)}</Text>
          <Text style={styles.heroSub}>
            {entryCount} {entryCount === 1 ? 'expense' : 'expenses'} this month
          </Text>
        </View>

        {/* By person */}
        <Card style={styles.panel}>
          <SectionHeader title="By person" />
          {lists.length === 0 ? (
            <EmptyState icon="people-outline" title="No lists yet" />
          ) : (
            lists.map((l) => (
              <PersonBar
                key={l.id}
                name={l.name}
                type={l.type}
                amount={l.total}
                total={grandTotal}
                onPress={() => navigation.navigate('ListDetail', { list: l })}
              />
            ))
          )}
        </Card>

        {/* By category */}
        <Card style={styles.panel}>
          <SectionHeader title="By category" />
          <CategoryBreakdown data={byCategory} emptyHint="No spending recorded yet." />
        </Card>

        {/* Recent */}
        <Card style={styles.panel}>
          <SectionHeader
            title="Recent"
            right={<Text style={styles.count}>{entries.length}</Text>}
          />
          {entries.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="Nothing here yet"
              subtitle="Tap + to add your first expense."
            />
          ) : (
            entries.map((e) => (
              <ExpenseItem
                key={e.id}
                entry={e}
                onPress={() =>
                  navigation.navigate('AddEntry', { entry: e, listId: e.spending_list_id })
                }
              />
            ))
          )}
        </Card>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => navigation.navigate('AddEntry', {})}>
        <Ionicons name="add" size={30} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 110 },
  error: { color: colors.alarm, fontSize: 13, marginBottom: 10, fontFamily: fonts.sans },
  hero: { alignItems: 'center', paddingVertical: 18 },
  heroLabel: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 2,
    color: colors.inkSoft,
  },
  heroValue: {
    fontFamily: fonts.serifMedium,
    fontSize: 50,
    color: colors.ink,
    marginTop: 6,
    letterSpacing: -1,
  },
  heroSub: { fontFamily: fonts.serifItalic, fontSize: 14, color: colors.inkSoft, marginTop: 4 },
  panel: { marginTop: 4, marginBottom: 12, padding: 18 },
  count: { fontFamily: fonts.mono, fontSize: 12, color: colors.inkSoft },
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
