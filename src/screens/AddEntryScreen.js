import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api, { errorMessage } from '../api/client';
import { Button, Loading, PickerModal, SelectField, TextField } from '../components/ui';
import { colors, formatDate, listIcon } from '../theme';

/** Format a JS Date as "YYYY-MM-DD HH:MM:SS" for the API. */
function toServerDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

export default function AddEntryScreen({ route, navigation }) {
  const editing = route.params?.entry || null;
  const presetListId = route.params?.listId || null;

  const [lists, setLists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [listId, setListId] = useState(editing?.spending_list_id || presetListId || null);
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

  const [picker, setPicker] = useState(null); // 'list' | 'category'
  const [dateMode, setDateMode] = useState(null); // 'date' | 'time'

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit Item' : 'Add Item' });
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

  const selectedList = useMemo(() => lists.find((l) => l.id === listId), [lists, listId]);
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );
  const isVehicle = selectedList?.type === 'vehicle';

  const save = async () => {
    if (!listId) return setError('Please choose a list.');
    if (!itemName.trim()) return setError('Please enter an item name.');
    if (!amount || Number.isNaN(Number(amount))) return setError('Please enter a valid amount.');

    setSaving(true);
    setError('');

    const payload = {
      spending_list_id: listId,
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

    try {
      if (editing) {
        await api.put(`/entries/${editing.id}`, payload);
      } else {
        await api.post('/entries', payload);
      }
      navigation.goBack();
    } catch (e) {
      setError(errorMessage(e, 'Could not save the item.'));
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert('Delete item', 'Remove this entry permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/entries/${editing.id}`);
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SelectField
        label="List *"
        placeholder="Choose a person, Home or Car"
        valueLabel={selectedList?.name}
        color={selectedList?.color}
        onPress={() => setPicker('list')}
      />

      <TextField
        label="Item name *"
        value={itemName}
        onChangeText={setItemName}
        placeholder="e.g. Milk, Rice, Petrol"
      />

      <TextField
        label="Amount (Rs) *"
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
        keyboardType="numeric"
      />

      <View style={styles.row}>
        <TextField
          label="Quantity"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="1"
          keyboardType="numeric"
          style={styles.rowItem}
        />
        <TextField
          label="Unit"
          value={unit}
          onChangeText={setUnit}
          placeholder="kg, ltr, pcs"
          style={styles.rowItem}
        />
      </View>

      <SelectField
        label="Category"
        placeholder="No category"
        valueLabel={selectedCategory?.name}
        color={selectedCategory?.color}
        onPress={() => setPicker('category')}
      />

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <Text style={styles.label}>Date</Text>
          <Pressable style={styles.dateBox} onPress={() => setDateMode('date')}>
            <Text style={styles.dateText}>{formatDate(purchasedAt.toISOString())}</Text>
          </Pressable>
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.label}>Time</Text>
          <Pressable style={styles.dateBox} onPress={() => setDateMode('time')}>
            <Text style={styles.dateText}>
              {formatDate(purchasedAt.toISOString(), true).split(', ')[1]}
            </Text>
          </Pressable>
        </View>
      </View>

      {isVehicle ? (
        <View style={styles.fuelBox}>
          <Text style={styles.fuelTitle}>Fuel details (optional)</Text>
          <View style={styles.row}>
            <TextField
              label="Litres"
              value={fuelLiters}
              onChangeText={setFuelLiters}
              placeholder="0"
              keyboardType="numeric"
              style={styles.rowItem}
            />
            <TextField
              label="Rate (Rs/L)"
              value={fuelRate}
              onChangeText={setFuelRate}
              placeholder="0"
              keyboardType="numeric"
              style={styles.rowItem}
            />
          </View>
          <TextField
            label="Odometer (km)"
            value={odometer}
            onChangeText={setOdometer}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
      ) : null}

      <TextField
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional"
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={editing ? 'Save Changes' : 'Add Item'}
        onPress={save}
        loading={saving}
        icon="checkmark"
      />

      {editing ? (
        <Button
          title="Delete Item"
          onPress={remove}
          variant="danger"
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

      <PickerModal
        visible={picker === 'list'}
        title="Choose a list"
        options={lists.map((l) => ({
          value: l.id,
          label: l.name,
          color: l.color,
          icon: listIcon(l.type),
        }))}
        onSelect={setListId}
        onClose={() => setPicker(null)}
      />

      <PickerModal
        visible={picker === 'category'}
        title="Choose a category"
        options={[
          { value: null, label: 'No category' },
          ...categories.map((c) => ({ value: c.id, label: c.name, color: c.color })),
        ]}
        onSelect={setCategoryId}
        onClose={() => setPicker(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  row: { flexDirection: 'row', marginHorizontal: -6 },
  rowItem: { flex: 1, marginHorizontal: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  dateBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
    marginBottom: 14,
  },
  dateText: { fontSize: 15, color: colors.text },
  fuelBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  fuelTitle: { fontSize: 13, fontWeight: '700', color: colors.danger, marginBottom: 8 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
});
