import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,  } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api, { errorMessage } from '../api/client';
import { Avatar, Button, CatChip, KLabel, Loading } from '../components/ui';
import { colors, fonts, formatDate } from '../theme';
import { useCurrency, useMoney } from '../hooks/useMoney';
import { useOnline } from '../context/ConnectivityContext';
import { enqueueEntry } from '../support/outbox';
import { isNetworkError } from '../support/net';
import { emit, EVENTS } from '../support/events';

function toServerDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

export default function AddEntryScreen({ route, navigation }) {
  const money = useMoney();
  const ccy = useCurrency();
  const { online, refreshPending } = useOnline();
  const editing = route.params?.entry || null;
  const presetListId = route.params?.listId || null;

  const [lists, setLists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Multiple list ids = split between them. Edit mode is single-list only.
  const [listIds, setListIds] = useState(() => {
    if (editing?.spending_list_id) return [editing.spending_list_id];
    if (presetListId) return [presetListId];
    return [];
  });
  const [categoryId, setCategoryId] = useState(editing?.category_id || null);
  const [itemName, setItemName] = useState(editing?.item_name || '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [quantity, setQuantity] = useState(editing ? String(editing.quantity) : '1');
  const [unit, setUnit] = useState(editing?.unit || '');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [purchasedAt, setPurchasedAt] = useState(
    editing?.purchased_at ? new Date(editing.purchased_at) : new Date(),
  );
  const [fuelLiters, setFuelLiters] = useState(
    editing?.fuel_liters != null ? String(editing.fuel_liters) : '',
  );
  const [fuelRate, setFuelRate] = useState(
    editing?.fuel_rate != null ? String(editing.fuel_rate) : '',
  );
  const [odometer, setOdometer] = useState(
    editing?.odometer != null ? String(editing.odometer) : '',
  );
  const [dateMode, setDateMode] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit Expense' : 'New Expense' });
  }, [navigation, editing]);

  useEffect(() => {
    (async () => {
      try {
        const [listsRes, catsRes] = await Promise.all([
          api.get('/lists'),
          api.get('/categories'),
        ]);
        setLists(listsRes.data.data || []);
        setCategories(catsRes.data.data || []);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const togglePerson = (id) => {
    // In edit mode, swap the list. In create mode, toggle for split.
    if (editing) {
      setListIds([id]);
      return;
    }
    setListIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const isVehicle = useMemo(
    () => lists.some((l) => listIds.includes(l.id) && l.type === 'vehicle'),
    [lists, listIds],
  );
  const splitShare = useMemo(() => {
    const a = Number(amount);
    if (!a || listIds.length < 2) return 0;
    return Math.round((a / listIds.length) * 100) / 100;
  }, [amount, listIds]);

  const save = async () => {
    if (listIds.length === 0) return setError('Choose whose expense this is.');
    if (!itemName.trim()) return setError('Add a short note for the expense.');
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      return setError('Enter a valid amount.');
    }

    setSaving(true);
    setError('');
    const base = {
      category_id: categoryId,
      item_name: itemName.trim(),
      amount: Number(amount),
      quantity: quantity ? Number(quantity) : 1,
      unit: unit.trim() || null,
      purchased_at: toServerDate(purchasedAt),
      notes: notes.trim() || null,
      fuel_liters: isVehicle && fuelLiters ? Number(fuelLiters) : null,
      fuel_rate: isVehicle && fuelRate ? Number(fuelRate) : null,
      odometer: isVehicle && odometer ? Number(odometer) : null,
    };
    // Split mode divides evenly across the chosen lists (server-side).
    const createPayload = listIds.length > 1
      ? { ...base, spending_list_ids: listIds }
      : { ...base, spending_list_id: listIds[0] };

    const queueOffline = async () => {
      await enqueueEntry(createPayload);
      await refreshPending();
      setSaving(false);
      Alert.alert('Saved offline', 'This expense is queued and will sync automatically when you’re back online.');
      navigation.goBack();
    };

    // Editing needs the record to exist server-side — not available offline.
    if (editing && !online) {
      setSaving(false);
      return setError("You're offline — editing an expense needs a connection.");
    }
    if (!editing && !online) {
      return queueOffline();
    }

    try {
      if (editing) {
        await api.put(`/entries/${editing.id}`, { ...base, spending_list_id: listIds[0] });
      } else {
        await api.post('/entries', createPayload);
      }
      emit(EVENTS.ENTRIES_CHANGED);
      navigation.goBack();
    } catch (e) {
      // Lost the connection mid-save while creating? Queue instead of failing.
      if (!editing && isNetworkError(e)) {
        return queueOffline();
      }
      setError(errorMessage(e, 'Could not save the expense.'));
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert('Delete expense', 'Remove this entry permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/entries/${editing.id}`);
            emit(EVENTS.ENTRIES_CHANGED);
            navigation.goBack();
          } catch (e) {
            setError(errorMessage(e));
          }
        },
      },
    ]);
  };

  if (loading) {
    return <Loading label="Loading…" />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {/* Big amount */}
      <KLabel>Amount</KLabel>
      <View style={styles.amountRow}>
        <Text style={styles.rs}>{ccy.symbol}</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          placeholderTextColor={colors.rule}
          keyboardType="numeric"
          style={styles.amountInput}
        />
      </View>
      <View style={styles.amountRule} />

      {/* Whose expense — multi-select for splits */}
      <View style={styles.qLabelRow}>
        <Text style={styles.qLabel}>{editing ? 'Whose expense?' : 'Whose expense? (tap multiple to split)'}</Text>
        {!editing && listIds.length > 1 ? (
          <View style={styles.splitBadge}>
            <Text style={styles.splitBadgeText}>{listIds.length}-WAY SPLIT</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.grid}>
        {lists.map((l) => {
          const active = listIds.includes(l.id);
          return (
            <Pressable
              key={l.id}
              onPress={() => togglePerson(l.id)}
              style={[styles.personCell, active && styles.cellActive]}
            >
              <Avatar name={l.name} type={l.type} size={32} />
              <Text style={styles.cellLabel} numberOfLines={1}>{l.name}</Text>
            </Pressable>
          );
        })}
      </View>
      {!editing && listIds.length > 1 && splitShare > 0 ? (
        <Text style={styles.splitHint}>
          Each pays {money(splitShare)} · total {money(Number(amount) || 0)}
        </Text>
      ) : null}
      {editing && editing.split_group_id ? (
        <Text style={styles.splitHint}>
          This entry is part of an earlier split — editing it only changes this share.
        </Text>
      ) : null}

      {/* Category */}
      <Text style={styles.qLabel}>Category</Text>
      <View style={styles.grid}>
        {categories.map((c) => {
          const active = c.id === categoryId;
          return (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(active ? null : c.id)}
              style={[styles.catCell, active && styles.cellActive]}
            >
              <CatChip name={c.name} size={28} />
              <Text style={styles.catLabel} numberOfLines={1}>{c.name.split(' ')[0]}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Note */}
      <Text style={styles.qLabel}>What was it?</Text>
      <TextInput
        value={itemName}
        onChangeText={setItemName}
        placeholder="e.g. Sunday sabzi mandi"
        placeholderTextColor={colors.inkSoft}
        style={styles.field}
      />

      {/* Date */}
      <View style={styles.dateRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.qLabel}>Date</Text>
          <Pressable style={styles.field} onPress={() => setDateMode('date')}>
            <Text style={styles.fieldText}>{formatDate(purchasedAt.toISOString())}</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.qLabel}>Time</Text>
          <Pressable style={styles.field} onPress={() => setDateMode('time')}>
            <Text style={styles.fieldText}>
              {formatDate(purchasedAt.toISOString(), true).split(', ')[1]}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Quantity / unit */}
      <View style={styles.dateRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.qLabel}>Quantity</Text>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            placeholder="1"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            style={styles.field}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.qLabel}>Unit</Text>
          <TextInput
            value={unit}
            onChangeText={setUnit}
            placeholder="kg, ltr, pcs"
            placeholderTextColor={colors.inkSoft}
            style={styles.field}
          />
        </View>
      </View>

      {/* Fuel — only for the Car / vehicle list */}
      {isVehicle ? (
        <View style={styles.fuelBox}>
          <Text style={styles.fuelTitle}>Fuel details</Text>
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.qLabel}>Litres</Text>
              <TextInput
                value={fuelLiters}
                onChangeText={setFuelLiters}
                placeholder="0"
                placeholderTextColor={colors.inkSoft}
                keyboardType="numeric"
                style={styles.field}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.qLabel}>Rate/L</Text>
              <TextInput
                value={fuelRate}
                onChangeText={setFuelRate}
                placeholder="0"
                placeholderTextColor={colors.inkSoft}
                keyboardType="numeric"
                style={styles.field}
              />
            </View>
          </View>
          <Text style={styles.qLabel}>Odometer (km)</Text>
          <TextInput
            value={odometer}
            onChangeText={setOdometer}
            placeholder="0"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            style={styles.field}
          />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={editing ? 'Save changes' : listIds.length > 1 ? `Split between ${listIds.length}` : 'Save expense'}
        onPress={save}
        loading={saving}
        icon="checkmark"
        style={{ marginTop: 8 }}
      />
      {editing ? (
        <Button
          title="Delete expense"
          onPress={remove}
          variant="outline"
          icon="trash-outline"
          style={{ marginTop: 10 }}
        />
      ) : null}

      {dateMode ? (
        <DateTimePicker
          value={purchasedAt}
          mode={dateMode}
          is24Hour={false}
          onChange={(event, selected) => {
            setDateMode(null);
            if (event.type === 'set' && selected) setPurchasedAt(selected);
          }}
        />
      ) : null}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 20, paddingBottom: 44 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  rs: { fontFamily: fonts.serif, fontSize: 30, color: colors.inkSoft },
  amountInput: {
    flex: 1,
    fontFamily: fonts.serifMedium,
    fontSize: 52,
    color: colors.ink,
    padding: 0,
    letterSpacing: -1.5,
  },
  amountRule: { height: 1, backgroundColor: colors.rule, marginTop: 4, marginBottom: 22 },
  qLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.inkSoft,
    marginBottom: 8,
    marginTop: 4,
  },
  qLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  splitBadge: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  splitBadgeText: { fontFamily: fonts.monoMedium, fontSize: 9.5, color: colors.white, letterSpacing: 1 },
  splitHint: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.accent,
    marginTop: -6,
    marginBottom: 14,
    textAlign: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3, marginBottom: 14 },
  personCell: {
    width: '25%',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catCell: {
    width: '20%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cellActive: { borderColor: colors.ink, backgroundColor: colors.soft },
  cellLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.ink },
  catLabel: { fontFamily: fonts.sans, fontSize: 9.5, color: colors.ink },
  field: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.sans,
    color: colors.ink,
    marginBottom: 14,
  },
  fieldText: { fontSize: 15, fontFamily: fonts.sans, color: colors.ink },
  dateRow: { flexDirection: 'row', gap: 12 },
  fuelBox: {
    backgroundColor: '#fbeee0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(201,98,31,0.25)',
  },
  fuelTitle: {
    fontFamily: fonts.serifMediumItalic,
    fontSize: 16,
    color: colors.accent,
    marginBottom: 8,
  },
  error: { color: colors.alarm, fontSize: 13, marginBottom: 12, fontFamily: fonts.sans },
});
