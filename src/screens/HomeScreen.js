import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api, { errorMessage } from '../api/client';
import { Card, EmptyState, Loading, MonthSwitcher } from '../components/ui';
import { colors, currentMonthKey, listIcon, money, monthLabel, shiftMonth } from '../theme';

export default function HomeScreen({ navigation }) {
  const [month, setMonth] = useState(currentMonthKey());
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (targetMonth) => {
    try {
      setError('');
      const res = await api.get('/lists', { params: { month: targetMonth } });
      setLists(res.data.data || []);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(month);
    }, [month, load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(month);
  };

  const grandTotal = lists.reduce((sum, l) => sum + (l.month_total || 0), 0);

  if (loading) {
    return <Loading label="Loading lists…" />;
  }

  const header = (
    <View>
      <MonthSwitcher
        label={monthLabel(month)}
        onPrev={() => setMonth((m) => shiftMonth(m, -1))}
        onNext={() => setMonth((m) => shiftMonth(m, 1))}
      />
      <Card style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total spent this month</Text>
        <Text style={styles.totalValue}>{money(grandTotal)}</Text>
      </Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.sectionTitle}>Lists</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={lists}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon="albums-outline"
            title="No lists yet"
            subtitle="Add lists in the Laravel admin panel."
          />
        }
        renderItem={({ item }) => (
          <ListCard
            list={item}
            onPress={() => navigation.navigate('ListDetail', { list: item, month })}
          />
        )}
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('AddEntry', {})}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>
    </View>
  );
}

function ListCard({ list, onPress }) {
  const budget = list.monthly_budget;
  const spent = list.month_total || 0;
  const ratio = budget ? Math.min(spent / budget, 1) : 0;
  const overBudget = budget != null && spent > budget;

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.listCard}>
        <View style={styles.listRow}>
          <View style={[styles.iconCircle, { backgroundColor: `${list.color}22` }]}>
            <Ionicons name={listIcon(list.type)} size={20} color={list.color} />
          </View>
          <View style={styles.listInfo}>
            <Text style={styles.listName}>{list.name}</Text>
            <Text style={styles.listMeta}>
              {list.month_entries_count} {list.month_entries_count === 1 ? 'item' : 'items'}
            </Text>
          </View>
          <View style={styles.listAmountBox}>
            <Text style={styles.listAmount}>{money(spent)}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </View>
        </View>

        {budget != null ? (
          <View style={styles.budgetWrap}>
            <View style={styles.budgetTrack}>
              <View
                style={[
                  styles.budgetFill,
                  { width: `${ratio * 100}%`, backgroundColor: overBudget ? colors.danger : list.color },
                ]}
              />
            </View>
            <Text style={[styles.budgetText, overBudget && { color: colors.danger }]}>
              {overBudget
                ? `${money(spent - budget)} over budget`
                : `${money(list.budget_remaining)} of ${money(budget)} left`}
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 100 },
  totalCard: { marginTop: 14, alignItems: 'center', backgroundColor: colors.primary, borderColor: colors.primary },
  totalLabel: { color: '#e0e7ff', fontSize: 13, fontWeight: '600' },
  totalValue: { color: colors.white, fontSize: 30, fontWeight: '800', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.muted, marginBottom: 8, marginTop: 4 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 8 },
  listCard: { padding: 14 },
  listRow: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  listInfo: { flex: 1, marginLeft: 12 },
  listName: { fontSize: 16, fontWeight: '700', color: colors.text },
  listMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  listAmountBox: { flexDirection: 'row', alignItems: 'center' },
  listAmount: { fontSize: 16, fontWeight: '800', color: colors.text, marginRight: 4 },
  budgetWrap: { marginTop: 12 },
  budgetTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  budgetFill: { height: 6, borderRadius: 3 },
  budgetText: { fontSize: 11, color: colors.muted, marginTop: 5 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
