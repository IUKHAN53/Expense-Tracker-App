import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api, { errorMessage } from '../api/client';
import { Badge, Button, Card, EmptyState, PickerModal } from '../components/ui';
import { getSmsLastSync, setSmsLastSync } from '../api/storage';
import { isSmsAvailable, readTransactionSms, requestSmsPermission } from '../sms/SmsReader';
import { colors, formatDate, listIcon, money } from '../theme';

const CHUNK = 20;
const FIRST_RUN_DAYS = 45;

const STATUS_COLOR = {
  imported: colors.success,
  ignored: colors.muted,
  failed: colors.danger,
  pending: colors.warning,
};

export default function SmsScreen() {
  const [lists, setLists] = useState([]);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [reassign, setReassign] = useState(null);

  const loadRecent = useCallback(async () => {
    try {
      const [listsRes, smsRes] = await Promise.all([api.get('/lists'), api.get('/sms')]);
      setLists(listsRes.data.data || []);
      setMessages(smsRes.data.data || []);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecent();
    }, [loadRecent]),
  );

  const scan = async () => {
    setError('');
    setSummary(null);

    if (!isSmsAvailable()) {
      setError(
        'SMS reading needs the Android dev build of this app. It does not work in Expo Go or on iOS.',
      );
      return;
    }

    const granted = await requestSmsPermission();
    if (!granted) {
      setError('SMS permission was denied. Enable it to import transactions.');
      return;
    }

    setBusy(true);
    try {
      const last = await getSmsLastSync();
      const since = last > 0 ? last : Date.now() - FIRST_RUN_DAYS * 86400000;

      setProgress('Reading inbox…');
      const found = await readTransactionSms(since);

      if (found.length === 0) {
        setSummary({ received: 0, transactions: 0, ignored: 0, skipped: 0, failed: 0 });
        await setSmsLastSync(Date.now());
        return;
      }

      const totals = { received: 0, transactions: 0, ignored: 0, skipped: 0, failed: 0 };
      const chunks = [];
      for (let i = 0; i < found.length; i += CHUNK) {
        chunks.push(found.slice(i, i + CHUNK));
      }

      for (let i = 0; i < chunks.length; i += 1) {
        setProgress(`Analysing messages with AI… (${i + 1}/${chunks.length})`);
        const res = await api.post('/sms/import', { messages: chunks[i] });
        Object.keys(totals).forEach((k) => {
          totals[k] += res.data[k] || 0;
        });
      }

      await setSmsLastSync(Date.now());
      setSummary(totals);
      await loadRecent();
    } catch (e) {
      setError(errorMessage(e, 'SMS import failed.'));
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const doReassign = async (listId) => {
    if (!reassign?.entry_id) return;
    try {
      await api.put(`/entries/${reassign.entry_id}`, { spending_list_id: listId });
      await loadRecent();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const listById = (id) => lists.find((l) => l.id === id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.introCard}>
        <View style={styles.introRow}>
          <Ionicons name="chatbubbles" size={22} color={colors.primary} />
          <Text style={styles.introTitle}>Import from SMS</Text>
        </View>
        <Text style={styles.introText}>
          Reads bank and wallet transaction SMS from your phone. Each spend becomes an entry on
          Home — fuel-station charges go to Car. Re-assign any of them below with one tap.
        </Text>
        <Button
          title={busy ? progress || 'Working…' : 'Scan SMS Inbox'}
          icon="sync"
          onPress={scan}
          loading={busy}
        />
      </Card>

      {summary ? (
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Last scan</Text>
          <SummaryRow label="Transactions imported" value={summary.transactions} color={colors.success} />
          <SummaryRow label="Non-spend messages ignored" value={summary.ignored} color={colors.muted} />
          <SummaryRow label="Already imported (skipped)" value={summary.skipped} color={colors.muted} />
          {summary.failed ? (
            <SummaryRow label="Failed to read" value={summary.failed} color={colors.danger} />
          ) : null}
        </Card>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>Recent imports</Text>
      {messages.length === 0 ? (
        <EmptyState
          icon="chatbox-ellipses-outline"
          title="Nothing imported yet"
          subtitle="Tap “Scan SMS Inbox” to pull in transactions."
        />
      ) : (
        messages.map((m) => {
          const list = listById(m.matched_list_id);
          const canReassign = m.status === 'imported' && m.entry_id;
          return (
            <Card key={m.id} style={styles.msgCard}>
              <View style={styles.msgTop}>
                <Text style={styles.msgMerchant} numberOfLines={1}>
                  {m.merchant || m.sender || 'Transaction'}
                </Text>
                {m.amount != null ? <Text style={styles.msgAmount}>{money(m.amount)}</Text> : null}
              </View>
              <Text style={styles.msgBody} numberOfLines={2}>
                {m.body}
              </Text>
              <View style={styles.msgBottom}>
                <Badge label={m.status} color={STATUS_COLOR[m.status] || colors.muted} />
                {canReassign ? (
                  <Text style={styles.reassignBtn} onPress={() => setReassign(m)}>
                    {list ? `${list.name}  ✎` : 'Assign list'}
                  </Text>
                ) : null}
              </View>
            </Card>
          );
        })
      )}

      <PickerModal
        visible={reassign !== null}
        title="Move this transaction to"
        options={lists.map((l) => ({
          value: l.id,
          label: l.name,
          color: l.color,
          icon: listIcon(l.type),
        }))}
        onSelect={doReassign}
        onClose={() => setReassign(null)}
      />
    </ScrollView>
  );
}

function SummaryRow({ label, value, color }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  introCard: { padding: 16 },
  introRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  introTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginLeft: 8 },
  introText: { fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 14 },
  summaryCard: { padding: 16 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 13, color: colors.muted },
  summaryValue: { fontSize: 14, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: 8, marginBottom: 8 },
  msgCard: { padding: 12 },
  msgTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  msgMerchant: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  msgAmount: { fontSize: 15, fontWeight: '800', color: colors.text },
  msgBody: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 17 },
  msgBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  reassignBtn: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
