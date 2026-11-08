import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { AppHeader } from '../components/Header';
import { Card } from '../components/ui';
import { colors, fonts } from '../theme';
import { expo } from '../../app.json';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { currency } = useApp();

  return (
    <View style={styles.screen}>
      <AppHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.body}>
        <LinkRow
          icon="list-outline"
          title="Lists"
          sub="People, household, vehicles"
          onPress={() => navigation.navigate('ManageLists')}
        />
        <LinkRow
          icon="pricetags-outline"
          title="Categories"
          sub="Tags for grouping expenses"
          onPress={() => navigation.navigate('ManageCategories')}
        />
        <LinkRow
          icon="cash-outline"
          title="Currency"
          sub={`${currency} · Tap to change`}
          onPress={() => navigation.navigate('CurrencyPicker', { isChange: true })}
        />

        <Card style={styles.infoRow}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.inkSoft} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Your data</Text>
            <Text style={styles.infoValue}>Encrypted on this phone. No account, no server.</Text>
          </View>
        </Card>
        <Card style={styles.infoRow}>
          <Ionicons name="cube-outline" size={20} color={colors.inkSoft} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>App version</Text>
            <Text style={styles.infoValue}>{expo.version}</Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function LinkRow({ icon, title, sub, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardActive]}
    >
      <Ionicons name={icon} size={20} color={colors.ink} />
      <View style={{ flex: 1 }}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  // paddingBottom clears the bottom tab bar.
  body: { padding: 16, paddingBottom: 110 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10 },
  infoLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: colors.inkSoft },
  infoValue: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink, marginTop: 3 },
  linkCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, marginBottom: 10, borderRadius: 4,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rule,
  },
  linkCardActive: { backgroundColor: 'rgba(201,98,31,0.06)' },
  linkTitle: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  linkSub: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
});
