import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { usePro } from '../context/ProContext';
import { getDb } from '../db';
import { useBackupFlows } from '../backup/useBackupFlows';
import { useCurrency } from '../hooks/useMoney';
import { Caps } from '../components/kit';
import { ShareSheet } from '../components/ShareSheet';
import { colors, fonts, formatDate, type } from '../theme';
import { expo } from '../../app.json';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { currency } = useApp();
  const ccy = useCurrency();
  const { pro } = usePro();
  const [lastBackup, setLastBackup] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

  const loadLastBackup = useCallback(() => {
    getDb().then((db) => db.settings.get('last_backup_at')).then(setLastBackup).catch(() => {});
  }, []);
  useFocusEffect(loadLastBackup);
  const { startBackup, startRestore, exportCsv, ui } = useBackupFlows({ onBackedUp: loadLastBackup });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <Text style={[type.title, styles.title]}>Settings</Text>

        <Group title="Kharcha Pro">
          <Row title={pro ? 'Pro is active' : 'Get Kharcha Pro'} value={pro ? 'Manage' : 'Receipt scans'} onPress={() => navigation.navigate('Paywall')} last />
        </Group>

        <Group title="Your data">
          <Row title="Back up to a file" value={lastBackup ? `Last: ${formatDate(lastBackup)}` : 'Never'} warn={!lastBackup} onPress={startBackup} />
          <Row title="Restore from a file" onPress={startRestore} />
          <Row title="Export CSV" onPress={exportCsv} last />
        </Group>

        <Group title="Privacy & app">
          <Row title="Currency" value={`${currency} · ${ccy.symbol}`} onPress={() => navigation.navigate('CurrencyPicker', { isChange: true })} />
          <Row title="Lists" onPress={() => navigation.navigate('ManageLists')} />
          <Row title="Categories" onPress={() => navigation.navigate('ManageCategories')} />
          <Row title="Share Kharcha" onPress={() => setShareOpen(true)} last />
        </Group>

        <View style={styles.foot}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.inkSoft} />
          <Text style={styles.footText}>Encrypted on this phone. No account, no server.</Text>
        </View>
        <Text style={[styles.footText, { paddingHorizontal: 20, paddingTop: 6 }]}>Version {expo.version}</Text>
      </ScrollView>
      {ui}
      <ShareSheet visible={shareOpen} onClose={() => setShareOpen(false)} />
    </View>
  );
}

function Group({ title, children }) {
  return (
    <View style={styles.group}>
      <Caps style={{ paddingBottom: 4 }}>{title}</Caps>
      {children}
    </View>
  );
}

function Row({ title, value, onPress, last, warn }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, !last && styles.rule, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.rowTitle}>{title}</Text>
      {value ? <Text style={[styles.rowValue, warn && { color: colors.bad }]}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 },
  group: { paddingHorizontal: 20, paddingBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 56 },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.rule },
  rowTitle: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 16, color: colors.ink },
  rowValue: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSoft },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 8 },
  footText: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft },
});
