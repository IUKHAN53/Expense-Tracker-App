import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from '../components/Header';
import { Avatar, Button, Card } from '../components/ui';
import { API_BASE_URL } from '../api/client';
import { colors, fonts } from '../theme';

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.screen}>
      <AppHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.body}>
        <Card style={styles.profile}>
          <Avatar name={user?.name || 'User'} size={64} />
          <Text style={styles.name}>{user?.name || 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </Card>

        <InfoRow icon="server-outline" label="Server" value={API_BASE_URL} />
        <InfoRow icon="cube-outline" label="App version" value="1.0.0" />

        <Button title="Log out" variant="outline" icon="log-out-outline" onPress={logout} />
      </ScrollView>
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
  body: { padding: 16 },
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
  note: { padding: 14, marginBottom: 16, backgroundColor: colors.soft },
  noteTitle: { fontFamily: fonts.serifMediumItalic, fontSize: 16, color: colors.ink, marginBottom: 4 },
  noteText: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 },
});
