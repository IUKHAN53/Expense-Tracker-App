import React from 'react';
import { Linking, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Mark } from './Logo';
import { colors, fonts, type } from '../theme';

const PACKAGE = 'com.iukhan.kharcha';
export const PLAY_URL = `https://play.google.com/store/apps/details?id=${PACKAGE}`;

/** "Share Kharcha": QR to the Play listing, share link, open in Play Store. */
export function ShareSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();

  const shareLink = () => Share.share({ message: `I track my expenses with Kharcha — free on Google Play: ${PLAY_URL}` });
  const openPlay = () => Linking.openURL(`market://details?id=${PACKAGE}`).catch(() => Linking.openURL(PLAY_URL));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: 32 + insets.bottom }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Share Kharcha</Text>
          <Text style={[type.bodySoft, { textAlign: 'center' }]}>Scan with any phone camera to get it.</Text>

          <View style={styles.qrCard}>
            {/* High error correction so the coin in the middle doesn't break scanning. */}
            <QRCode value={PLAY_URL} size={200} ecl="H" color={colors.ink} backgroundColor={colors.bg} />
            <View style={styles.qrLogo}>
              <Mark size={44} />
            </View>
          </View>

          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            <Pressable onPress={shareLink} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
              <Ionicons name="share-outline" size={20} color={colors.ink} />
              <Text style={styles.primaryText}>Share link</Text>
            </Pressable>
            <Pressable onPress={openPlay} style={({ pressed }) => [styles.outline, pressed && { opacity: 0.7 }]}>
              <Ionicons name="logo-google-playstore" size={18} color={colors.ink} />
              <Text style={styles.outlineText}>Open in Play Store</Text>
            </Pressable>
          </View>
          <Text style={styles.foot}>Kharcha · free on Google Play</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 24, alignItems: 'center', gap: 20,
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.rule },
  title: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -1.1, color: colors.ink, marginBottom: -14 },
  qrCard: {
    width: 248, height: 248, borderRadius: 20, borderWidth: 1.5, borderColor: colors.rule,
    alignItems: 'center', justifyContent: 'center',
  },
  qrLogo: { position: 'absolute', padding: 4, borderRadius: 30, backgroundColor: colors.bg },
  primary: {
    height: 56, borderRadius: 14, backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryText: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3, color: colors.ink },
  outline: {
    height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: colors.ink,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  outlineText: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.ink },
  foot: { fontFamily: fonts.mono, fontSize: 12, color: colors.inkSoft },
});
