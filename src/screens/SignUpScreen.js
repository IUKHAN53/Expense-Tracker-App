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

export default function SignUpScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in your name, email and password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await register({ name, email, password, householdName });
      // Auth context flips token → navigator switches to the Tabs stack.
    } catch (e) {
      setError(errorMessage(e, 'Sign up failed. Please try again.'));
    } finally {
      setBusy(false);
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
          <Text style={styles.wordmark}>Create your ledger</Text>
          <Text style={styles.tagline}>Free · upgrade later for unlimited scans</Text>
        </View>

        <Card style={styles.form}>
          <TextField
            label="Your name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Ayesha"
            autoCapitalize="words"
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
          />
          <TextField
            label="Household name (optional)"
            value={householdName}
            onChangeText={setHouseholdName}
            placeholder="e.g. The Khan Household"
            hint="Shown on your dashboard. Defaults to your name."
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button title="Create account" onPress={onSubmit} loading={busy} icon="arrow-forward" />
        </Card>

        <Pressable onPress={() => navigation.goBack()} style={styles.linkRow} hitSlop={12}>
          <Text style={styles.link}>Already have an account? Sign in</Text>
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
  linkRow: { marginTop: 22, alignItems: 'center' },
  link: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.accent },
});
