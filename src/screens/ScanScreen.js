import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api, { errorMessage } from '../api/client';
import { Button, Card, Loading, PickerModal } from '../components/ui';
import { colors, listIcon, money } from '../theme';

const TYPE_LABEL = {
  grocery: 'Grocery',
  fuel: 'Fuel / Petrol',
  pharmacy: 'Pharmacy',
  other: 'Other',
};

export default function ScanScreen() {
  const [phase, setPhase] = useState('idle'); // idle | uploading | review | done
  const [lists, setLists] = useState([]);
  const [scan, setScan] = useState(null);
  const [items, setItems] = useState([]);
  const [preview, setPreview] = useState(null);
  const [picker, setPicker] = useState(null); // null | number (item index) | 'all'
  const [confirming, setConfirming] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/lists')
      .then((res) => setLists(res.data.data || []))
      .catch(() => {});
  }, []);

  const listById = (id) => lists.find((l) => l.id === id);

  const reset = () => {
    setPhase('idle');
    setScan(null);
    setItems([]);
    setPreview(null);
    setError('');
  };

  const pickImage = async (fromCamera) => {
    setError('');
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Permission to use the ' + (fromCamera ? 'camera' : 'gallery') + ' was denied.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });

    if (result.canceled || !result.assets?.length) return;
    await upload(result.assets[0]);
  };

  const upload = async (asset) => {
    setPhase('uploading');
    setPreview(asset.uri);
    setError('');

    const form = new FormData();
    form.append('image', {
      uri: asset.uri,
      name: asset.fileName || 'receipt.jpg',
      type: asset.mimeType || 'image/jpeg',
    });

    try {
      const res = await api.post('/receipts/scan', form);
      const data = res.data;
      setScan(data);
      setItems(
        (data.items || []).map((it) => ({
          item_name: it.item_name || '',
          amount: String(it.amount ?? ''),
          quantity: it.quantity ?? 1,
          unit: it.unit || null,
          category_id: it.category_id || null,
          spending_list_id: it.suggested_list_id || data.default_list_id || null,
        })),
      );
      setPhase('review');
    } catch (e) {
      setError(errorMessage(e, 'Could not read the receipt.'));
      setPhase('idle');
    }
  };

  const setItemList = (index, listId) => {
    if (index === 'all') {
      setItems((prev) => prev.map((it) => ({ ...it, spending_list_id: listId })));
    } else {
      setItems((prev) =>
        prev.map((it, i) => (i === index ? { ...it, spending_list_id: listId } : it)),
      );
    }
  };

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const confirm = async () => {
    for (const it of items) {
      if (!it.spending_list_id) return setError('Every item needs a list.');
      if (!it.item_name.trim()) return setError('Every item needs a name.');
      if (!it.amount || Number.isNaN(Number(it.amount))) {
        return setError('Every item needs a valid amount.');
      }
    }
    setConfirming(true);
    setError('');
    try {
      const res = await api.post(`/receipts/${scan.receipt.id}/confirm`, {
        items: items.map((it) => ({
          spending_list_id: it.spending_list_id,
          category_id: it.category_id,
          item_name: it.item_name.trim(),
          amount: Number(it.amount),
          quantity: Number(it.quantity) || 1,
          unit: it.unit,
        })),
      });
      setSavedCount(res.data.count || items.length);
      setPhase('done');
    } catch (e) {
      setError(errorMessage(e, 'Could not save the items.'));
    } finally {
      setConfirming(false);
    }
  };

  // ----- Render -----

  if (phase === 'uploading') {
    return (
      <View style={styles.center}>
        {preview ? <Image source={{ uri: preview }} style={styles.uploadPreview} /> : null}
        <Loading label="Reading the receipt with AI…" />
      </View>
    );
  }

  if (phase === 'done') {
    return (
      <View style={styles.center}>
        <Ionicons name="checkmark-circle" size={72} color={colors.success} />
        <Text style={styles.doneTitle}>
          {savedCount} {savedCount === 1 ? 'item' : 'items'} saved
        </Text>
        <Text style={styles.doneSub}>The receipt has been split into entries.</Text>
        <Button title="Scan Another" onPress={reset} icon="scan" style={{ marginTop: 20, paddingHorizontal: 32 }} />
      </View>
    );
  }

  if (phase === 'review') {
    const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Card style={styles.receiptCard}>
          <View style={styles.receiptRow}>
            {preview ? <Image source={{ uri: preview }} style={styles.thumb} /> : null}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.merchant}>{scan.receipt.merchant || 'Unknown shop'}</Text>
              <Text style={styles.receiptMeta}>
                {TYPE_LABEL[scan.receipt.receipt_type] || 'Receipt'}
                {scan.receipt.total ? ` · ${money(scan.receipt.total)}` : ''}
              </Text>
            </View>
          </View>
          {scan.is_fuel ? (
            <View style={styles.fuelBanner}>
              <Ionicons name="car-sport" size={16} color={colors.danger} />
              <Text style={styles.fuelBannerText}>
                Petrol receipt — automatically assigned to the Car list.
              </Text>
            </View>
          ) : null}
        </Card>

        <View style={styles.assignAllRow}>
          <Text style={styles.sectionTitle}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>
          <Pressable onPress={() => setPicker('all')} hitSlop={8}>
            <Text style={styles.assignAll}>Assign all →</Text>
          </Pressable>
        </View>

        {items.map((it, index) => {
          const list = listById(it.spending_list_id);
          return (
            <Card key={index} style={styles.itemCard}>
              <TextInput
                value={it.item_name}
                onChangeText={(v) => updateItem(index, 'item_name', v)}
                style={styles.itemName}
                placeholder="Item name"
                placeholderTextColor={colors.muted}
              />
              <View style={styles.itemBottom}>
                <View style={styles.amountWrap}>
                  <Text style={styles.rs}>Rs</Text>
                  <TextInput
                    value={it.amount}
                    onChangeText={(v) => updateItem(index, 'amount', v)}
                    style={styles.amountInput}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                  />
                </View>
                <Pressable style={styles.listChip} onPress={() => setPicker(index)}>
                  <View style={[styles.dot, { backgroundColor: list?.color || colors.border }]} />
                  <Text style={styles.listChipText} numberOfLines={1}>
                    {list?.name || 'Pick list'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={colors.muted} />
                </Pressable>
              </View>
            </Card>
          );
        })}

        <Text style={styles.totalLine}>Total: {money(total)}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title="Save All Items"
          onPress={confirm}
          loading={confirming}
          icon="checkmark"
        />
        <Button title="Cancel" variant="outline" onPress={reset} style={{ marginTop: 10 }} />

        <PickerModal
          visible={picker !== null}
          title={picker === 'all' ? 'Assign all items to' : 'Assign item to'}
          options={lists.map((l) => ({
            value: l.id,
            label: l.name,
            color: l.color,
            icon: listIcon(l.type),
          }))}
          onSelect={(listId) => setItemList(picker, listId)}
          onClose={() => setPicker(null)}
        />
      </ScrollView>
    );
  }

  // idle
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.idle}>
      <View style={styles.idleIcon}>
        <Ionicons name="scan" size={44} color={colors.primary} />
      </View>
      <Text style={styles.idleTitle}>Scan a Receipt or Bill</Text>
      <Text style={styles.idleText}>
        Take a photo of a shop receipt, grocery bill or petrol slip. The AI reads the items so you
        can assign each one to a person, Home or Car. Petrol receipts go to the Car list
        automatically.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Take Photo" icon="camera" onPress={() => pickImage(true)} />
      <Button
        title="Choose from Gallery"
        variant="outline"
        icon="images"
        onPress={() => pickImage(false)}
        style={{ marginTop: 12 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  idle: { padding: 24, alignItems: 'stretch' },
  idleIcon: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: '#e0e7ff',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  idleTitle: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 16 },
  idleText: { fontSize: 14, color: colors.muted, textAlign: 'center', marginVertical: 16, lineHeight: 20 },
  uploadPreview: { width: 120, height: 160, borderRadius: 10, marginBottom: 20 },
  receiptCard: { padding: 14 },
  receiptRow: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: colors.border },
  merchant: { fontSize: 16, fontWeight: '700', color: colors.text },
  receiptMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  fuelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
  },
  fuelBannerText: { fontSize: 12, color: colors.danger, marginLeft: 6, flex: 1 },
  assignAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.muted },
  assignAll: { fontSize: 13, fontWeight: '700', color: colors.primary },
  itemCard: { padding: 12 },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  rs: { fontSize: 13, color: colors.muted, fontWeight: '700' },
  amountInput: { fontSize: 15, fontWeight: '700', color: colors.text, paddingVertical: 8, minWidth: 70, marginLeft: 4 },
  listChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  listChipText: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '600' },
  totalLine: { fontSize: 15, fontWeight: '800', color: colors.text, textAlign: 'right', marginVertical: 12 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  doneTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 14 },
  doneSub: { fontSize: 14, color: colors.muted, marginTop: 4, textAlign: 'center' },
});
