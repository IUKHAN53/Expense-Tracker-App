import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,  } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import api, { API_BASE_URL, errorMessage } from '../api/client';
import { cachedGet } from '../support/cachedApi';
import { AppHeader } from '../components/Header';
import { Avatar, Button, Card, Loading, PickerModal } from '../components/ui';
import { colors, fonts, personColor } from '../theme';
import { useMoney } from '../hooks/useMoney';
import { useAuth } from '../context/AuthContext';
import { useOnline } from '../context/ConnectivityContext';
import { CURRENCIES, currencyMeta, money as fmtMoney } from '../support/currency';
import { fetchRate } from '../support/fx';
import { saveToGallery } from '../support/gallery';
import { emit, EVENTS } from '../support/events';

const TYPE_LABEL = {
  grocery: 'Grocery',
  fuel: 'Fuel / Petrol',
  pharmacy: 'Pharmacy',
  other: 'Receipt',
};

export default function ScanScreen() {
  const money = useMoney();
  const { user } = useAuth();
  const { online } = useOnline();
  const baseCcy = user?.account?.currency || 'USD';

  const [phase, setPhase] = useState('idle'); // idle | uploading | review | done
  const [lists, setLists] = useState([]);
  const [scan, setScan] = useState(null);
  const [items, setItems] = useState([]);
  const [preview, setPreview] = useState(null);
  const [picker, setPicker] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState('');

  // Receipt currency + conversion. Defaults to the household's base currency
  // (rate 1, no conversion). When the receipt is in another currency we fetch
  // a live rate the user can override, and convert amounts on save so the
  // ledger always stores base-currency values.
  const [receiptCcy, setReceiptCcy] = useState(baseCcy);
  const [rate, setRate] = useState('1');
  const [rateBusy, setRateBusy] = useState(false);
  const [ccyPicker, setCcyPicker] = useState(false);

  const converting = receiptCcy !== baseCcy;
  const rateNum = Number(rate) || 0;

  // Load the spending lists (for the "Assign to" picker). Cached + refetched
  // on every focus so the picker is never silently empty after a transient
  // failure or when returning to the tab.
  const loadLists = useCallback(async () => {
    try {
      const data = await cachedGet('lists', '/lists');
      if (Array.isArray(data?.data)) setLists(data.data);
    } catch {
      // keep whatever we had; the picker shows a hint when empty
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLists();
    }, [loadLists]),
  );

  const listById = (id) => lists.find((l) => l.id === id);

  const changeCurrency = async (code) => {
    setReceiptCcy(code);
    setError('');
    if (code === baseCcy) {
      setRate('1');
      return;
    }
    setRateBusy(true);
    try {
      const r = await fetchRate(code, baseCcy);
      setRate(String(Number(r.toFixed(6))));
    } catch {
      // Network/lookup failed — leave the rate for the user to type in.
      setRate('');
      setError(`Couldn't fetch the ${code}→${baseCcy} rate. Enter it manually below.`);
    } finally {
      setRateBusy(false);
    }
  };

  const reset = () => {
    setPhase('idle');
    setScan(null);
    setItems([]);
    setPreview(null);
    setError('');
    setReceiptCcy(baseCcy);
    setRate('1');
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

  // Offline helper: capture a receipt photo and keep it in the gallery so it
  // can be imported and scanned once a connection is available.
  const savePhotoForLater = async () => {
    setError('');
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Permission to use the camera was denied.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (result.canceled || !result.assets?.length) return;
    try {
      const saved = await saveToGallery(result.assets[0].uri);
      if (saved) {
        Alert.alert('Saved to gallery', 'Import this receipt from your gallery to scan it once you’re back online.');
      } else {
        setError('Permission to save to your gallery was denied.');
      }
    } catch {
      setError('Could not save the photo to your gallery.');
    }
  };

  const upload = async (asset) => {
    setPhase('uploading');
    setPreview(asset.uri);
    setError('');

    // RN's JS FormData / multipart layer is brittle on the new architecture
    // (axios throws "Network Error"; fetch throws "Unsupported FormDataPart").
    // expo-file-system's uploadAsync builds the multipart body natively and
    // sidesteps the whole issue.
    const token = api.defaults.headers.common.Authorization;

    try {
      const result = await FileSystem.uploadAsync(
        `${API_BASE_URL}/api/receipts/scan`,
        asset.uri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'image',
          mimeType: asset.mimeType || 'image/jpeg',
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: token } : {}),
          },
        },
      );

      let data = null;
      try { data = JSON.parse(result.body); } catch {}

      if (result.status < 200 || result.status >= 300) {
        throw new Error(
          (data && data.message)
            || `Server returned ${result.status}.`,
        );
      }
      if (! data) {
        throw new Error('Server returned an unexpected response.');
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
    if (converting && (!rateNum || rateNum <= 0)) {
      return setError(`Enter a valid ${receiptCcy} → ${baseCcy} rate.`);
    }
    setConfirming(true);
    setError('');
    try {
      // Send the ORIGINAL (receipt-currency) amounts plus the currency + rate;
      // the server converts to the base currency and stores both.
      const res = await api.post(`/receipts/${scan.receipt.id}/confirm`, {
        currency: receiptCcy,
        fx_rate: converting ? rateNum : 1,
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
      emit(EVENTS.ENTRIES_CHANGED);
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
          {preview ? (
            <Button
              title="Save photo to gallery"
              variant="outline"
              icon="images"
              style={{ marginTop: 12 }}
              onPress={async () => {
                try {
                  const ok = await saveToGallery(preview);
                  Alert.alert(
                    ok ? 'Saved to gallery' : 'Permission denied',
                    ok ? 'A copy of this receipt is now in your gallery.' : 'Could not save to your gallery.',
                  );
                } catch {
                  Alert.alert('Error', 'Could not save the photo.');
                }
              }}
            />
          ) : null}
        </View>
      ) : phase === 'review' ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
        >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Card style={styles.receiptCard}>
            <View style={styles.receiptRow}>
              {preview ? <Image source={{ uri: preview }} style={styles.thumb} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.merchant}>{scan.receipt.merchant || 'Unknown shop'}</Text>
                <Text style={styles.receiptMeta}>
                  {TYPE_LABEL[scan.receipt.receipt_type] || 'Receipt'}
                  {scan.receipt.total ? ` · ${fmtMoney(scan.receipt.total, receiptCcy)}` : ''}
                </Text>
              </View>
            </View>

            <View style={styles.ccyRow}>
              <Text style={styles.ccyLabel}>Receipt currency</Text>
              <Pressable style={styles.ccyChip} onPress={() => setCcyPicker(true)} hitSlop={6}>
                <Text style={styles.ccyChipText}>{receiptCcy}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.inkSoft} />
              </Pressable>
            </View>

            {converting ? (
              <View style={styles.rateRow}>
                <Text style={styles.rateLead}>1 {receiptCcy} =</Text>
                {rateBusy ? (
                  <Text style={styles.rateBusy}>fetching…</Text>
                ) : (
                  <TextInput
                    value={rate}
                    onChangeText={setRate}
                    style={styles.rateInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.inkSoft}
                  />
                )}
                <Text style={styles.rateLead}>{baseCcy}</Text>
              </View>
            ) : null}

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
                    <Text style={styles.rs}>{currencyMeta(receiptCcy).symbol}</Text>
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

          {converting && rateNum > 0 ? (
            <View style={styles.convertBanner}>
              <Ionicons name="swap-horizontal" size={15} color={colors.accent} />
              <Text style={styles.convertText}>
                Saving as{' '}
                {fmtMoney(
                  items.reduce((s, it) => s + (Number(it.amount) || 0), 0) * rateNum,
                  baseCcy,
                )}{' '}
                in {baseCcy}
              </Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Save all expenses" onPress={confirm} loading={confirming} icon="checkmark" />
          <Button title="Cancel" variant="outline" onPress={reset} style={{ marginTop: 10 }} />
        </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={styles.idle}>
          <View style={[styles.idleIcon, !online && styles.idleIconOffline]}>
            <Ionicons name={online ? 'scan' : 'cloud-offline'} size={40} color={online ? colors.accent : colors.alarm} />
          </View>
          <Text style={styles.idleTitle}>{online ? 'Scan a receipt' : 'No internet'}</Text>
          <Text style={styles.idleText}>
            {online
              ? 'Photograph a shop receipt, grocery bill or petrol slip. The AI reads each item so you can assign it to a person. Petrol receipts go to the Car list automatically.'
              : 'Scanning reads the receipt with AI, which needs a connection. Snap a photo now — it’s saved to your gallery so you can import and scan it once you’re back online.'}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {online ? (
            <>
              <Button title="Take photo" icon="camera" onPress={() => pickImage(true)} />
              <Button
                title="Choose from gallery"
                variant="outline"
                icon="images"
                onPress={() => pickImage(false)}
                style={{ marginTop: 12 }}
              />
            </>
          ) : (
            <Button title="Take photo to save for later" icon="camera" onPress={savePhotoForLater} />
          )}
        </ScrollView>
      )}

      <PickerModal
        visible={picker !== null}
        title={picker === 'all' ? 'Assign all items to' : 'Assign item to'}
        options={listOptions}
        onSelect={(listId) => setItemList(picker, listId)}
        onClose={() => setPicker(null)}
      />

      <PickerModal
        visible={ccyPicker}
        title="What currency is this receipt in?"
        options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` }))}
        onSelect={changeCurrency}
        onClose={() => setCcyPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 110 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  idle: { padding: 24, paddingBottom: 110 },
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
  idleIconOffline: { backgroundColor: '#f6e3df' },
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

  ccyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  ccyLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  ccyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  ccyChipText: { fontFamily: fonts.monoMedium, fontSize: 13, letterSpacing: 0.5, color: colors.ink },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  rateLead: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft },
  rateBusy: { fontFamily: fonts.serifItalic, fontSize: 13, color: colors.inkSoft },
  rateInput: {
    fontFamily: fonts.monoMedium,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 96,
    textAlign: 'center',
  },
  convertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fbeee0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  convertText: { fontSize: 13, color: colors.accent, fontFamily: fonts.sansMedium, flex: 1 },
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
