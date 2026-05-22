import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components/ui';
import { colors } from '../theme';

export default function SettingsScreen() {
  const { user, baseUrl, logout } = useAuth();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color={colors.white} />
        </View>
        <Text style={styles.name}>{user?.name || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </Card>

      <InfoRow icon="server-outline" label="Server" value={baseUrl || '—'} />
      <InfoRow icon="information-circle-outline" label="App version" value="1.0.0" />

      <Card style={styles.noteCard}>
        <Text style={styles.noteTitle}>About SMS import</Text>
        <Text style={styles.noteText}>
          Transaction SMS reading works only in the Android dev build of this app (installed
          directly on your phone) — not in Expo Go and not on iOS.
        </Text>
      </Card>

      <Button title="Log Out" variant="danger" icon="log-out-outline" onPress={logout} />
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <Card style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={colors.muted} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  profileCard: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 12 },
  email: { fontSize: 14, color: colors.muted, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  infoText: { marginLeft: 12, flex: 1 },
  infoLabel: { fontSize: 12, color: colors.muted },
  infoValue: { fontSize: 14, color: colors.text, fontWeight: '600', marginTop: 2 },
  noteCard: { padding: 14, backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  noteTitle: { fontSize: 13, fontWeight: '700', color: colors.info, marginBottom: 4 },
  noteText: { fontSize: 12, color: '#1e40af', lineHeight: 18 },
});
