import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDb } from '../db';
import { scanReceipt } from '../scan/api';
import { usePro } from '../context/ProContext';
import { useApp } from '../context/AppContext';
import { errorMessage } from '../support/errors';
import { grouped } from '../support/currency';
import { emit, EVENTS } from '../support/events';
import { colors, fonts, type } from '../theme';
import { useCurrency } from '../hooks/useMoney';
import { Caps, dayLabel } from '../components/kit';
import { useToast } from '../components/Toast';

const FREE_KEY = 'scan_free_left';
const num = (t) => String(t ?? '').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

function receiptDate(s) {
  const d = s ? new Date(String(s).replace(' ', 'T')) : null;
  return d && !Number.isNaN(d.getTime()) && d <= new Date() ? d : new Date();
}

/**
 * Scan a receipt (Pro, 3 free): photo → server reads it → every line item is
 * editable and assignable to a list before saving. Fuel slips go to the refill form.
 */
export default function ScanScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const ccy = useCurrency();
  const toast = useToast();
  const { currency } = useApp();
  const { pro, token } = usePro();

  const [phase, setPhase] = useState('pick'); // pick | reading | review
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [freeLeft, setFreeLeft] = useState(null);
  const [lists, setLists] = useState([]);
  const [categories, setCategories] = useState([]);

  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date());
  const [pickingDate, setPickingDate] = useState(false);
  const [fuel, setFuel] = useState(null);
  const [items, setItems] = useState([]);
  const [sheet, setSheet] = useState(null); // { kind: 'list'|'category', index: number|'all' }
  const [saving, setSaving] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    (async () => {
      const db = await getDb();
      const [l, c, f] = await Promise.all([db.lists.all(), db.categories.all(), db.settings.get(FREE_KEY)]);
      setLists(l.data);
      setCategories(c.data);
      setFreeLeft(f == null ? null : Number(f));
    })().catch((e) => setError(errorMessage(e)));
  }, []);

  const outOfFree = !pro && freeLeft === 0;

  const pick = async (source) => {
    setError('');
    if (outOfFree) return navigation.navigate('Paywall');
    try {
      let res;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return setError('Allow camera access to scan, or choose a photo from your gallery.');
        res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
      } else {
        res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
      }
      if (res.canceled || !res.assets?.[0]) return;
      read(res.assets[0].uri);
    } catch (e) {
      setError(errorMessage(e, 'Couldn’t open the camera.'));
    }
  };

  // Opened from the scan button: go straight to the camera (once lists + quota are loaded).
  useEffect(() => {
    if (started.current || !lists.length) return;
    started.current = true;
    if (route.params?.source === 'camera') pick('camera');
  }, [lists]); // eslint-disable-line react-hooks/exhaustive-deps

  const read = async (uri) => {
    setPhoto(uri);
    setPhase('reading');
    const res = await scanReceipt(uri, { token, currency, categories: categories.map((c) => c.name) });
    const db = await getDb();
    if (res.freeLeft != null) {
      setFreeLeft(res.freeLeft);
      db.settings.set(FREE_KEY, String(res.freeLeft)).catch(() => {});
    }
    if (!res.ok) {
      setPhase('pick');
      if (res.code === 'paywall') return navigation.navigate('Paywall');
      return setError(res.message);
    }
    loadScan(res.scan);
    setPhase('review');
  };

  const loadScan = (scan) => {
    const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const car = lists.find((l) => l.type === 'vehicle');
    const firstHome = lists.find((l) => l.type !== 'vehicle') || lists[0];
    setMerchant(scan.merchant || '');
    setDate(receiptDate(scan.purchased_at));
    setFuel(scan.receipt_type === 'fuel' && car ? {
      amount: scan.total ?? scan.items?.[0]?.amount, rate: scan.fuel_rate, liters: scan.fuel_liters,
    } : null);
    const rows = (scan.items || []).map((it) => ({
      name: it.name || 'Item',
      amount: it.amount != null ? String(it.amount) : '',
      quantity: it.quantity,
      unit: it.unit,
      categoryId: catByName.get(String(it.suggested_category || '').toLowerCase()) ?? null,
      listId: firstHome?.id ?? null,
    }));
    // Nothing itemised? One row for the total so it can still be saved.
    setItems(rows.length ? rows : [{ name: scan.merchant || 'Receipt', amount: scan.total != null ? String(scan.total) : '', categoryId: null, listId: firstHome?.id ?? null }]);
  };

  const update = (i, patch) => setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const remove = (i) => setItems((prev) => prev.filter((_, j) => j !== i));
  const addItem = () => setItems((prev) => [...prev, { name: '', amount: '', categoryId: null, listId: prev.at(-1)?.listId ?? lists[0]?.id }]);

  const total = useMemo(() => items.reduce((s, it) => s + (Number(it.amount) || 0), 0), [items]);
  const allList = items.length && items.every((it) => it.listId === items[0].listId) ? items[0].listId : null;

  const choose = (id) => {
    const { kind, index } = sheet;
    const key = kind === 'list' ? 'listId' : 'categoryId';
    setItems((prev) => prev.map((it, j) => (index === 'all' || j === index ? { ...it, [key]: id } : it)));
    setSheet(null);
  };

  const save = async () => {
    const bad = items.findIndex((it) => !it.name.trim() || !(Number(it.amount) >= 0) || it.amount === '');
    if (bad >= 0) return setError(`Item ${bad + 1} needs a name and an amount.`);
    if (items.some((it) => !it.listId)) return setError('Every item needs a list.');
    setSaving(true);
    setError('');
    try {
      const db = await getDb();
      const notes = merchant.trim() || null;
      await db.entries.createMany(items.map((it) => ({
        spending_list_id: it.listId,
        category_id: it.categoryId,
        item_name: it.name.trim(),
        amount: Number(it.amount),
        quantity: it.quantity || 1,
        unit: it.unit || null,
        purchased_at: date,
        notes,
        source: 'scan',
      })));
      emit(EVENTS.ENTRIES_CHANGED);
      toast.success(`${items.length} item${items.length === 1 ? '' : 's'} saved.`);
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e, 'Couldn’t save the items.'));
      setSaving(false);
    }
  };

  const listName = (id) => lists.find((l) => l.id === id)?.name || 'Pick list';
  const catName = (id) => categories.find((c) => c.id === id)?.name || 'Category';

  if (phase === 'reading') {
    return (
      <View style={[styles.screen, styles.center]}>
        {photo ? <Image source={{ uri: photo }} style={styles.thumb} /> : null}
        <ActivityIndicator size="large" color={colors.ink} style={{ marginTop: 28 }} />
        <Text style={[type.title, { fontSize: 22, marginTop: 16 }]}>Reading receipt…</Text>
        <Text style={[type.bodySoft, { marginTop: 6 }]}>This takes a few seconds.</Text>
      </View>
    );
  }

  if (phase === 'pick') {
    return (
      <View style={[styles.screen, { padding: 20, paddingBottom: 20 + insets.bottom }]}>
        <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
          <View style={styles.bigIcon}><Ionicons name="scan-outline" size={40} color={colors.ink} /></View>
          <Text style={[type.title, { textAlign: 'center' }]}>Scan a receipt</Text>
          <Text style={[type.bodySoft, { textAlign: 'center', paddingHorizontal: 12 }]}>
            Shop bill, grocery slip or petrol receipt. Every item is read so you can check it and assign it to a list.
          </Text>
          <Text style={styles.quota}>
            {pro ? 'Kharcha Pro · unlimited scans'
              : freeLeft == null ? '3 free scans, then Kharcha Pro'
                : freeLeft > 0 ? `${freeLeft} free scan${freeLeft === 1 ? '' : 's'} left` : 'Free scans used'}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
        {outOfFree ? (
          <BigButton icon="sparkles" title="Get Kharcha Pro" onPress={() => navigation.navigate('Paywall')} />
        ) : (
          <>
            <BigButton icon="camera" title="Take photo" onPress={() => pick('camera')} />
            <BigButton icon="images-outline" title="Choose from gallery" secondary onPress={() => pick('gallery')} />
          </>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={styles.headRow}>
          <TextInput
            value={merchant}
            onChangeText={setMerchant}
            placeholder="Shop name"
            placeholderTextColor={colors.inkSoft}
            cursorColor={colors.ink}
            style={styles.merchant}
            maxLength={120}
          />
          <Pressable onPress={() => setPickingDate(true)} style={styles.chip} accessibilityRole="button">
            <Ionicons name="calendar-outline" size={14} color={colors.ink} />
            <Text style={styles.chipText}>{dayLabel(date.toISOString())}</Text>
          </Pressable>
        </View>

        {fuel ? (
          <Pressable
            style={styles.fuelBanner}
            onPress={() => navigation.replace('FuelEntry', { prefill: { ...fuel, date: date.toISOString() } })}
          >
            <Ionicons name="car-outline" size={20} color={colors.ink} />
            <Text style={styles.fuelText}>Petrol receipt. Log it as a refill to track km/L.</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.ink} />
          </Pressable>
        ) : null}

        <View style={styles.assignRow}>
          <Caps>Assign all to</Caps>
          <View style={styles.wrap}>
            {lists.map((l) => {
              const on = allList === l.id;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => setItems((prev) => prev.map((it) => ({ ...it, listId: l.id })))}
                  style={[styles.pill, on ? styles.pillOn : styles.pillOff]}
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.pillText, on && { color: colors.white }]}>{l.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Caps style={{ paddingTop: 8, paddingBottom: 4 }}>{items.length} item{items.length === 1 ? '' : 's'}</Caps>
        {items.map((it, i) => (
          <View key={i} style={styles.item}>
            <View style={styles.itemTop}>
              <TextInput
                value={it.name}
                onChangeText={(t) => update(i, { name: t })}
                placeholder="Item"
                placeholderTextColor={colors.inkSoft}
                cursorColor={colors.ink}
                style={styles.itemName}
                maxLength={255}
              />
              <Text style={styles.sym}>{ccy.symbol}</Text>
              <TextInput
                value={it.amount}
                onChangeText={(t) => update(i, { amount: num(t) })}
                placeholder="0"
                placeholderTextColor={colors.inkSoft}
                keyboardType="decimal-pad"
                cursorColor={colors.ink}
                style={styles.itemAmt}
              />
              <Pressable onPress={() => remove(i)} hitSlop={10} accessibilityLabel={`Remove ${it.name || 'item'}`}>
                <Ionicons name="close" size={18} color={colors.inkSoft} />
              </Pressable>
            </View>
            <View style={styles.itemChips}>
              <Pressable style={[styles.chip, styles.listChip]} onPress={() => setSheet({ kind: 'list', index: i })}>
                <Ionicons name="person-outline" size={13} color={colors.white} />
                <Text style={[styles.chipText, { color: colors.white }]} numberOfLines={1}>{listName(it.listId)}</Text>
              </Pressable>
              <Pressable style={styles.chip} onPress={() => setSheet({ kind: 'category', index: i })}>
                <Ionicons name="pricetag-outline" size={13} color={colors.ink} />
                <Text style={styles.chipText} numberOfLines={1}>{catName(it.categoryId)}</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <Pressable onPress={addItem} style={styles.addItem} accessibilityRole="button">
          <Ionicons name="add" size={18} color={colors.ink} />
          <Text style={styles.chipText}>Add item</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          onPress={save}
          disabled={saving || !items.length}
          style={({ pressed }) => [styles.save, (saving || !items.length) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.saveText}>
            {saving ? 'Saving…' : `Save ${items.length} · ${ccy.symbol} ${grouped(total)}`}
          </Text>
        </Pressable>
      </View>

      <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSheet(null)} />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <Text style={[type.title, { fontSize: 20, paddingBottom: 8 }]}>{sheet?.kind === 'list' ? 'Assign to' : 'Category'}</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {(sheet?.kind === 'list' ? lists : [{ id: null, name: 'No category' }, ...categories]).map((o) => (
              <Pressable key={String(o.id)} onPress={() => choose(o.id)} style={styles.option}>
                <Text style={styles.optionText}>{o.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {pickingDate ? (
        <DateTimePicker
          value={date}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, picked) => {
            setPickingDate(false);
            if (event.type === 'set' && picked) setDate(picked);
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

function BigButton({ icon, title, onPress, secondary }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.big, secondary && styles.bigSecondary, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon} size={20} color={colors.ink} />
      <Text style={styles.saveText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  thumb: { width: 160, height: 220, borderRadius: 12, backgroundColor: colors.soft },
  bigIcon: {
    alignSelf: 'center', width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  quota: { textAlign: 'center', fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink, paddingTop: 8 },
  big: {
    height: 56, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10,
  },
  bigSecondary: { backgroundColor: colors.soft },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 16 },
  merchant: {
    flex: 1, fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.6, color: colors.ink, padding: 0,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12,
    borderRadius: 16, backgroundColor: colors.soft, maxWidth: 170,
  },
  listChip: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 13.5, color: colors.ink },
  fuelBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12,
    backgroundColor: colors.primary, marginBottom: 16,
  },
  fuelText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  assignRow: { gap: 10, paddingBottom: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { height: 40, paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center' },
  pillOn: { backgroundColor: colors.ink },
  pillOff: { borderWidth: 1.5, borderColor: colors.rule },
  pillText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.rule, gap: 10 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 16, color: colors.ink, padding: 0 },
  sym: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSoft },
  itemAmt: { width: 84, textAlign: 'right', fontFamily: fonts.mono, fontSize: 16, color: colors.ink, padding: 0 },
  itemChips: { flexDirection: 'row', gap: 8 },
  addItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14 },
  error: { fontFamily: fonts.sans, fontSize: 14, color: colors.bad, paddingTop: 12, textAlign: 'center' },
  bar: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.bg },
  save: {
    height: 56, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  saveText: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, color: colors.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  option: { height: 52, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.rule },
  optionText: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.ink },
});
