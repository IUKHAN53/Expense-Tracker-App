import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clear as clearOutbox, list as listOutbox, remove as removeFromOutbox } from '../support/outbox';
import { useCurrency } from '../hooks/useMoney';
import { money as fmtMoney } from '../support/currency';
import { colors, fonts } from '../theme';

function ago(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/**
 * Bottom sheet listing expenses queued while offline. Users can sync them now
 * or remove any they don't want to keep. Controlled by ConnectivityContext
 * (props rather than context, to avoid a circular import).
 */
export function SyncSheet({ visible, onClose, online, onSyncNow, onChanged }) {
  const ccy = useCurrency();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setItems(await listOutbox());
  }, []);

  useEffect(() => {
    if (visible) reload();
  }, [visible, reload]);

  const onRemove = async (id) => {
    await removeFromOutbox(id);
    await reload();
    onChanged?.();
  };

  const onClearAll = () => {
    if (!items.length) return;
    Alert.alert('Discard all queued changes?', 'These expenses will not be saved.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard all',
        style: 'destructive',
        onPress: async () => {
          await clearOutbox();
          await reload();
          onChanged?.();
        },
      },
    ]);
  };

  const sync = async () => {
    setBusy(true);
    try {
      await onSyncNow?.();
      await reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Pending sync</Text>
            <Text style={styles.count}>{items.length}</Text>
          </View>
          <Text style={styles.sub}>
            {items.length
              ? online
                ? 'These will upload automatically. Sync now or remove any you don’t want.'
                : 'Waiting for a connection. They’ll upload automatically when you’re back online.'
              : 'All caught up — nothing waiting to sync.'}
          </Text>

          {items.length > 0 && (
            <ScrollView style={styles.list} contentContainerStyle={{ paddingVertical: 4 }}>
              {items.map((op) => (
                <View key={op.id} style={styles.row}>
                  <Ionicons name="cloud-offline-outline" size={18} color={colors.inkSoft} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {op.payload?.item_name || 'Expense'}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {fmtMoney(op.payload?.amount, ccy.code)} · {ago(op.createdAt)}
                    </Text>
                  </View>
                  <Pressable onPress={() => onRemove(op.id)} hitSlop={10} style={styles.trash}>
                    <Ionicons name="trash-outline" size={18} color={colors.alarm} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <Pressable
              onPress={sync}
              disabled={busy || !online || items.length === 0}
              style={({ pressed }) => [
                styles.syncBtn,
                (busy || !online || items.length === 0) && styles.syncBtnDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="cloud-upload-outline" size={17} color={colors.bg} />
              <Text style={styles.syncBtnText}>{busy ? 'Syncing…' : 'Sync now'}</Text>
            </Pressable>
            {items.length > 0 && (
              <Pressable onPress={onClearAll} hitSlop={8} style={styles.clearBtn}>
                <Text style={styles.clearText}>Discard all</Text>
              </Pressable>
            )}
          </View>

          <Pressable onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim || 'rgba(43,31,18,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: colors.rule,
    maxHeight: '80%',
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.rule, marginBottom: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: fonts.serifMediumItalic, fontSize: 22, color: colors.ink, flex: 1 },
  count: {
    fontFamily: fonts.monoMedium, fontSize: 13, color: colors.bg,
    backgroundColor: colors.accent, minWidth: 26, textAlign: 'center',
    borderRadius: 13, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden',
  },
  sub: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft, marginTop: 6, lineHeight: 19 },
  list: { marginTop: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.rule,
  },
  itemName: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  itemMeta: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  trash: { padding: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 },
  syncBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.ink, borderRadius: 12, paddingVertical: 14,
  },
  syncBtnDisabled: { opacity: 0.4 },
  syncBtnText: { fontFamily: fonts.sansSemibold, fontSize: 14.5, color: colors.bg },
  clearBtn: { paddingVertical: 12, paddingHorizontal: 6 },
  clearText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.alarm },
  close: { alignItems: 'center', marginTop: 14 },
  closeText: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSoft },
});
