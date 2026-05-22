import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api, { errorMessage } from '../api/client';
import { AppHeader } from '../components/Header';
import { Badge, Button, Card, EmptyState, PickerModal, SectionHeader } from '../components/ui';
import { getSmsLastSync, setSmsLastSync } from '../api/storage';
import { isSmsAvailable, readTransactionSms, requestSmsPermission } from '../sms/SmsReader';
import { colors, fonts, money, personColor } from '../theme';

const CHUNK = 20;
const FIRST_RUN_DAYS = 45;

const STATUS_COLOR = {
  imported: colors.accent2,
  ignored: colors.inkSoft,
  failed: colors.alarm,
  pending: colors.accent,
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
      setError('SMS reading needs the Android dev build of this app. It does not work in Expo Go or on iOS.');
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
        setSummary({ transactions: 0, ignored: 0, skipped: 0, failed: 0 });
        await setSmsLastSync(Date.now());
        return;
      }
      const totals = { transactions: 0, ignored: 0, skipped: 0, failed: 0 };
      const chunks = [];
      for (let i = 0; i < found.length; i += CHUNK) chunks.push(found.slice(i, i + CHUNK));
      for (let i = 0; i < chunks.length; i += 1) {
        setProgress(`Analysing with AI… (${i + 1}/${chunks.length})`);
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
    <View style={styles.screen}>
      <AppHeader title="SMS Import" />
      <ScrollView contentContainerStyle={styles.body}>
        <Card style={styles.intro}>
          <SectionHeader title="Import from SMS" />
          <Text style={styles.introText}>
            Reads bank and wallet transaction SMS from your phone. Each spend becomes an entry on
            Home — fuel charges go to Car. Re-assign any of them below with one tap.
          </Text>
          <Button
            title={busy ? progress || 'Working…' : 'Scan SMS inbox'}
            icon="sync"
            onPress={scan}
            loading={busy}
            style={{ marginTop: 14 }}
          />
        </Card>

        {summary ? (
          <Card style={styles.panel}>
            <Text style={styles.kLabel}>LAST SCAN</Text>
            <SummaryRow label="Transactions imported" value={summary.transactions} color={colors.accent2} />
            <SummaryRow label="Non-spend messages ignored" value={summary.ignored} color={colors.inkSoft} />
            <SummaryRow label="Already imported (skipped)" value={summary.skipped} color={colors.inkSoft} />
            {summary.failed ? (
              <SummaryRow label="Failed to read" value={summary.failed} color={colors.alarm} />
            ) : null}
          </Card>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.sectionLabel}>Recent imports</Text>
        {messages.length === 0 ? (
          <EmptyState
            icon="chatbox-ellipses-outline"
            title="Nothing imported yet"
            subtitle="Tap “Scan SMS inbox” to pull in transactions."
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
                <Text style={styles.msgBody} numberOfLines={2}>{m.body}</Text>
                <View style={styles.msgBottom}>
                  <Badge label={m.status} color={STATUS_COLOR[m.status] || colors.inkSoft} />
                  {canReassign ? (
                    <Text style={styles.reassign} onPress={() => setReassign(m)}>
                      {list ? `${list.name}  ✎` : 'Assign list'}
                    </Text>
                  ) : null}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <PickerModal
        visible={reassign !== null}
        title="Move this transaction to"
        options={lists.map((l) => ({ value: l.id, label: l.name, swatch: personColor(l.name).bg }))}
        onSelect={doReassign}
        onClose={() => setReassign(null)}
      />
    </View>
  );
}

function SummaryRow({ label, value, color }) {
  return (
    <View style={styles.sumRow}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={[styles.sumValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 40 },
  intro: { padding: 18, marginBottom: 12 },
  introText: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.inkSoft, lineHeight: 20 },
  panel: { padding: 18, marginBottom: 12 },
  kLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.3,
    color: colors.inkSoft,
    marginBottom: 8,
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  sumLabel: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft },
  sumValue: { fontFamily: fonts.monoMedium, fontSize: 14 },
  error: { color: colors.alarm, fontSize: 13, marginBottom: 12, fontFamily: fonts.sans },
  sectionLabel: {
    fontFamily: fonts.serifMediumItalic,
    fontSize: 19,
    color: colors.ink,
    marginTop: 6,
    marginBottom: 10,
  },
  msgCard: { padding: 13, marginBottom: 10 },
  msgTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  msgMerchant: { fontFamily: fonts.sansMedium, fontSize: 14.5, color: colors.ink, flex: 1, marginRight: 8 },
  msgAmount: { fontFamily: fonts.monoMedium, fontSize: 14.5, color: colors.ink },
  msgBody: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkSoft, marginTop: 4, lineHeight: 17 },
  msgBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  reassign: { fontFamily: fonts.sansSemibold, fontSize: 13, color: colors.accent },
});
