import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';
import { Button, TextField } from '../components/ui';
import { colors } from '../theme';

export default function LoginScreen() {
  const { login, baseUrl } = useAuth();
  const [server, setServer] = useState(baseUrl || '');
  const [email, setEmail] = useState('admin@expense.app');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async () => {
    if (!server.trim() || !email.trim() || !password) {
      setError('Please fill in the server URL, email and password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(server, email, password);
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
        <View style={styles.logo}>
          <Ionicons name="wallet" size={40} color={colors.white} />
        </View>
        <Text style={styles.title}>Expense Tracker</Text>
        <Text style={styles.subtitle}>Track who spent what at home.</Text>

        <View style={styles.form}>
          <TextField
            label="Server URL"
            value={server}
            onChangeText={setServer}
            placeholder="http://192.168.1.10:8787"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            hint="Your Laravel server address, reachable on the same Wi-Fi."
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="admin@expense.app"
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
          <Button title="Sign In" onPress={onSubmit} loading={busy} icon="log-in-outline" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: {
    width: 78,
    height: 78,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  form: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
});
