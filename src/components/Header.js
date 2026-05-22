import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mark } from './Logo';
import { colors, fonts } from '../theme';

/**
 * The Kharcha screen header — the square mark, a title (defaults to the
 * "kharcha" wordmark), and an optional right-hand control.
 */
export function AppHeader({ title, right }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <View style={styles.brand}>
        <Mark size={28} />
        <Text style={styles.title}>{title || 'kharcha'}</Text>
      </View>
      <View style={styles.right}>{right || null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  title: {
    fontFamily: fonts.serifMediumItalic,
    fontSize: 22,
    color: colors.ink,
  },
  right: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
});
