import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { CURRENCIES } from '../support/currency';
import { errorMessage } from '../api/client';
import { Mark } from '../components/Logo';
import { colors, fonts } from '../theme';

/**
 * First-launch / change-currency picker. Shown when the user has no
 * `account.currency` set; also reachable from Settings. Saves to the
 * backend via AuthContext.setCurrency and the AuthContext refreshes
 * the user object so RootNavigator drops the picker and routes into
 * the Tabs stack.
 */
export default function CurrencyPickerScreen({ navigation, route }) {
  const { user, setCurrency } = useAuth();
  const initial = user?.account?.currency || null;
  const [selected, setSelected] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isChange = route?.params?.isChange === true;

  const onSave = async () => {
    if (!selected) {
      setError('Pick a currency first.');
      return;
    }
    if (selected === initial) {
      // Nothing to do — but if we're in change mode, just navigate back.
      if (isChange && navigation?.canGoBack()) navigation.goBack();
      return;
    }
    setBusy(true);
    setError('');
    try {
      await setCurrency(selected);
      if (isChange && navigation?.canGoBack()) {
        navigation.goBack();
      }
      // Otherwise: RootNavigator sees account.currency is now set and
      // swaps the picker stack for the Tabs stack automatically.
    } catch (e) {
      setError(errorMessage(e, 'Could not save your currency. Try again.'));
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        {!isChange && (
          <View style={styles.brand}>
            <Mark size={48} />
            <Text style={styles.wordmark}>Pick your currency</Text>
            <Text style={styles.tagline}>One-time setup</Text>
          </View>
        )}

        <Text style={styles.lede}>
          {isChange
            ? 'Change the currency Kharcha displays. Existing amounts will be relabelled, not converted.'
            : 'How should Kharcha display amounts in your ledger? You can change this any time from Settings.'}
        </Text>

        <View style={styles.list}>
          {CURRENCIES.map((c) => {
            const on = selected === c.code;
            return (
              <Pressable
                key={c.code}
                onPress={() => setSelected(c.code)}
                style={({ pressed }) => [
                  styles.row,
                  on && styles.rowOn,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <View style={styles.symbolPill}>
                  <Text style={styles.symbol}>{c.symbol}</Text>
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.rowCode}>{c.code}</Text>
                  <Text style={styles.rowName}>{c.name}</Text>
                </View>
                {on && <Ionicons name="checkmark" size={20} color={colors.accent} />}
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={onSave}
          disabled={busy || !selected}
          style={({ pressed }) => [
            styles.cta,
            (busy || !selected) && styles.ctaDisabled,
            pressed && styles.ctaPressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.card || '#fdf8ee'} />
          ) : (
            <>
              <Text style={styles.ctaText}>{isChange ? 'Save change' : 'Continue'}</Text>
              <Text style={styles.ctaArrow}>→</Text>
            </>
          )}
        </Pressable>

        {!isChange && (
          <Text style={styles.footer}>
            Tip: pick the currency you most often see in receipts and on the price tag. You can change later.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 26, paddingBottom: 60 },

  brand: { alignItems: 'center', marginBottom: 22 },
  wordmark: {
    fontFamily: fonts.serifMediumItalic, fontSize: 28, color: colors.ink,
    marginTop: 12, letterSpacing: -0.5, textAlign: 'center',
  },
  tagline: {
    fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 2,
    textTransform: 'uppercase', color: colors.inkSoft,
    marginTop: 6, textAlign: 'center',
  },

  lede: {
    fontFamily: fonts.serifItalic || fonts.serifMediumItalic,
    fontSize: 16, color: colors.inkSoft, lineHeight: 22,
    marginBottom: 22, textAlign: 'center', maxWidth: 360, alignSelf: 'center',
  },

  list: {
    backgroundColor: colors.card,
    borderRadius: 4,
    borderWidth: 1, borderColor: colors.rule || '#e8dcc1',
    overflow: 'hidden',
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.rule || '#e8dcc1',
  },
  rowOn: { backgroundColor: 'rgba(201,98,31,0.06)' },
  rowPressed: { backgroundColor: 'rgba(201,98,31,0.10)' },
  symbolPill: {
    width: 44, height: 36, borderRadius: 2,
    backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.rule || '#e8dcc1',
    alignItems: 'center', justifyContent: 'center',
  },
  symbol: { fontFamily: fonts.serifMediumItalic, fontSize: 16, color: colors.ink },
  rowMain: { flex: 1 },
  rowCode: { fontFamily: fonts.mono, fontSize: 13, letterSpacing: 1.5, color: colors.ink },
  rowName: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft, marginTop: 2 },

  error: {
    color: colors.alarm, fontSize: 13, fontFamily: fonts.sans,
    textAlign: 'center', marginBottom: 12,
  },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingVertical: 16, paddingHorizontal: 22,
    backgroundColor: colors.ink, borderRadius: 2, minHeight: 52,
  },
  ctaDisabled: { opacity: 0.45 },
  ctaPressed: { transform: [{ scale: 0.97 }] },
  ctaText: {
    fontFamily: fonts.sansMedium, fontSize: 15,
    color: colors.card || '#fdf8ee', letterSpacing: 0.3,
  },
  ctaArrow: {
    fontFamily: fonts.mono, fontSize: 14,
    color: colors.card || '#fdf8ee',
  },

  footer: {
    fontFamily: fonts.sans, fontSize: 12,
    color: colors.inkFaint || colors.inkSoft,
    textAlign: 'center', marginTop: 18, lineHeight: 18,
  },
});
