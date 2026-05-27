import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';
import { Button, Card } from '../components/ui';
import { Mark } from '../components/Logo';
import { colors, fonts } from '../theme';

export default function VerifyEmailScreen() {
  const { user, verifyEmail, resendVerificationCode, logout } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [okBanner, setOkBanner] = useState('');
  const codeRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // First open: focus the code field.
  useEffect(() => {
    const t = setTimeout(() => codeRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  const onSubmit = async () => {
    if (code.length !== 6) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await verifyEmail(code);
      // Auth context refreshes the user object; navigator switches to Tabs.
    } catch (e) {
      setError(errorMessage(e, 'That code did not work. Try again or resend.'));
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    setError('');
    setOkBanner('');
    try {
      const msg = await resendVerificationCode();
      setOkBanner(msg || 'A new code has been sent.');
      setCooldown(45);
    } catch (e) {
      setError(errorMessage(e, 'Could not resend the code. Try again in a moment.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Mark size={54} />
          <Text style={styles.wordmark}>Check your inbox</Text>
          <Text style={styles.tagline}>One-time code</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.lede}>
            We emailed a six-digit code to{'\n'}
            <Text style={styles.email}>{user?.email}</Text>
          </Text>

          <View style={styles.codeWrap}>
            <TextInput
              ref={codeRef}
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="• • • • • •"
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              style={styles.codeInput}
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
          </View>

          {okBanner ? <Text style={styles.ok}>{okBanner}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={busy ? 'Verifying…' : 'Verify email'}
            onPress={onSubmit}
            disabled={busy || code.length !== 6}
            icon="checkmark-outline"
          />

          <Pressable
            disabled={cooldown > 0 || resending}
            onPress={onResend}
            style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowActive]}
            hitSlop={10}
          >
            <Text style={[styles.link, (cooldown > 0 || resending) && styles.linkMuted]}>
              {resending
                ? 'Sending…'
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : 'Resend the code'}
            </Text>
          </Pressable>
        </Card>

        <Pressable onPress={logout} style={styles.signOutRow} hitSlop={10}>
          <Text style={styles.signOut}>Wrong email? Sign out and start over</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 26 },
  brand: { alignItems: 'center', marginBottom: 22 },
  wordmark: {
    fontFamily: fonts.serifMediumItalic,
    fontSize: 30,
    color: colors.ink,
    marginTop: 12,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.inkSoft,
    marginTop: 6,
    textAlign: 'center',
  },
  card: { padding: 22 },
  lede: {
    fontFamily: fonts.serifItalic || fonts.serifMediumItalic,
    fontSize: 16,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 22,
  },
  email: { color: colors.ink, fontFamily: fonts.sansMedium, fontStyle: 'normal' },
  codeWrap: { alignItems: 'center', marginBottom: 14 },
  codeInput: {
    fontFamily: fonts.mono,
    fontSize: 32,
    letterSpacing: 12,
    color: colors.ink,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.rule || '#d8c7a3',
    width: 240,
    paddingVertical: 14,
  },
  ok: { color: colors.ok || '#4d7a2d', fontSize: 13, marginBottom: 12, fontFamily: fonts.sans, textAlign: 'center' },
  error: { color: colors.alarm, fontSize: 13, marginBottom: 12, fontFamily: fonts.sans, textAlign: 'center' },
  linkRow: { marginTop: 18, alignItems: 'center', padding: 8 },
  linkRowActive: { opacity: 0.6 },
  link: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.accent },
  linkMuted: { color: colors.inkFaint || colors.inkSoft },
  signOutRow: { marginTop: 28, alignItems: 'center' },
  signOut: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkSoft, textDecorationLine: 'underline' },
});
