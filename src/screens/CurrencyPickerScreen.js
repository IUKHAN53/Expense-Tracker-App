import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { CURRENCIES } from '../support/currency';
import { errorMessage } from '../support/errors';
import { Mark } from '../components/Logo';
import { Caps } from '../components/kit';
import { useToast } from '../components/Toast';
import { useBackupFlows } from '../backup/useBackupFlows';
import { colors, fonts, type } from '../theme';

/**
 * First launch = onboarding (brand, promise, currency, restore link).
 * From Settings (isChange) = the same chips to switch currency.
 * Saving sets the currency in local settings; RootNavigator then moves
 * from the setup stack into the app.
 */
export default function CurrencyPickerScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { currency, setCurrency } = useApp();
  const toast = useToast();
  const isChange = route?.params?.isChange === true;
  const [selected, setSelected] = useState(currency || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Restoring a backup also restores its currency, which leaves onboarding.
  const { startRestore, ui } = useBackupFlows();

  const onSave = async () => {
    if (!selected) return setError('Pick a currency first.');
    if (selected === currency) {
      if (navigation.canGoBack()) navigation.goBack();
      return;
    }
    setBusy(true);
    setError('');
    try {
      await setCurrency(selected);
      if (isChange) {
        toast.success(`Currency set to ${selected}.`);
        navigation.goBack();
      }
    } catch (e) {
      setError(errorMessage(e, 'Could not save your currency. Try again.'));
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: isChange ? 0 : insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {isChange ? (
          <Text style={[type.bodySoft, styles.pad, { paddingTop: 16, paddingBottom: 24 }]}>
            Amounts keep their numbers — they’re relabelled, not converted.
          </Text>
        ) : (
          <View style={[styles.pad, styles.intro]}>
            <Mark size={72} />
            <Text style={styles.headline}>Every expense, written down.</Text>
            <Text style={[type.bodySoft, { fontSize: 16, lineHeight: 24 }]}>
              No account, no sign-up. Everything stays encrypted on this phone.
            </Text>
          </View>
        )}

        <View style={[styles.pad, { gap: 12 }]}>
          <Caps>Your currency</Caps>
          <View style={styles.wrap}>
            {CURRENCIES.map((c) => {
              const on = selected === c.code;
              return (
                <Pressable
                  key={c.code}
                  onPress={() => setSelected(c.code)}
                  style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={c.name}
                >
                  <Text style={[styles.sym, on && { color: colors.primary }]}>{c.symbol}</Text>
                  <Text style={[styles.code, on && { color: colors.white }]}>{c.code}</Text>
                </Pressable>
              );
            })}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: 24 + insets.bottom }]}>
        <Pressable
          onPress={onSave}
          disabled={busy || !selected}
          style={({ pressed }) => [styles.cta, (busy || !selected) && { opacity: 0.45 }, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.ctaText}>{busy ? 'Saving…' : isChange ? 'Save change' : 'Start tracking'}</Text>
        </Pressable>
        {!isChange ? (
          <Pressable onPress={startRestore} hitSlop={8} accessibilityRole="button">
            <Text style={styles.restore}>
              Have a backup? <Text style={styles.restoreLink}>Restore it</Text>
            </Text>
          </Pressable>
        ) : null}
      </View>
      {ui}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: 24 },
  intro: { gap: 20, paddingTop: 56, paddingBottom: 40 },
  headline: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, letterSpacing: -2.2, color: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, borderRadius: 22 },
  chipOn: { backgroundColor: colors.ink },
  chipOff: { borderWidth: 1.5, borderColor: colors.rule },
  sym: { fontFamily: fonts.monoMedium, fontSize: 14, color: colors.inkSoft },
  code: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  error: { fontFamily: fonts.sans, fontSize: 14, color: colors.bad },
  bottom: { paddingHorizontal: 24, paddingTop: 16, gap: 16, alignItems: 'center' },
  cta: {
    alignSelf: 'stretch', height: 56, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, color: colors.ink },
  restore: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSoft },
  restoreLink: { fontFamily: fonts.sansMedium, color: colors.ink, textDecorationLine: 'underline' },
});
