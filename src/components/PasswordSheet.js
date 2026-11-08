import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, TextField } from './ui';
import { colors, fonts } from '../theme';
import { MIN_PASSWORD } from '../backup/format';
import { errorMessage } from '../support/errors';

/**
 * Bottom sheet asking for a backup password.
 *   mode 'create' — new password + confirm, with the "no recovery" warning.
 *   mode 'unlock' — single password to open an existing backup.
 * `onSubmit(password)` may throw; its message is shown inline.
 */
export function PasswordSheet({ visible, mode, onSubmit, onClose }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const create = mode === 'create';

  useEffect(() => {
    if (visible) {
      setPw('');
      setPw2('');
      setError('');
      setBusy(false);
    }
  }, [visible]);

  const submit = async () => {
    if (create) {
      if (pw.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
      if (pw !== pw2) return setError('The two passwords don’t match.');
    } else if (!pw) {
      return setError('Enter the backup password.');
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit(pw);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const close = () => !busy && onClose();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{create ? 'Lock your backup' : 'Unlock backup'}</Text>
          <Text style={styles.body}>
            {create
              ? 'The file is encrypted with this password. You’ll need it to restore.'
              : 'Enter the password you chose when you made this backup.'}
          </Text>

          <TextField
            label="Password"
            value={pw}
            onChangeText={setPw}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            hint={create ? `At least ${MIN_PASSWORD} characters` : undefined}
          />
          {create ? (
            <TextField
              label="Type it again"
              value={pw2}
              onChangeText={setPw2}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : null}

          {create ? (
            <View style={styles.warn}>
              <Ionicons name="warning-outline" size={18} color={colors.ink} />
              <Text style={styles.warnText}>There’s no way to recover it. Lose the password, lose the backup.</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={busy ? (create ? 'Encrypting…' : 'Unlocking…') : create ? 'Create backup file' : 'Unlock'}
            onPress={submit}
            loading={busy}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card, padding: 22, paddingBottom: 32,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  title: { fontFamily: fonts.sansSemibold, fontSize: 22, color: colors.ink, marginBottom: 6 },
  body: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.inkSoft, marginBottom: 18 },
  warn: {
    flexDirection: 'row', gap: 10, padding: 12, borderRadius: 8,
    backgroundColor: colors.soft, marginBottom: 14,
  },
  warnText: { flex: 1, fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 19, color: colors.ink },
  error: { fontFamily: fonts.sans, fontSize: 13, color: colors.alarm, marginBottom: 12 },
});
