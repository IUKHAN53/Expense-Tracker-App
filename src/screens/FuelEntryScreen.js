import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../db';
import { previewFill } from '../db/fuel';
import { errorMessage } from '../support/errors';
import { grouped } from '../support/currency';
import { emit, EVENTS } from '../support/events';
import { colors, fonts, type } from '../theme';
import { useCurrency } from '../hooks/useMoney';
import { Caps, dayLabel } from '../components/kit';
import { Loading } from '../components/ui';
import { useToast } from '../components/Toast';

const BASE_TYPES = ['E92', 'E95', 'E98'];
const KEYS = ['amount', 'rate', 'liters'];
const r2 = (n) => Math.round(n * 100) / 100;
const clean = (t) => t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

/**
 * Log or edit a refill. Built for speed: rate and fuel type are prefilled from
 * the last refill, any two of amount / rate / litres give the third, and the
 * km/L for this fill shows live as the odometer is typed.
 */
export default function FuelEntryScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const ccy = useCurrency();
  const toast = useToast();
  const editing = route.params?.entry || null;
  const amountRef = useRef(null);
  const odoRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [carListId, setCarListId] = useState(null);
  const [fuelCategoryId, setFuelCategoryId] = useState(null);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [vals, setVals] = useState({
    amount: editing?.amount != null ? String(editing.amount) : '',
    rate: editing?.rate != null ? String(editing.rate) : '',
    liters: '',
  });
  // The last two fields the user typed in; the remaining one is calculated.
  const [sources, setSources] = useState(['amount', 'rate']);
  const [odometer, setOdometer] = useState(editing?.odometer != null ? String(editing.odometer) : '');
  const [fuelType, setFuelType] = useState(editing?.fuel_type || 'E92');
  const [full, setFull] = useState(editing ? editing.is_full_tank !== false : true);
  const [notes, setNotes] = useState(editing?.notes || '');
  const [date, setDate] = useState(editing?.date ? new Date(editing.date) : new Date());
  const [picking, setPicking] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit refill' : 'New refill' });
  }, [navigation, editing]);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        const [l, c, f] = await Promise.all([db.lists.all(), db.categories.all(), db.fuel()]);
        const car = l.data.find((x) => x.type === 'vehicle');
        if (!car) setError('No Car list yet. Add one (type: Vehicle) in Settings → Lists.');
        setCarListId(car?.id ?? null);
        setFuelCategoryId(c.data.find((x) => /^fuel$/i.test(x.name))?.id ?? null);
        setRecords(f.records);
        // New refill: start from the last one's rate and fuel type.
        const last = f.records[0];
        if (!editing && last) {
          if (last.rate) setVals((v) => ({ ...v, rate: String(last.rate) }));
          if (last.fuel_type) setFuelType(last.fuel_type);
        }
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setReady(true);
      }
    })();
  }, [editing]);

  const derived = KEYS.find((k) => !sources.includes(k));
  const n = (k) => Number(vals[k]) || 0;
  const amount = derived === 'amount' ? r2(n('rate') * n('liters')) : n('amount');
  const rate = derived === 'rate' ? (n('liters') ? r2(n('amount') / n('liters')) : 0) : n('rate');
  const liters = derived === 'liters' ? (n('rate') ? r2(n('amount') / n('rate')) : 0) : n('liters');
  const shown = {
    amount: derived === 'amount' ? (amount ? String(Math.round(amount)) : '') : vals.amount,
    rate: derived === 'rate' ? (rate ? String(rate) : '') : vals.rate,
    liters: derived === 'liters' ? (liters ? String(liters) : '') : vals.liters,
  };

  const edit = (key) => (text) => {
    setVals((v) => ({ ...v, [key]: clean(text) }));
    setSources((s) => [key, ...s.filter((k) => k !== key)].slice(0, 2));
  };

  const types = useMemo(
    () => [...new Set([...BASE_TYPES, ...records.map((r) => r.fuel_type).filter(Boolean)])],
    [records],
  );

  const preview = useMemo(
    () => previewFill(records, {
      id: editing?.id, date: date.toISOString(), odometer, liters, amount, full,
    }),
    [records, editing, date, odometer, liters, amount, full],
  );

  const setDay = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    setDate(d);
  };
  const isDay = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toDateString() === date.toDateString();
  };

  const save = async (confirmedLowOdo = false) => {
    if (!carListId) return setError('There’s no Car list to save to.');
    if (!(amount > 0)) return setError('Enter the amount you paid.');
    if (!(liters > 0)) return setError('Enter the rate or the litres.');
    if (!odometer) {
      odoRef.current?.focus();
      return setError('Enter the odometer reading.');
    }
    if (preview.lowerThanLast && !confirmedLowOdo) {
      return Alert.alert(
        'Odometer lower than last time',
        `Your last refill was at ${grouped(preview.lastOdometer)} km. Save ${grouped(odometer)} km anyway?`,
        [{ text: 'Fix it', style: 'cancel' }, { text: 'Save anyway', onPress: () => save(true) }],
      );
    }
    setSaving(true);
    setError('');
    const payload = {
      spending_list_id: carListId,
      category_id: fuelCategoryId,
      item_name: `Fuel · ${fuelType}`,
      amount,
      quantity: 1,
      unit: 'ltr',
      purchased_at: date,
      notes: notes.trim() || null,
      fuel_liters: liters,
      fuel_rate: rate,
      odometer: parseInt(odometer, 10),
      fuel_type: fuelType,
      is_full_tank: full,
    };
    try {
      const db = await getDb();
      if (editing) await db.entries.update(editing.id, payload);
      else await db.entries.create(payload);
      emit(EVENTS.ENTRIES_CHANGED);
      toast.success(
        preview.kmpl && !editing ? `Refill saved · ${preview.kmpl} km/L` : editing ? 'Refill updated.' : 'Refill saved.',
      );
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e, 'Could not save the refill.'));
      setSaving(false);
    }
  };

  const remove = () => Alert.alert('Delete refill', 'Remove this refill permanently?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        try {
          await (await getDb()).entries.remove(editing.id);
          emit(EVENTS.ENTRIES_CHANGED);
          toast.success('Refill deleted.');
          navigation.goBack();
        } catch (e) {
          toast.error(errorMessage(e, 'Could not delete the refill.'));
        }
      },
    },
  ]);

  if (!ready) return <Loading />;

  const odoHint = preview.lowerThanLast
    ? `Lower than your last reading (${grouped(preview.lastOdometer)} km)`
    : preview.kmSince
      ? `+${grouped(preview.kmSince)} km since last refill`
      : preview.lastOdometer != null
        ? `Last: ${grouped(preview.lastOdometer)} km · ${dayLabel(preview.lastDate)}`
        : null;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {/* Amount paid — the number on the pump */}
        <Pressable style={styles.amountWrap} onPress={() => amountRef.current?.focus()}>
          <View style={styles.amountRow}>
            <Text style={styles.symbol}>{ccy.symbol}</Text>
            <TextInput
              ref={amountRef}
              value={shown.amount}
              onChangeText={edit('amount')}
              placeholder="0"
              placeholderTextColor={colors.rule}
              keyboardType="decimal-pad"
              autoFocus={!editing}
              selectTextOnFocus={derived === 'amount'}
              selectionColor={colors.primary}
              cursorColor={colors.ink}
              style={[styles.amountInput, derived === 'amount' && { color: colors.inkSoft }]}
              accessibilityLabel="Amount paid"
            />
          </View>
          <Text style={type.bodySoft}>
            {liters > 0 ? `${liters} L at ${ccy.symbol} ${rate}/L` : 'Amount paid'}
          </Text>
        </Pressable>

        {/* Any two of rate / litres / amount */}
        <View style={styles.pair}>
          <Field
            label={`Rate · ${ccy.symbol}/L`}
            value={shown.rate}
            onChangeText={edit('rate')}
            auto={derived === 'rate'}
          />
          <Field
            label="Litres"
            value={shown.liters}
            onChangeText={edit('liters')}
            auto={derived === 'liters'}
          />
        </View>

        {/* Odometer with live context */}
        <View style={styles.group}>
          <Caps>Odometer · km</Caps>
          <TextInput
            ref={odoRef}
            value={odometer}
            onChangeText={(t) => setOdometer(t.replace(/[^0-9]/g, ''))}
            placeholder={preview.lastOdometer != null ? `More than ${grouped(preview.lastOdometer)}` : 'e.g. 71500'}
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            selectionColor={colors.primary}
            cursorColor={colors.ink}
            style={[styles.input, preview.lowerThanLast && { borderColor: colors.bad }]}
            accessibilityLabel="Odometer reading"
          />
          {odoHint ? (
            <Text style={[styles.hint, preview.lowerThanLast && { color: colors.bad }, preview.kmSince && { color: colors.ink }]}>
              {odoHint}
            </Text>
          ) : null}
        </View>

        {/* Full tank vs top-up decides how km/L is counted */}
        <View style={styles.group}>
          <View style={styles.segment}>
            {[[true, 'Full tank'], [false, 'Top-up']].map(([val, label]) => (
              <Pressable
                key={label}
                onPress={() => setFull(val)}
                style={[styles.segItem, full === val && styles.segOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: full === val }}
              >
                <Text style={[styles.segText, full === val && { color: colors.white }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Live result for this fill */}
        {full && preview.kmpl ? (
          <View style={styles.result}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={styles.resultBig}>{preview.kmpl}</Text>
              <Text style={styles.resultUnit}>km/L</Text>
            </View>
            <Text style={styles.resultSub}>
              {ccy.symbol} {preview.perKm} per km · {grouped(preview.kmSince)} km on this tank
            </Text>
          </View>
        ) : !full ? (
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={18} color={colors.inkSoft} />
            <Text style={styles.noteText}>
              Top-ups don’t get their own km/L — their litres count towards your next full tank, so the average stays accurate.
            </Text>
          </View>
        ) : null}

        <View style={styles.group}>
          <Caps>Fuel</Caps>
          <View style={styles.wrap}>
            {types.map((t) => (
              <Pressable
                key={t}
                onPress={() => setFuelType(t)}
                style={[styles.chip, t === fuelType && { backgroundColor: colors.ink }]}
                accessibilityState={{ selected: t === fuelType }}
              >
                <Text style={[styles.chipText, t === fuelType && { color: colors.white }]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.group}>
          <Caps>When</Caps>
          <View style={styles.wrap}>
            {[[0, 'Today'], [1, 'Yesterday']].map(([off, label]) => (
              <Pressable
                key={label}
                onPress={() => setDay(off)}
                style={[styles.chip, isDay(off) && { backgroundColor: colors.ink }]}
              >
                <Text style={[styles.chipText, isDay(off) && { color: colors.white }]}>{label}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setPicking(true)}
              style={[styles.chip, styles.chipIcon, !isDay(0) && !isDay(1) && { backgroundColor: colors.ink }]}
            >
              <Ionicons name="calendar-outline" size={15} color={!isDay(0) && !isDay(1) ? colors.white : colors.ink} />
              <Text style={[styles.chipText, !isDay(0) && !isDay(1) && { color: colors.white }]}>
                {!isDay(0) && !isDay(1) ? dayLabel(date.toISOString()) : 'Other day'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Station or note (optional)"
            placeholderTextColor={colors.inkSoft}
            cursorColor={colors.ink}
            style={styles.notes}
            maxLength={2000}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: 16 + insets.bottom }]}>
        {editing ? (
          <Pressable onPress={remove} style={styles.deleteBtn} accessibilityLabel="Delete refill">
            <Ionicons name="trash-outline" size={22} color={colors.bad} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => save()}
          disabled={saving}
          style={({ pressed }) => [
            styles.save,
            (!(amount > 0 && liters > 0 && odometer) || saving) && { opacity: 0.5 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.saveText}>
            {saving ? 'Saving…' : amount > 0 ? `Save refill · ${ccy.symbol} ${grouped(amount)}` : 'Save refill'}
          </Text>
        </Pressable>
      </View>

      {picking ? (
        <DateTimePicker
          value={date}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, picked) => {
            setPicking(false);
            if (event.type === 'set' && picked) {
              const d = new Date(picked);
              d.setHours(date.getHours(), date.getMinutes());
              setDate(d);
            }
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** Small numeric field; `auto` marks the one being calculated from the others. */
function Field({ label, value, onChangeText, auto }) {
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Caps>{label}</Caps>
        {auto ? <Text style={styles.auto}>AUTO</Text> : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor={colors.muted}
        keyboardType="decimal-pad"
        selectTextOnFocus={auto}
        selectionColor={colors.primary}
        cursorColor={colors.ink}
        style={[styles.input, auto && { backgroundColor: colors.soft, borderColor: colors.soft, color: colors.inkSoft }]}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  amountWrap: { alignItems: 'center', gap: 8, paddingTop: 28, paddingBottom: 24 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 20 },
  symbol: { fontFamily: fonts.sansMedium, fontSize: 24, color: colors.inkSoft },
  amountInput: {
    fontFamily: fonts.display, fontSize: 64, letterSpacing: -3, color: colors.ink,
    minWidth: 50, padding: 0, includeFontPadding: false,
  },
  pair: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 20 },
  group: { paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  input: {
    height: 56, borderWidth: 1.5, borderColor: colors.rule, borderRadius: 14, paddingHorizontal: 16,
    fontFamily: fonts.monoMedium, fontSize: 18, color: colors.ink,
  },
  hint: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.inkSoft },
  auto: {
    fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 0.8, color: colors.inkSoft,
    backgroundColor: colors.soft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
  },
  segment: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 14, backgroundColor: colors.soft },
  segItem: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.ink },
  segText: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  result: {
    marginHorizontal: 20, marginBottom: 20, padding: 16, borderRadius: 14,
    backgroundColor: colors.ink, gap: 2,
  },
  resultBig: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -1.2, color: colors.primary },
  resultUnit: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.white },
  resultSub: { fontFamily: fonts.sans, fontSize: 13, color: '#BDBDBD' },
  note: {
    flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 20, padding: 14,
    borderRadius: 14, backgroundColor: colors.soft,
  },
  noteText: { flex: 1, fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center', backgroundColor: colors.soft },
  chipIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  notes: {
    height: 52, borderBottomWidth: 1.5, borderBottomColor: colors.rule,
    fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingHorizontal: 0,
  },
  error: { fontFamily: fonts.sans, fontSize: 14, color: colors.bad, paddingHorizontal: 20, paddingTop: 14 },
  bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.bg },
  deleteBtn: {
    width: 56, height: 56, borderRadius: 14, backgroundColor: colors.soft,
    alignItems: 'center', justifyContent: 'center',
  },
  save: { flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, color: colors.ink },
});
