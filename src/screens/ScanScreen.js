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
import api, { API_BASE_URL, errorMessage } from '../api/client';
import { AppHeader } from '../components/Header';
import { Avatar, Button, Card, Loading, PickerModal } from '../components/ui';
import { colors, fonts, money, personColor } from '../theme';

const TYPE_LABEL = {
  grocery: 'Grocery',
  fuel: 'Fuel / Petrol',
  pharmacy: 'Pharmacy',
  other: 'Receipt',
};

export default function ScanScreen() {
  const [phase, setPhase] = useState('idle'); // idle | uploading | review | done
  const [lists, setLists] = useState([]);
  const [scan, setScan] = useState(null);
  const [items, setItems] = useState([]);
  const [preview, setPreview] = useState(null);
  const [picker, setPicker] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/lists').then((res) => setLists(res.data.data || [])).catch(() => {});
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
      setError(`Permission to use the ${fromCamera ? 'camera' : 'gallery'} was denied.`);
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

    // Multipart uploads via axios are unreliable on RN's new architecture
    // (often throwing "Network Error" before the request is even sent), so
    // use the native fetch path which handles FormData properly.
    const form = new FormData();
    const uri = asset.uri;
    const name = asset.fileName || (uri && uri.split('/').pop()) || 'receipt.jpg';
    const type = asset.mimeType || (name.match(/\.png$/i) ? 'image/png' : 'image/jpeg');
    form.append('image', { uri, name, type });

    const token = api.defaults.headers.common.Authorization;

    try {
      const response = await fetch(`${API_BASE_URL}/api/receipts/scan`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: token } : {}),
        },
        body: form,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const msg = (data && data.message)
          || `Server returned ${response.status}${response.statusText ? ` ${response.statusText}` : ''}.`;
        throw new Error(msg);
      }

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
      // Surface the actual error so it's debuggable from the device.
      setError(e?.message || errorMessage(e, 'Could not read the receipt.'));
      setPhase('idle');
    }
  };

  const setItemList = (index, listId) => {
    if (index === 'all') {
      setItems((prev) => prev.map((it) => ({ ...it, spending_list_id: listId })));
    } else {
      setItems((prev) => prev.map((it, i) => (i === index ? { ...it, spending_list_id: listId } : it)));
    }
  };

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const confirm = async () => {
    for (const it of items) {
      if (!it.spending_list_id) return setError('Every item needs a list.');
      if (!it.item_name.trim()) return setError('Every item needs a name.');
      if (!it.amount || Number.isNaN(Number(it.amount))) return setError('Every item needs an amount.');
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

  const listOptions = lists.map((l) => ({
    value: l.id,
    label: l.name,
    swatch: personColor(l.name).bg,
  }));

  return (
    <View style={styles.screen}>
      <AppHeader title="Scan" />

      {phase === 'uploading' ? (
        <View style={styles.center}>
          {preview ? <Image source={{ uri: preview }} style={styles.uploadPreview} /> : null}
          <Loading label="Reading the receipt with AI…" />
        </View>
      ) : phase === 'done' ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={70} color={colors.accent2} />
          <Text style={styles.doneTitle}>
            {savedCount} {savedCount === 1 ? 'expense' : 'expenses'} saved
          </Text>
          <Text style={styles.doneSub}>The receipt was split into entries.</Text>
          <Button title="Scan another" onPress={reset} icon="scan" style={styles.doneBtn} />
        </View>
      ) : phase === 'review' ? (
        <ScrollView contentContainerStyle={styles.body}>
          <Card style={styles.receiptCard}>
            <View style={styles.receiptRow}>
              {preview ? <Image source={{ uri: preview }} style={styles.thumb} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.merchant}>{scan.receipt.merchant || 'Unknown shop'}</Text>
                <Text style={styles.receiptMeta}>
                  {TYPE_LABEL[scan.receipt.receipt_type] || 'Receipt'}
                  {scan.receipt.total ? ` · ${money(scan.receipt.total)}` : ''}
                </Text>
              </View>
            </View>
            {scan.is_fuel ? (
              <View style={styles.fuelBanner}>
                <Ionicons name="car-sport" size={15} color={colors.accent} />
                <Text style={styles.fuelBannerText}>Petrol receipt — assigned to the Car list.</Text>
              </View>
            ) : null}
          </Card>

          <View style={styles.assignRow}>
            <Text style={styles.kLabel}>
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
                  placeholderTextColor={colors.inkSoft}
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
                      placeholderTextColor={colors.inkSoft}
                    />
                  </View>
                  <Pressable style={styles.listChip} onPress={() => setPicker(index)}>
                    {list ? <Avatar name={list.name} type={list.type} size={20} /> : null}
                    <Text style={styles.listChipText} numberOfLines={1}>
                      {list ? list.name : 'Pick list'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={colors.inkSoft} />
                  </Pressable>
                </View>
              </Card>
            );
          })}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Save all expenses" onPress={confirm} loading={confirming} icon="checkmark" />
          <Button title="Cancel" variant="outline" onPress={reset} style={{ marginTop: 10 }} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.idle}>
          <View style={styles.idleIcon}>
            <Ionicons name="scan" size={40} color={colors.accent} />
          </View>
          <Text style={styles.idleTitle}>Scan a receipt</Text>
          <Text style={styles.idleText}>
            Photograph a shop receipt, grocery bill or petrol slip. The AI reads each item so you
            can assign it to a person. Petrol receipts go to the Car list automatically.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Take photo" icon="camera" onPress={() => pickImage(true)} />
          <Button
            title="Choose from gallery"
            variant="outline"
            icon="images"
            onPress={() => pickImage(false)}
            style={{ marginTop: 12 }}
          />
        </ScrollView>
      )}

      <PickerModal
        visible={picker !== null}
        title={picker === 'all' ? 'Assign all items to' : 'Assign item to'}
        options={listOptions}
        onSelect={(listId) => setItemList(picker, listId)}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  idle: { padding: 24 },
  idleIcon: {
    width: 86,
    height: 86,
    borderRadius: 24,
    backgroundColor: colors.soft,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  idleTitle: {
    fontFamily: fonts.serifMediumItalic,
    fontSize: 24,
    color: colors.ink,
    textAlign: 'center',
    marginTop: 16,
  },
  idleText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 21,
    marginVertical: 16,
  },
  uploadPreview: { width: 116, height: 156, borderRadius: 12, marginBottom: 20 },
  receiptCard: { padding: 14, marginBottom: 12 },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: colors.rule },
  merchant: { fontFamily: fonts.serifMedium, fontSize: 17, color: colors.ink },
  receiptMeta: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  fuelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fbeee0',
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
  },
  fuelBannerText: { fontSize: 12, color: colors.accent, fontFamily: fonts.sans, flex: 1 },
  assignRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  kLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  assignAll: { fontFamily: fonts.sansSemibold, fontSize: 13, color: colors.accent },
  itemCard: { padding: 12, marginBottom: 10 },
  itemName: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  itemBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  rs: { fontFamily: fonts.mono, fontSize: 13, color: colors.inkSoft, fontWeight: '700' },
  amountInput: {
    fontFamily: fonts.monoMedium,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 8,
    minWidth: 64,
    marginLeft: 4,
  },
  listChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  listChipText: { flex: 1, fontSize: 13.5, color: colors.ink, fontFamily: fonts.sansMedium },
  error: { color: colors.alarm, fontSize: 13, marginBottom: 12, fontFamily: fonts.sans, textAlign: 'center' },
  doneTitle: {
    fontFamily: fonts.serifMediumItalic,
    fontSize: 24,
    color: colors.ink,
    marginTop: 14,
  },
  doneSub: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSoft, marginTop: 4 },
  doneBtn: { marginTop: 22, paddingHorizontal: 34 },
});
