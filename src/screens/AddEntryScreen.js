import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../db';
import { errorMessage } from '../support/errors';
import { grouped } from '../support/currency';
import { emit, EVENTS } from '../support/events';
import { colors, fonts, type } from '../theme';
import { useCurrency } from '../hooks/useMoney';
import { Caps, dayLabel } from '../components/kit';
import { Loading } from '../components/ui';
import { useToast } from '../components/Toast';

export default function AddEntryScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const ccy = useCurrency();
  const toast = useToast();
  const editing = route.params?.entry || null;
  const presetListId = route.params?.listId || null;
  const amountRef = useRef(null);

  const [lists, setLists] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Several list ids = split equally between them. Editing is single-list.
  const [listIds, setListIds] = useState(
    editing ? [editing.spending_list_id] : presetListId ? [presetListId] : [],
  );
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? null);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [note, setNote] = useState(editing?.item_name ?? '');
  const [purchasedAt, setPurchasedAt] = useState(editing ? new Date(editing.purchased_at) : new Date());
  const [pickingDate, setPickingDate] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit expense' : 'New expense' });
  }, [navigation, editing]);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        const [l, c] = await Promise.all([db.lists.all(), db.categories.all()]);
        setLists(l.data);
        setCategories(c.data);
        // One list? Pre-pick it so saving is a single tap.
        if (!editing && !presetListId && l.data.length === 1) setListIds([l.data[0].id]);
      } catch (e) {
        setError(errorMessage(e));
        setLists([]);
      }
    })();
  }, [editing, presetListId]);

  const value = Number(String(amount).replace(/,/g, ''));
  const valid = value > 0 && listIds.length > 0;
  const share = listIds.length > 1 && value > 0 ? Math.round((value / listIds.length) * 100) / 100 : 0;
  const category = useMemo(() => categories.find((c) => c.id === categoryId), [categories, categoryId]);

  const toggleList = (id) => {
    if (editing) return setListIds([id]);
    setListIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    if (!(value > 0)) return setError('Enter an amount.');
    if (!listIds.length) return setError('Pick who it’s for.');
    setSaving(true);
    setError('');
    const base = {
      category_id: categoryId,
      item_name: note.trim() || category?.name || 'Expense',
      amount: value,
      purchased_at: purchasedAt,
    };
    try {
      const db = await getDb();
      if (editing) {
        await db.entries.update(editing.id, { ...base, spending_list_id: listIds[0] });
      } else if (listIds.length > 1) {
        await db.entries.create({ ...base, spending_list_ids: listIds });
      } else {
        await db.entries.create({ ...base, spending_list_id: listIds[0] });
      }
      emit(EVENTS.ENTRIES_CHANGED);
      toast.success(editing ? 'Expense updated.' : listIds.length > 1 ? `Split across ${listIds.length} lists.` : 'Expense saved.');
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e, 'Could not save the expense.'));
      setSaving(false);
    }
  };

  const remove = () => Alert.alert('Delete expense', 'Remove this entry permanently?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        try {
          await (await getDb()).entries.remove(editing.id);
          emit(EVENTS.ENTRIES_CHANGED);
          toast.success('Expense deleted.');
          navigation.goBack();
        } catch (e) {
          toast.error(errorMessage(e, 'Could not delete the expense.'));
        }
      },
    },
  ]);

  if (!lists) return <Loading />;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.amountWrap} onPress={() => amountRef.current?.focus()}>
          <View style={styles.amountRow}>
            <Text style={styles.symbol}>{ccy.symbol}</Text>
            <TextInput
              ref={amountRef}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.rule}
              keyboardType="decimal-pad"
              autoFocus={!editing}
              selectionColor={colors.primary}
              cursorColor={colors.primary}
              style={styles.amountInput}
              accessibilityLabel="Amount"
            />
          </View>
          <Pressable onPress={() => setPickingDate(true)} style={styles.dateChip} accessibilityRole="button">
            <Ionicons name="calendar-outline" size={14} color={colors.ink} />
            <Text style={styles.chipLabel}>{dayLabel(purchasedAt.toISOString())}</Text>
          </Pressable>
        </Pressable>

        <View style={styles.group}>
          <Caps>For</Caps>
          <View style={styles.wrap}>
            {lists.map((l) => {
              const on = listIds.includes(l.id);
              return (
                <Pressable
                  key={l.id}
                  onPress={() => toggleList(l.id)}
                  style={[styles.pill, on ? styles.pillOn : styles.pillOff]}
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.pillText, on && { color: colors.white }]}>{l.name}</Text>
                </Pressable>
              );
            })}
          </View>
          {share ? (
            <Text style={type.bodySoft}>Split equally · {ccy.symbol} {grouped(share)} each</Text>
          ) : !editing && lists.length > 1 ? (
            <Text style={type.bodySoft}>Pick more than one to split it.</Text>
          ) : null}
        </View>

        <View style={styles.group}>
          <Caps>Category</Caps>
          <View style={styles.wrap}>
            {categories.map((c) => {
              const on = c.id === categoryId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryId(on ? null : c.id)}
                  style={[styles.cat, on && { backgroundColor: colors.ink }]}
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.catText, on && { color: colors.white }]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={category ? `${category.name} — add a note (optional)` : 'What was it? (optional)'}
            placeholderTextColor={colors.inkSoft}
            cursorColor={colors.ink}
            style={styles.note}
            maxLength={255}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: 16 + insets.bottom }]}>
        {editing ? (
          <Pressable onPress={remove} style={styles.deleteBtn} accessibilityLabel="Delete expense">
            <Ionicons name="trash-outline" size={22} color={colors.bad} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => [styles.save, (!valid || saving) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.saveText}>
            {saving ? 'Saving…' : value > 0 ? `Save · ${ccy.symbol} ${grouped(value)}` : 'Save'}
          </Text>
        </Pressable>
      </View>

      {pickingDate ? (
        <DateTimePicker
          value={purchasedAt}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, picked) => {
            setPickingDate(false);
            if (event.type === 'set' && picked) {
              // Keep the original time of day; only the date changes.
              const d = new Date(picked);
              d.setHours(purchasedAt.getHours(), purchasedAt.getMinutes());
              setPurchasedAt(d);
            }
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  amountWrap: { alignItems: 'center', gap: 10, paddingTop: 36, paddingBottom: 32 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 20 },
  symbol: { fontFamily: fonts.sansMedium, fontSize: 24, color: colors.inkSoft },
  amountInput: {
    fontFamily: fonts.display, fontSize: 72, letterSpacing: -3.5, color: colors.ink,
    minWidth: 60, padding: 0, includeFontPadding: false,
  },
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12,
    borderRadius: 16, backgroundColor: colors.soft,
  },
  chipLabel: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  group: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { height: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: 'center' },
  pillOn: { backgroundColor: colors.ink },
  pillOff: { borderWidth: 1.5, borderColor: colors.rule },
  pillText: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  cat: { height: 40, paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center', backgroundColor: colors.soft },
  catText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  note: {
    height: 52, borderBottomWidth: 1.5, borderBottomColor: colors.rule,
    fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingHorizontal: 0,
  },
  error: { fontFamily: fonts.sans, fontSize: 14, color: colors.bad, paddingHorizontal: 20, paddingTop: 14 },
  bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.bg },
  deleteBtn: {
    width: 56, height: 56, borderRadius: 14, backgroundColor: colors.soft,
    alignItems: 'center', justifyContent: 'center',
  },
  save: {
    flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  saveText: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, color: colors.ink },
});
