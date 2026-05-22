import React, { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  const [showMenu, setShowMenu] = useState(false);

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

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>TOTAL · {monthLabelShort(monthKey).toUpperCase()}</Text>
          <Text style={styles.heroValue}>{money(grandTotal)}</Text>
          <Text style={styles.heroSub}>
            {entryCount} {entryCount === 1 ? 'expense' : 'expenses'} this month
          </Text>
        </View>

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

        <Card style={styles.panel}>
          <SectionHeader title="By category" />
          <CategoryBreakdown data={byCategory} emptyHint="No spending recorded yet." />
        </Card>

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

      <Pressable style={styles.fab} onPress={() => setShowMenu(true)}>
        <Ionicons name="add" size={30} color={colors.white} />
      </Pressable>

      <AddMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        onFuel={() => {
          setShowMenu(false);
          navigation.navigate('FuelEntry', {});
        }}
        onExpense={() => {
          setShowMenu(false);
          navigation.navigate('AddEntry', {});
        }}
      />
    </View>
  );
}

function AddMenu({ visible, onClose, onFuel, onExpense }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={menuStyles.backdrop} onPress={onClose}>
        <Pressable style={menuStyles.sheet} onPress={() => {}}>
          <Text style={menuStyles.title}>Add</Text>
          <Pressable style={menuStyles.row} onPress={onFuel}>
            <View style={[menuStyles.icon, { backgroundColor: `${colors.accent}1f` }]}>
              <Ionicons name="car-sport" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={menuStyles.rowTitle}>Fuel</Text>
              <Text style={menuStyles.rowSub}>Log a refill — rate, amount, odometer</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
          </Pressable>
          <View style={menuStyles.divider} />
          <Pressable style={menuStyles.row} onPress={onExpense}>
            <View style={[menuStyles.icon, { backgroundColor: `${colors.ink}11` }]}>
              <Ionicons name="cart-outline" size={22} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={menuStyles.rowTitle}>Other expense</Text>
              <Text style={menuStyles.rowSub}>Groceries, household, anything else</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const menuStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: colors.rule,
  },
  title: { fontFamily: fonts.serifMediumItalic, fontSize: 22, color: colors.ink, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.sansSemibold, fontSize: 15, color: colors.ink },
  rowSub: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.rule },
});

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
