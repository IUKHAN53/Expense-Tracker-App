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

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (e) {
      setError(errorMessage(e, 'Login failed. Check your details and try again.'));
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
          <Mark size={66} />
          <Text style={styles.wordmark}>kharcha</Text>
          <Text style={styles.tagline}>Household Ledger</Text>
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
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Sign In" onPress={onSubmit} loading={busy} icon="arrow-forward" />

          <Pressable
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.linkRow}
            hitSlop={10}
          >
            <Text style={styles.linkMuted}>Forgot password?</Text>
          </Pressable>
        </Card>

        <Pressable
          onPress={() => navigation.navigate('SignUp')}
          style={styles.signupRow}
          hitSlop={12}
        >
          <Text style={styles.signupText}>
            New here? <Text style={styles.signupLink}>Create an account</Text>
          </Text>
        </Pressable>

        <Text style={styles.footnote}>Private ledger · Your currency</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 26 },
  brand: { alignItems: 'center', marginBottom: 26 },
  wordmark: {
    fontFamily: fonts.serifMediumItalic,
    fontSize: 44,
    color: colors.ink,
    marginTop: 14,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: colors.inkSoft,
    marginTop: 6,
  },
  form: { padding: 22 },
  error: { color: colors.alarm, fontSize: 13, marginBottom: 12, fontFamily: fonts.sans },
  linkRow: { marginTop: 14, alignItems: 'center' },
  linkMuted: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft },
  signupRow: { marginTop: 18, alignItems: 'center' },
  signupText: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSoft },
  signupLink: { fontFamily: fonts.sansMedium, color: colors.accent },
  footnote: {
    textAlign: 'center',
    marginTop: 22,
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.inkSoft,
  },
});
