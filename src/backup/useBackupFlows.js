import React, { useState } from 'react';
import { Alert } from 'react-native';
import { PasswordSheet } from '../components/PasswordSheet';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import { emit, EVENTS } from '../support/events';
import { errorMessage } from '../support/errors';
import { openBackup, pickBackupFile, restoreSnapshot, shareBackup, shareCsv } from './index';

/**
 * Backup / restore / CSV flows shared by Settings and onboarding.
 * Render `ui` somewhere in the screen (it's the password sheet).
 */
export function useBackupFlows({ onBackedUp } = {}) {
  const toast = useToast();
  const { retry } = useApp();
  const [sheet, setSheet] = useState(null); // { mode, onSubmit }

  const startBackup = () => setSheet({
    mode: 'create',
    onSubmit: async (password) => {
      await shareBackup(password);
      setSheet(null);
      toast.success('Backup file created.');
      onBackedUp?.();
    },
  });

  const confirmRestore = (opened) => Alert.alert(
    'Replace your data?',
    `This backup has ${opened.entries} entries in ${opened.lists} lists. Everything on this phone now will be replaced. This can’t be undone.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Replace',
        style: 'destructive',
        onPress: async () => {
          try {
            const r = await restoreSnapshot(opened.snapshot);
            emit(EVENTS.ENTRIES_CHANGED);
            emit(EVENTS.LISTS_CHANGED);
            emit(EVENTS.CATEGORIES_CHANGED);
            await retry(); // re-read settings (currency) from the restored data
            toast.success(`Restored ${r.entries} entries.`);
          } catch (e) {
            toast.error(errorMessage(e, 'Could not restore the backup.'));
          }
        },
      },
    ],
  );

  const startRestore = async () => {
    try {
      const parsed = await pickBackupFile();
      if (!parsed) return;
      if (parsed.encrypted) {
        setSheet({
          mode: 'unlock',
          onSubmit: async (password) => {
            const opened = await openBackup(parsed, password);
            setSheet(null);
            confirmRestore(opened);
          },
        });
      } else {
        confirmRestore(await openBackup(parsed));
      }
    } catch (e) {
      toast.error(errorMessage(e, 'Could not open that file.'));
    }
  };

  const exportCsv = () => Alert.alert(
    'Export as CSV?',
    'CSV files aren’t encrypted — anyone who gets the file can read your expenses.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Export',
        onPress: async () => {
          try {
            await shareCsv();
          } catch (e) {
            toast.error(errorMessage(e, 'Could not export the CSV.'));
          }
        },
      },
    ],
  );

  const ui = (
    <PasswordSheet
      visible={!!sheet}
      mode={sheet?.mode}
      onSubmit={sheet?.onSubmit}
      onClose={() => setSheet(null)}
    />
  );

  return { startBackup, startRestore, exportCsv, ui };
}
