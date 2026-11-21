import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../db';
import { errorMessage } from '../support/errors';
import { grouped } from '../support/currency';
import { cleanExpr, evaluate, isExpr } from '../support/calc';
import { computeSplit, splitByWeights } from '../db/split';
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
  const copyOf = route.params?.copyOf || null; // "Duplicate": a new entry prefilled from an old one
  const src = editing || copyOf;
  const amountRef = useRef(null);

  const [lists, setLists] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Several list ids = split between them (evenly or unevenly). Editing is single-list.
  const [listIds, setListIds] = useState(
    src ? [src.spending_list_id] : presetListId ? [presetListId] : [],
  );
  const [categoryId, setCategoryId] = useState(src?.category_id ?? null);
  const [amount, setAmount] = useState(src ? String(src.amount) : '');
  const [note, setNote] = useState(src?.item_name ?? '');
  const [purchasedAt, setPurchasedAt] = useState(editing ? new Date(editing.purchased_at) : new Date());
  const [pickingDate, setPickingDate] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);
  const [recent, setRecent] = useState([]);
  const [splitMode, setSplitMode] = useState('equal');
  const [splitValues, setSplitValues] = useState({}); // listId -> typed percent / share / amount

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit expense' : 'New expense' });
  }, [navigation, editing]);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        const [l, c, r] = await Promise.all([db.lists.all(), db.categories.all(), src ? [] : db.entries.recentItems(8)]);
        setLists(l.data);
        setCategories(c.data);
        setRecent(r);
        // One list? Pre-pick it so saving is a single tap.
        if (!src && !presetListId && l.data.length === 1) setListIds([l.data[0].id]);
      } catch (e) {
        setError(errorMessage(e));
        setLists([]);
      }
    })();
  }, [src, presetListId]);

  const sum = isExpr(amount); // "250+180" works as an amount
  const value = sum ? (evaluate(amount) ?? 0) : Number(String(amount).replace(/,/g, ''));
  const useRecent = (e) => {
    setAmount(String(e.amount));
    setNote(e.item_name);
    setCategoryId(e.category_id);
    setListIds([e.spending_list_id]);
  };
  const valid = value > 0 && listIds.length > 0 && (!splitting || !split?.error);
  const splitting = listIds.length > 1 && !editing;
  const split = splitting ? computeSplit(value, splitMode, listIds.map((id) => splitValues[id] ?? '')) : null;
  // Switching mode pre-fills sensible numbers so the split adds up straight away.
  // Two-way % or amount splits: typing one side fills the other with what's left.
  const setSplitPart = (id, text) => {
    const t = text.replace(/[^0-9.]/g, '');
    setSplitValues((v) => {
      const next = { ...v, [id]: t };
      const whole = splitMode === 'percent' ? 100 : splitMode === 'amounts' ? value : null;
      if (listIds.length === 2 && whole > 0 && t !== '') {
        const other = listIds.find((x) => x !== id);
        next[other] = String(Math.max(0, Math.round((whole - Number(t)) * 100) / 100));
      }
      return next;
    });
  };

  const chooseSplitMode = (mode) => {
    setSplitMode(mode);
    const even = value > 0 ? splitByWeights(value, listIds.map(() => 1)) : null;
    const pct = splitByWeights(100, listIds.map(() => 1));
    setSplitValues(Object.fromEntries(listIds.map((id, i) => [id,
      mode === 'percent' ? String(pct[i]) : mode === 'shares' ? '1' : mode === 'amounts' && even ? String(even[i]) : ''])));
  };
  const category = useMemo(() => categories.find((c) => c.id === categoryId), [categories, categoryId]);

  const toggleList = (id) => {
    if (editing) return setListIds([id]);
    setListIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    if (!(value > 0)) return setError('Enter an amount.');
    if (!listIds.length) return setError('Pick who it’s for.');
    if (splitting && split?.error) return setError(split.error);
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
        await db.entries.create({ ...base, spending_list_ids: listIds, split_amounts: splitMode === 'equal' ? undefined : split.amounts });
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

  // No confirm: deleting shows an Undo toast instead.
  const remove = async () => {
    try {
      const db = await getDb();
      const { row } = await db.entries.remove(editing.id);
      emit(EVENTS.ENTRIES_CHANGED);
      toast.undo('Expense deleted.', async () => {
        try {
          await db.entries.restore(row);
          emit(EVENTS.ENTRIES_CHANGED);
        } catch (err) {
          toast.error(errorMessage(err, 'Couldn’t restore it.'));
        }
      });
      navigation.goBack();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not delete the expense.'));
    }
  };

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
              onChangeText={(t) => setAmount(cleanExpr(t))}
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
              placeholder="0"
              placeholderTextColor={colors.rule}
              keyboardType="decimal-pad"
              autoFocus={!editing}
              selectionColor={colors.primary}
              cursorColor={colors.primary}
              style={[styles.amountInput, sum && { fontSize: 44, letterSpacing: -1.5 }]}
              accessibilityLabel="Amount"
            />
          </View>
          {sum ? <Text style={styles.sumPreview}>= {ccy.symbol} {grouped(value)}</Text> : null}
          {amountFocused ? (
            <View style={styles.ops}>
              {['+', '−', '×', '÷'].map((op) => (
                <Pressable
                  key={op}
                  onPress={() => setAmount((a) => (a && !/[+\-*/]$/.test(a) ? a + cleanExpr(op === '−' ? '-' : op) : a))}
                  style={styles.op}
                  accessibilityRole="button"
                  accessibilityLabel={{ '+': 'plus', '−': 'minus', '×': 'times', '÷': 'divided by' }[op]}
                >
                  <Text style={styles.opText}>{op}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Pressable onPress={() => setPickingDate(true)} style={styles.dateChip} accessibilityRole="button">
            <Ionicons name="calendar-outline" size={14} color={colors.ink} />
            <Text style={styles.chipLabel}>{dayLabel(purchasedAt.toISOString())}</Text>
          </Pressable>
        </Pressable>

        {recent.length ? (
          <View style={{ paddingBottom: 20 }}>
            <Caps style={{ paddingHorizontal: 20, paddingBottom: 10 }}>Recent</Caps>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} keyboardShouldPersistTaps="handled">
              {recent.map((e) => (
                <Pressable key={e.id} onPress={() => useRecent(e)} style={styles.recent} accessibilityRole="button" accessibilityLabel={`${e.item_name}, ${ccy.symbol} ${grouped(e.amount)}`}>
                  <Text style={styles.recentName} numberOfLines={1}>{e.item_name}</Text>
                  <Text style={styles.recentAmt}>{ccy.symbol} {grouped(e.amount)} · {e.spending_list?.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

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
          {splitting ? (
            <View style={styles.splitBox}>
              <View style={styles.splitModes}>
                {[['equal', 'Equally'], ['percent', '%'], ['shares', 'Shares'], ['amounts', 'Amounts']].map(([m, label]) => (
                  <Pressable
                    key={m}
                    onPress={() => chooseSplitMode(m)}
                    style={[styles.splitMode, splitMode === m && styles.splitModeOn]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: splitMode === m }}
                  >
                    <Text style={[styles.splitModeText, splitMode === m && { color: colors.white }]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              {listIds.map((id, i) => {
                const l = lists.find((x) => x.id === id);
                const part = split?.amounts?.[i];
                return (
                  <View key={id} style={styles.splitRow}>
                    <Text style={styles.splitName} numberOfLines={1}>{l?.name}</Text>
                    {splitMode !== 'equal' ? (
                      <View style={styles.splitInputWrap}>
                        {splitMode === 'amounts' ? <Text style={styles.splitUnit}>{ccy.symbol}</Text> : null}
                        <TextInput
                          value={splitValues[id] ?? ''}
                          onChangeText={(t) => setSplitPart(id, t)}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor={colors.muted}
                          cursorColor={colors.ink}
                          style={styles.splitInput}
                          accessibilityLabel={`${l?.name} ${splitMode === 'percent' ? 'percent' : splitMode === 'shares' ? 'shares' : 'amount'}`}
                        />
                        {splitMode === 'percent' ? <Text style={styles.splitUnit}>%</Text> : null}
                        {splitMode === 'shares' ? <Text style={styles.splitUnit}>×</Text> : null}
                      </View>
                    ) : null}
                    {splitMode !== 'amounts' ? (
                      <Text style={styles.splitAmt}>{part != null ? `${ccy.symbol} ${grouped(part)}` : '–'}</Text>
                    ) : null}
                  </View>
                );
              })}
              <Text style={[styles.splitStatus, split?.error ? { color: colors.bad } : { color: colors.good }]}>
                {split?.error ? (value > 0 ? split.error : 'Enter the amount to split.') : `✓ Adds up to ${ccy.symbol} ${grouped(value)}`}
              </Text>
            </View>
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
          <>
            <Pressable onPress={remove} style={styles.deleteBtn} accessibilityLabel="Delete expense">
              <Ionicons name="trash-outline" size={22} color={colors.bad} />
            </Pressable>
            <Pressable
              onPress={() => navigation.replace('AddEntry', { copyOf: editing })}
              style={styles.deleteBtn}
              accessibilityLabel="Duplicate expense"
            >
              <Ionicons name="copy-outline" size={22} color={colors.ink} />
            </Pressable>
          </>
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
  splitBox: { borderWidth: 1.5, borderColor: colors.rule, borderRadius: 16, padding: 12, gap: 10 },
  splitModes: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, backgroundColor: colors.soft },
  splitMode: { flex: 1, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  splitModeOn: { backgroundColor: colors.ink },
  splitModeText: { fontFamily: fonts.sansMedium, fontSize: 13.5, color: colors.ink },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  splitName: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  splitInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 40, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.soft },
  splitInput: { minWidth: 56, textAlign: 'right', fontFamily: fonts.mono, fontSize: 15, color: colors.ink, padding: 0 },
  splitUnit: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSoft },
  splitAmt: { width: 96, textAlign: 'right', fontFamily: fonts.mono, fontSize: 15, color: colors.ink },
  splitStatus: { fontFamily: fonts.sansMedium, fontSize: 13.5 },
  sumPreview: { fontFamily: fonts.mono, fontSize: 18, color: colors.inkSoft },
  ops: { flexDirection: 'row', gap: 10 },
  op: { width: 52, height: 40, borderRadius: 12, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  opText: { fontFamily: fonts.sansMedium, fontSize: 22, color: colors.ink },
  recent: { maxWidth: 180, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: colors.rule, gap: 2 },
  recentName: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  recentAmt: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkSoft },
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
