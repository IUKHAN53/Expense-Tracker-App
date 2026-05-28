import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';
import { Button, Card, TextField } from '../components/ui';
import { Mark } from '../components/Logo';
import { colors, fonts } from '../theme';

export default function ForgotPasswordScreen({ navigation }) {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter the email you signed up with.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const message = await forgotPassword(email);
      setSuccess(message);
    } catch (e) {
      setError(errorMessage(e, 'Could not send the reset link. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Mark size={54} />
          <Text style={styles.wordmark}>Forgot password?</Text>
          <Text style={styles.tagline}>We'll email you a reset link</Text>
        </View>

        <Card style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <Button
            title={success ? 'Resend reset link' : 'Send reset link'}
            onPress={onSubmit}
            loading={busy}
            icon="mail-outline"
          />
        </Card>

        <Pressable onPress={() => navigation.goBack()} style={styles.linkRow} hitSlop={12}>
          <Text style={styles.link}>Back to sign in</Text>
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
  form: { padding: 22 },
  error: { color: colors.alarm, fontSize: 13, marginBottom: 12, fontFamily: fonts.sans },
  success: { color: colors.success || '#5d7a3d', fontSize: 13, marginBottom: 12, fontFamily: fonts.sans },
  linkRow: { marginTop: 22, alignItems: 'center' },
  link: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.accent },
});
