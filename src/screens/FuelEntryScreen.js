import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,  } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import api, { errorMessage } from '../api/client';
import { Button, KLabel, Loading } from '../components/ui';
import { colors, fonts, formatDate } from '../theme';
import { useCurrency, useMoney } from '../hooks/useMoney';
import { useOnline } from '../context/ConnectivityContext';
import { enqueueEntry } from '../support/outbox';
import { isNetworkError } from '../support/net';
import { emit, EVENTS } from '../support/events';

const FUEL_TYPES = ['E92', 'E95', 'E98'];

function toServerDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

export default function FuelEntryScreen({ route, navigation }) {
  const money = useMoney();
  const ccy = useCurrency();
  const { online, refreshPending } = useOnline();
  const editing = route.params?.entry || null;

  const [carListId, setCarListId] = useState(null);
  const [fuelCategoryId, setFuelCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [rate, setRate] = useState(editing?.rate != null ? String(editing.rate) : '');
  const [amount, setAmount] = useState(editing?.amount != null ? String(editing.amount) : '');
  const [odometer, setOdometer] = useState(
    editing?.odometer != null ? String(editing.odometer) : '',
  );
  const [fuelType, setFuelType] = useState(editing?.fuel_type || 'E92');
  const [isFullTank, setIsFullTank] = useState(
    editing ? !!editing.is_full_tank : true,
  );
  const [notes, setNotes] = useState(editing?.notes || '');
  const [purchasedAt, setPurchasedAt] = useState(
    editing?.date ? new Date(editing.date) : new Date(),
  );
  const [dateMode, setDateMode] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit refill' : 'New refill' });
  }, [navigation, editing]);

  useEffect(() => {
    (async () => {
      try {
        const [listsRes, catsRes] = await Promise.all([
          api.get('/lists'),
          api.get('/categories'),
        ]);
        const car = (listsRes.data.data || []).find((l) => l.type === 'vehicle');
        const fuel = (catsRes.data.data || []).find((c) => /^fuel$/i.test(c.name));
        if (!car) setError('No Car list found. Create one in the admin panel.');
        setCarListId(car?.id || null);
        setFuelCategoryId(fuel?.id || null);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const liters = useMemo(() => {
    const r = Number(rate);
    const a = Number(amount);
    if (!r || r <= 0 || !a || a <= 0) return 0;
    return a / r;
  }, [rate, amount]);

  const save = async () => {
    if (!carListId) return setError('Car list not available.');
    const r = Number(rate);
    const a = Number(amount);
    if (!r || r <= 0) return setError('Enter the rate per litre.');
    if (!a || a <= 0) return setError('Enter the amount paid.');
    if (!odometer) return setError('Enter the odometer reading.');

    setSaving(true);
    setError('');
    const payload = {
      spending_list_id: carListId,
      category_id: fuelCategoryId,
      item_name: `Fuel · ${fuelType}`,
      amount: a,
      quantity: 1,
      unit: 'ltr',
      purchased_at: toServerDate(purchasedAt),
      notes: notes.trim() || null,
      fuel_liters: Number(liters.toFixed(2)),
      fuel_rate: r,
      odometer: parseInt(odometer, 10),
      fuel_type: fuelType,
      is_full_tank: isFullTank,
    };

    const queueOffline = async () => {
      await enqueueEntry(payload);
      await refreshPending();
      setSaving(false);
      Alert.alert('Saved offline', 'This refill is queued and will sync automatically when you’re back online.');
      navigation.goBack();
    };

    if (editing && !online) {
      setSaving(false);
      return setError("You're offline — editing a refill needs a connection.");
    }
    if (!editing && !online) {
      return queueOffline();
    }

    try {
      if (editing) {
        await api.put(`/entries/${editing.id}`, payload);
      } else {
        await api.post('/entries', payload);
      }
      emit(EVENTS.ENTRIES_CHANGED);
      navigation.goBack();
    } catch (e) {
      if (!editing && isNetworkError(e)) {
        return queueOffline();
      }
      setError(errorMessage(e, 'Could not save the refill.'));
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert('Delete refill', 'Remove this entry permanently?', [
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
      <View style={styles.row}>
        <View style={styles.col}>
          <KLabel>Rate ({ccy.symbol}/L)</KLabel>
          <TextInput
            value={rate}
            onChangeText={setRate}
            placeholder="0"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            style={styles.field}
          />
        </View>
        <View style={styles.col}>
          <KLabel>Amount paid ({ccy.symbol})</KLabel>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            style={styles.field}
          />
        </View>
      </View>

      {/* Computed liters */}
      <View style={styles.calcCard}>
        <Text style={styles.calcLabel}>That's</Text>
        <Text style={styles.calcValue}>{liters > 0 ? liters.toFixed(2) : '0.00'} L</Text>
        <Text style={styles.calcSub}>
          {liters > 0 ? `${money(Number(amount) || 0)} at ${money(Number(rate) || 0)}/L` : 'Enter rate and amount'}
        </Text>
      </View>

      <KLabel>Odometer (km)</KLabel>
      <TextInput
        value={odometer}
        onChangeText={setOdometer}
        placeholder="e.g. 71500"
        placeholderTextColor={colors.inkSoft}
        keyboardType="numeric"
        style={styles.field}
      />

      <KLabel>Fuel type</KLabel>
      <View style={styles.typeRow}>
        {FUEL_TYPES.map((t) => {
          const active = t === fuelType;
          return (
            <Pressable
              key={t}
              onPress={() => setFuelType(t)}
              style={[styles.typeCell, active && styles.typeCellActive]}
            >
              <Text style={[styles.typeText, active && styles.typeTextActive]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.checkRow} onPress={() => setIsFullTank((v) => !v)}>
        <View style={[styles.checkBox, isFullTank && styles.checkBoxOn]}>
          {isFullTank ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.checkTitle}>Full tank</Text>
          <Text style={styles.checkSub}>
            {isFullTank ? 'Tank filled to full' : 'Partial fill — does not anchor km/L calc'}
          </Text>
        </View>
      </Pressable>

      <View style={styles.row}>
        <View style={styles.col}>
          <KLabel>Date</KLabel>
          <Pressable style={styles.field} onPress={() => setDateMode('date')}>
            <Text style={styles.fieldText}>{formatDate(purchasedAt.toISOString())}</Text>
          </Pressable>
        </View>
        <View style={styles.col}>
          <KLabel>Time</KLabel>
          <Pressable style={styles.field} onPress={() => setDateMode('time')}>
            <Text style={styles.fieldText}>
              {formatDate(purchasedAt.toISOString(), true).split(', ')[1]}
            </Text>
          </Pressable>
        </View>
      </View>

      <KLabel>Remarks</KLabel>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional"
        placeholderTextColor={colors.inkSoft}
        multiline
        style={[styles.field, { minHeight: 60, textAlignVertical: 'top' }]}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={editing ? 'Save changes' : 'Save refill'}
        onPress={save}
        loading={saving}
        icon="checkmark"
        style={{ marginTop: 10 }}
      />
      {editing ? (
        <Button
          title="Delete refill"
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
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
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
    marginTop: 7,
  },
  fieldText: { fontSize: 15, fontFamily: fonts.sans, color: colors.ink },
  calcCard: {
    backgroundColor: colors.soft,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201,98,31,0.18)',
  },
  calcLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.4, color: colors.inkSoft, textTransform: 'uppercase' },
  calcValue: { fontFamily: fonts.serifMedium, fontSize: 38, color: colors.ink, marginTop: 4, letterSpacing: -1 },
  calcSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 14 },
  typeCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.rule,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  typeCellActive: { borderColor: colors.ink, backgroundColor: colors.soft },
  typeText: { fontFamily: fonts.monoMedium, fontSize: 14, color: colors.ink, letterSpacing: 1 },
  typeTextActive: { color: colors.accent },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.rule,
    marginBottom: 14,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.inkSoft,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkTitle: { fontFamily: fonts.sansMedium, fontSize: 14.5, color: colors.ink },
  checkSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  error: { color: colors.alarm, fontSize: 13, marginVertical: 10, fontFamily: fonts.sans },
});
