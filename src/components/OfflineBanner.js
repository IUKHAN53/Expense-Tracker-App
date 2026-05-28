import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOnline } from '../context/ConnectivityContext';
import { colors, fonts } from '../theme';

/**
 * Thin top strip shown whenever the device is offline, or when there are
 * queued changes waiting to sync. Tapping it forces a sync attempt. Renders
 * nothing in the normal (online, nothing pending) state.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { online, pending, openSync } = useOnline();

  if (online && pending === 0) return null;

  const offline = !online;
  const bg = offline ? colors.alarm : colors.accent;
  const label = offline
    ? `No internet${pending ? ` · ${pending} change${pending === 1 ? '' : 's'} waiting` : ''}`
    : `${pending} change${pending === 1 ? '' : 's'} to sync · tap to review`;

  return (
    <Pressable
      onPress={openSync}
      style={[styles.bar, { backgroundColor: bg, paddingTop: insets.top + 6 }]}
    >
      <Ionicons name={offline ? 'cloud-offline' : 'cloud-upload'} size={14} color="#fff" />
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingBottom: 7,
    paddingHorizontal: 12,
  },
  text: { color: '#fff', fontFamily: fonts.sansMedium, fontSize: 12.5 },
});
