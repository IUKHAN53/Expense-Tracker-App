import React, { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api, { errorMessage } from '../api/client';
import { Badge, Card, EmptyState, Loading, MonthSwitcher } from '../components/ui';
import { colors, currentMonthKey, formatDate, money, monthLabel, shiftMonth } from '../theme';

const SOURCE_ICON = {
  manual: 'create-outline',
  scan: 'scan-outline',
  sms: 'chatbubble-ellipses-outline',
};

export default function ListDetailScreen({ route, navigation }) {
  const { list } = route.params;
  const [month, setMonth] = useState(route.params.month || currentMonthKey());
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
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
        const res = await api.get('/entries', {
          params: { spending_list_id: list.id, month: targetMonth },
        });
        setEntries(res.data.data || []);
        setTotal(res.data.total || 0);
      } catch (e) {
        setError(errorMessage(e));
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

  if (loading) {
    return <Loading label="Loading entries…" />;
  }

  const header = (
    <View>
      <MonthSwitcher
        label={monthLabel(month)}
        onPrev={() => setMonth((m) => shiftMonth(m, -1))}
        onNext={() => setMonth((m) => shiftMonth(m, 1))}
      />
      <Card style={[styles.totalCard, { backgroundColor: list.color, borderColor: list.color }]}>
        <Text style={styles.totalLabel}>Spent in {monthLabel(month)}</Text>
        <Text style={styles.totalValue}>{money(total)}</Text>
        <Text style={styles.totalLabel}>
          {entries.length} {entries.length === 1 ? 'item' : 'items'}
        </Text>
      </Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(month);
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No items this month"
            subtitle="Tap + to add a purchase."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('AddEntry', { entry: item, listId: list.id })}
          >
            <Card style={styles.entryCard}>
              <View style={styles.entryMain}>
                <Text style={styles.entryName}>{item.item_name}</Text>
                <View style={styles.entryMetaRow}>
                  <Ionicons
                    name={SOURCE_ICON[item.source] || 'ellipse-outline'}
                    size={12}
                    color={colors.muted}
                  />
                  <Text style={styles.entryMeta}>{'  '}{formatDate(item.purchased_at, true)}</Text>
                </View>
                {item.category ? (
                  <View style={styles.entryBadge}>
                    <Badge label={item.category.name} color={item.category.color || colors.muted} />
                  </View>
                ) : null}
              </View>
              <View style={styles.entryRight}>
                <Text style={styles.entryAmount}>{money(item.amount)}</Text>
                {Number(item.quantity) !== 1 ? (
                  <Text style={styles.entryQty}>
                    ×{item.quantity}
                    {item.unit ? ` ${item.unit}` : ''}
                  </Text>
                ) : null}
              </View>
            </Card>
          </Pressable>
        )}
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('AddEntry', { listId: list.id })}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 100 },
  totalCard: { marginTop: 14, alignItems: 'center' },
  totalLabel: { color: '#ffffffcc', fontSize: 12, fontWeight: '600' },
  totalValue: { color: colors.white, fontSize: 30, fontWeight: '800', marginVertical: 4 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 8 },
  entryCard: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  entryMain: { flex: 1 },
  entryName: { fontSize: 15, fontWeight: '700', color: colors.text },
  entryMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  entryMeta: { fontSize: 12, color: colors.muted },
  entryBadge: { marginTop: 6 },
  entryRight: { alignItems: 'flex-end', marginLeft: 10 },
  entryAmount: { fontSize: 16, fontWeight: '800', color: colors.text },
  entryQty: { fontSize: 11, color: colors.muted, marginTop: 2 },
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
