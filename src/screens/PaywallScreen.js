import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRO_SKU, usePro } from '../context/ProContext';
import { colors, fonts, type } from '../theme';
import { useToast } from '../components/Toast';

const PERKS = [
  ['scan-outline', 'Unlimited receipt scans', 'Every item read, editable and assignable to a list.'],
  ['car-outline', 'Petrol slips to refills', 'Fuel receipts fill in the refill form for km/L.'],
  ['lock-closed-outline', 'Still private', 'Photos are read and discarded. Your ledger never leaves the phone.'],
];

const periodLabel = (p) => (p === 'P1Y' ? 'year' : p === 'P1M' ? 'month' : p === 'P1W' ? 'week' : 'period');

export default function PaywallScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { pro, plans, ready, error, buy, restore } = usePro();
  const [chosen, setChosen] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!chosen && plans.length) setChosen(plans[0].id);
  }, [plans, chosen]);

  useEffect(() => {
    if (pro) {
      toast.success('Kharcha Pro is on. Happy scanning!');
      navigation.goBack();
    }
  }, [pro]); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = plans.find((p) => p.id === chosen);

  const subscribe = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      await buy(plan);
    } catch (e) {
      toast.error(e?.message || 'The purchase didn’t go through.');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    const ok = await restore();
    setBusy(false);
    if (!ok) toast.info('No Kharcha Pro subscription found on this Google account.');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        <View style={styles.badge}><Ionicons name="sparkles" size={30} color={colors.ink} /></View>
        <Text style={[type.title, { textAlign: 'center' }]}>Kharcha Pro</Text>
        <Text style={[type.bodySoft, { textAlign: 'center', paddingBottom: 20 }]}>Snap a bill instead of typing it.</Text>

        {PERKS.map(([icon, title, sub]) => (
          <View key={title} style={styles.perk}>
            <Ionicons name={icon} size={22} color={colors.ink} />
            <View style={{ flex: 1 }}>
              <Text style={styles.perkTitle}>{title}</Text>
              <Text style={type.bodySoft}>{sub}</Text>
            </View>
          </View>
        ))}

        <View style={{ gap: 10, paddingTop: 12 }}>
          {!ready ? <ActivityIndicator color={colors.ink} style={{ padding: 24 }} /> : null}
          {ready && !plans.length ? (
            <Text style={styles.note}>{error || 'Plans aren’t available right now. Make sure you installed Kharcha from Google Play.'}</Text>
          ) : null}
          {plans.map((p) => {
            const on = p.id === chosen;
            return (
              <Pressable
                key={p.id}
                onPress={() => setChosen(p.id)}
                style={[styles.plan, on && styles.planOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={colors.ink} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{p.period === 'P1Y' ? 'Yearly' : 'Monthly'}</Text>
                  <Text style={type.bodySoft}>{p.price} / {periodLabel(p.period)}</Text>
                </View>
                {p.trialDays ? <Text style={styles.trial}>{p.trialDays} days free</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: 12 + insets.bottom }]}>
        <Pressable
          onPress={subscribe}
          disabled={!plan || busy}
          style={({ pressed }) => [styles.cta, (!plan || busy) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.ctaText}>
            {busy ? 'Opening Google Play…' : plan?.trialDays ? `Start ${plan.trialDays}-day free trial` : 'Subscribe'}
          </Text>
        </Pressable>
        {plan ? (
          <Text style={styles.fine}>
            {plan.trialDays ? `Free for ${plan.trialDays} days, then ` : ''}{plan.price} per {periodLabel(plan.period)}. Renews automatically; cancel anytime in Google Play.
          </Text>
        ) : null}
        <View style={styles.links}>
          <Pressable onPress={onRestore} hitSlop={8}><Text style={styles.link}>Restore purchase</Text></Pressable>
          <Pressable
            onPress={() => Linking.openURL(`https://play.google.com/store/account/subscriptions?sku=${PRO_SKU}&package=com.iukhan.kharcha`)}
            hitSlop={8}
          >
            <Text style={styles.link}>Manage subscription</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  badge: {
    alignSelf: 'center', width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  perk: { flexDirection: 'row', gap: 14, paddingVertical: 10 },
  perkTitle: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.ink },
  plan: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.rule,
  },
  planOn: { borderColor: colors.ink, borderWidth: 2 },
  planTitle: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.ink },
  trial: {
    fontFamily: fonts.sansMedium, fontSize: 12, color: colors.ink, backgroundColor: colors.primary,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden',
  },
  note: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSoft, textAlign: 'center' },
  bar: { paddingHorizontal: 20, paddingTop: 12, gap: 8, backgroundColor: colors.bg },
  cta: { height: 56, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, color: colors.ink },
  fine: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkSoft, textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingTop: 4 },
  link: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink, textDecorationLine: 'underline' },
});
