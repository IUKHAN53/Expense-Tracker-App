import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useOnline } from '../context/ConnectivityContext';
import { AppHeader } from '../components/Header';
import { Avatar, Button, Card, TextField } from '../components/ui';
import { API_BASE_URL, errorMessage } from '../api/client';
import { colors, fonts } from '../theme';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, logout, deleteAccount } = useAuth();
  const { pending, openSync } = useOnline();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmWord, setConfirmWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const closeConfirm = () => {
    if (busy) return;
    setConfirmOpen(false);
    setPassword('');
    setConfirmWord('');
    setError('');
  };

  const onConfirmDelete = async () => {
    setError('');
    if (!password) {
      setError('Enter your password to confirm.');
      return;
    }
    if (confirmWord !== 'DELETE') {
      setError('Type DELETE exactly to confirm.');
      return;
    }
    setBusy(true);
    try {
      await deleteAccount({ password, confirmation: confirmWord });
      // Auth context clears the session; navigator switches to Login automatically.
    } catch (e) {
      setError(errorMessage(e, 'Could not delete your account. Please try again.'));
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.body}>
        <Card style={styles.profile}>
          <Avatar name={user?.name || 'User'} size={64} />
          <Text style={styles.name}>{user?.name || 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </Card>

        <Pressable
          onPress={() => navigation.navigate('Household')}
          style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardActive]}
        >
          <Ionicons name="people-outline" size={20} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>Household</Text>
            <Text style={styles.linkSub}>Members &amp; invitations</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('ManageLists')}
          style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardActive]}
        >
          <Ionicons name="list-outline" size={20} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>Lists</Text>
            <Text style={styles.linkSub}>People, household, vehicles</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('ManageCategories')}
          style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardActive]}
        >
          <Ionicons name="pricetags-outline" size={20} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>Categories</Text>
            <Text style={styles.linkSub}>Tags for grouping expenses</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('CurrencyPicker', { isChange: true })}
          style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardActive]}
        >
          <Ionicons name="cash-outline" size={20} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>Currency</Text>
            <Text style={styles.linkSub}>{user?.account?.currency || 'USD'} · Tap to change</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
        </Pressable>

        <Pressable
          onPress={openSync}
          style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardActive]}
        >
          <Ionicons name="sync-outline" size={20} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>Sync queue</Text>
            <Text style={styles.linkSub}>
              {pending ? `${pending} change${pending === 1 ? '' : 's'} waiting · tap to review` : 'All changes synced'}
            </Text>
          </View>
          {pending ? <View style={styles.badge}><Text style={styles.badgeText}>{pending}</Text></View> : null}
          <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
        </Pressable>

        <InfoRow icon="server-outline" label="Server" value={API_BASE_URL} />
        <InfoRow icon="cube-outline" label="App version" value="1.0.8" />

        <Button title="Log out" variant="outline" icon="log-out-outline" onPress={logout} />

        <View style={styles.dangerZone}>
          <Text style={styles.dangerLabel}>Danger zone</Text>
          <Card style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>Delete account</Text>
            <Text style={styles.dangerText}>
              Removes your household, every entry, every receipt and every fuel log. This cannot be undone.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmOpen(true)}
              style={({ pressed }) => [styles.dangerBtn, pressed && styles.dangerBtnActive]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.alarm} />
              <Text style={styles.dangerBtnText}>Delete my account</Text>
            </Pressable>
          </Card>
        </View>
      </ScrollView>

      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={closeConfirm}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior="padding"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeConfirm} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Delete your account?</Text>
            <Text style={styles.modalBody}>
              Your household ledger, every entry, every receipt, every fuel log will be permanently removed. We keep no copy. This cannot be reversed.
            </Text>

            <TextField
              label="Your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter your password"
              autoCapitalize="none"
            />
            <TextField
              label="Type DELETE to confirm"
              value={confirmWord}
              onChangeText={(t) => setConfirmWord(t.toUpperCase())}
              placeholder="DELETE"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {error ? <Text style={styles.modalError}>{error}</Text> : null}

            <View style={styles.modalRow}>
              <Button title="Cancel" variant="outline" onPress={closeConfirm} disabled={busy} style={{ flex: 1 }} />
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={onConfirmDelete}
                style={({ pressed }) => [styles.deleteBtn, (busy || pressed) && styles.deleteBtnActive]}
              >
                <Text style={styles.deleteBtnText}>{busy ? 'Deleting…' : 'Delete forever'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <Card style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={colors.inkSoft} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  // paddingBottom clears the bottom tab bar so the log-out / danger-zone rows
  // at the end of the menu aren't hidden behind it.
  body: { padding: 16, paddingBottom: 110 },
  profile: { alignItems: 'center', paddingVertical: 24, marginBottom: 12 },
  name: {
    fontFamily: fonts.serifMedium,
    fontSize: 22,
    color: colors.ink,
    marginTop: 12,
  },
  email: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.inkSoft, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10 },
  infoLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: colors.inkSoft },
  infoValue: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink, marginTop: 3 },

  linkCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, marginBottom: 10, borderRadius: 4,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rule || '#e8dcc1',
  },
  linkCardActive: { backgroundColor: 'rgba(201,98,31,0.06)' },
  linkTitle: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  linkSub: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  badge: {
    backgroundColor: colors.accent, minWidth: 22, borderRadius: 11,
    paddingHorizontal: 7, paddingVertical: 2, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.monoMedium, fontSize: 11, color: '#fff' },

  dangerZone: { marginTop: 40 },
  dangerLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.inkSoft,
    marginBottom: 8,
    paddingLeft: 4,
  },
  dangerCard: { padding: 18, borderColor: colors.alarm, borderWidth: 1 },
  dangerTitle: { fontFamily: fonts.serifMediumItalic, fontSize: 18, color: colors.ink, marginBottom: 4 },
  dangerText: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.inkSoft, lineHeight: 19, marginBottom: 14 },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.alarm,
    backgroundColor: 'transparent',
  },
  dangerBtnActive: { backgroundColor: 'rgba(177,68,48,0.08)' },
  dangerBtnText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.alarm, letterSpacing: 0.4 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(43,31,18,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.card,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 28,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modalTitle: { fontFamily: fonts.serifMediumItalic, fontSize: 22, color: colors.ink, marginBottom: 6 },
  modalBody: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSoft, lineHeight: 20, marginBottom: 18 },
  modalError: { fontFamily: fonts.sans, fontSize: 13, color: colors.alarm, marginTop: 10 },
  modalRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  deleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 2,
    backgroundColor: colors.alarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnActive: { opacity: 0.85 },
  deleteBtnText: { fontFamily: fonts.sansMedium, fontSize: 14, color: '#fdf8ee', letterSpacing: 0.3 },
});
