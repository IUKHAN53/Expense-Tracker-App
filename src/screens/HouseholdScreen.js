import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/Header';
import { Button, Card, TextField } from '../components/ui';
import api, { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, fonts } from '../theme';

export default function HouseholdScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState([]);
  const [pending, setPending] = useState([]);
  const [capacity, setCapacity] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [okBanner, setOkBanner] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/account/members');
      setMembers(res.data.members || []);
      setPending(res.data.pending || []);
      setCapacity(res.data.capacity || null);
      setError('');
    } catch (e) {
      setError(errorMessage(e, 'Could not load household.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const onInvite = async () => {
    if (!inviteEmail.trim()) {
      setError('Enter an email to invite.');
      return;
    }
    setInviting(true);
    setError('');
    setOkBanner('');
    try {
      const res = await api.post('/account/invitations', { email: inviteEmail.trim() });
      setOkBanner(res.data?.message || `Invitation sent to ${inviteEmail.trim()}.`);
      setInviteEmail('');
      load();
    } catch (e) {
      setError(errorMessage(e, 'Could not send the invitation.'));
    } finally {
      setInviting(false);
    }
  };

  const onRevoke = (invitation) => {
    Alert.alert(
      'Revoke invitation?',
      `Cancel the invitation to ${invitation.email}.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/account/invitations/${invitation.id}`);
              setOkBanner(`Invitation to ${invitation.email} revoked.`);
              load();
            } catch (e) {
              setError(errorMessage(e, 'Could not revoke the invitation.'));
            }
          },
        },
      ],
    );
  };

  const onRemove = (member) => {
    Alert.alert(
      `Remove ${member.name}?`,
      `${member.email} will lose access to the household. Their entries stay in the ledger.`,
      [
        { text: 'Keep them', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/account/members/${member.id}`);
              setOkBanner(`${member.name} removed from the household.`);
              load();
            } catch (e) {
              setError(errorMessage(e, 'Could not remove this member.'));
            }
          },
        },
      ],
    );
  };

  const canInviteMore = capacity && capacity.used < capacity.max;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader title="Household" />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {capacity && (
          <Card style={styles.capacity}>
            <View style={styles.capacityRow}>
              <Text style={styles.capacityNum}>
                {capacity.used}<Text style={styles.capacityMax}> / {capacity.max}</Text>
              </Text>
              <Text style={styles.capacityLabel}>members on the {capacity.is_pro ? 'Pro' : 'Free'} plan</Text>
            </View>
            <View style={styles.capacityBar}>
              <View
                style={[
                  styles.capacityBarFill,
                  { width: `${Math.min(100, (capacity.used / capacity.max) * 100)}%` },
                ]}
              />
            </View>
            {!capacity.is_pro && capacity.used >= capacity.max && (
              <Text style={styles.capacityHint}>
                Pro raises the cap to 5 members. Upgrade from the web account when ready.
              </Text>
            )}
          </Card>
        )}

        {okBanner ? (
          <Card style={styles.ok}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.ok || '#5d7a3d'} />
            <Text style={styles.okText}>{okBanner}</Text>
          </Card>
        ) : null}
        {error ? (
          <Card style={styles.errBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.alarm} />
            <Text style={styles.errText}>{error}</Text>
          </Card>
        ) : null}

        <Text style={styles.sectionLabel}>Members</Text>
        <Card style={styles.list}>
          {loading && members.length === 0 ? (
            <Text style={styles.placeholder}>Loading…</Text>
          ) : members.length === 0 ? (
            <Text style={styles.placeholder}>No members yet.</Text>
          ) : (
            members.map((m, i) => (
              <View key={m.id} style={[styles.row, i === members.length - 1 && styles.rowLast]}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowName}>
                    {m.name}{m.is_you ? <Text style={styles.you}>  · You</Text> : null}
                  </Text>
                  <Text style={styles.rowSub}>{m.email}</Text>
                </View>
                {!m.is_you && (
                  <Pressable hitSlop={8} onPress={() => onRemove(m)} style={({ pressed }) => [styles.rowAction, pressed && styles.rowActionActive]}>
                    <Ionicons name="trash-outline" size={16} color={colors.alarm} />
                  </Pressable>
                )}
              </View>
            ))
          )}
        </Card>

        <Text style={styles.sectionLabel}>Pending invitations</Text>
        <Card style={styles.list}>
          {pending.length === 0 ? (
            <Text style={styles.placeholder}>None pending.</Text>
          ) : (
            pending.map((p, i) => (
              <View key={p.id} style={[styles.row, i === pending.length - 1 && styles.rowLast]}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowName}>{p.email}</Text>
                  <Text style={styles.rowSub}>Expires {formatDate(p.expires_at)}</Text>
                </View>
                <Pressable hitSlop={8} onPress={() => onRevoke(p)} style={({ pressed }) => [styles.rowAction, pressed && styles.rowActionActive]}>
                  <Ionicons name="close" size={18} color={colors.alarm} />
                </Pressable>
              </View>
            ))
          )}
        </Card>

        <Text style={styles.sectionLabel}>Invite by email</Text>
        <Card style={styles.inviteCard}>
          <TextField
            label="Email address"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="hamza@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <Button
            title={inviting ? 'Sending…' : 'Send invitation'}
            onPress={onInvite}
            disabled={inviting || !canInviteMore}
            icon="paper-plane-outline"
            style={{ marginTop: 12 }}
          />
          {!canInviteMore && capacity && (
            <Text style={styles.fullHint}>
              {capacity.is_pro
                ? 'You are at the Pro plan limit. Contact us to add more seats.'
                : `Free plan is capped at ${capacity.max} members. Upgrade to Pro for ${5} seats.`}
            </Text>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 48 },

  capacity: { padding: 18, marginBottom: 16 },
  capacityRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 12 },
  capacityNum: { fontFamily: fonts.serifMediumItalic, fontSize: 38, color: colors.ink, lineHeight: 38 },
  capacityMax: { color: colors.inkFaint || colors.inkSoft, fontSize: 22 },
  capacityLabel: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft, flex: 1 },
  capacityBar: { height: 4, backgroundColor: colors.rule || '#e8dcc1', borderRadius: 2, overflow: 'hidden' },
  capacityBarFill: { height: '100%', backgroundColor: colors.accent },
  capacityHint: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkSoft, marginTop: 10, lineHeight: 18 },

  ok: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 12, backgroundColor: '#eef5e6' },
  okText: { fontFamily: fonts.sans, fontSize: 13.5, color: '#3e5a23', flex: 1 },
  errBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 12, backgroundColor: '#fbeae3' },
  errText: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.alarm, flex: 1 },

  sectionLabel: {
    fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2,
    textTransform: 'uppercase', color: colors.inkSoft,
    marginTop: 8, marginBottom: 8, paddingLeft: 4,
  },

  list: { paddingHorizontal: 0, marginBottom: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.rule || '#e8dcc1',
  },
  rowLast: { borderBottomWidth: 0 },
  rowMain: { flex: 1 },
  rowName: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  rowSub: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  you: { fontFamily: fonts.serifItalic || fonts.serifMediumItalic, fontSize: 13, color: colors.accent },
  rowAction: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: 2, borderWidth: 1, borderColor: colors.rule || '#e8dcc1',
  },
  rowActionActive: { backgroundColor: 'rgba(177,68,48,0.08)' },
  placeholder: {
    padding: 16, fontFamily: fonts.serifItalic || fonts.serifMediumItalic,
    fontSize: 14, color: colors.inkFaint || colors.inkSoft,
  },

  inviteCard: { padding: 16 },
  fullHint: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkSoft, marginTop: 10, lineHeight: 18 },
});
