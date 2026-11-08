import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, fonts } from '../theme';

// The Kharcha coin: a black "k" stamped on a chrome-yellow coin.
// Geometry copied from the Paper file ("Mark B" / "Mark B small").
const K_STEM = { x: 39, y: 37, width: 20.4, height: 86.4, rx: 3 };
const K_ARM = 'M58.2 93.4L88.2 65.8H115.8L58.2 118.6Z';
const K_LEG = 'M72.6 104.8L89.4 89.2L120.6 123.4H94.2Z';

/** Coin only — for in-app use at small sizes (headers, lock, onboarding). */
export function Mark({ size = 28 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Circle cx={80} cy={80} r={80} fill={colors.primary} />
      <Rect {...K_STEM} fill={colors.ink} />
      <Path d={K_ARM} fill={colors.ink} />
      <Path d={K_LEG} fill={colors.ink} />
    </Svg>
  );
}

/** Full launcher mark: the ringed coin on a black tile. */
export function AppIconMark({ size = 72 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Rect x={0} y={0} width={160} height={160} rx={36} fill={colors.ink} />
      <Circle cx={80} cy={80} r={58} fill={colors.primary} />
      <Circle cx={80} cy={80} r={47} fill="none" stroke={colors.ink} strokeWidth={4.5} />
      <Rect x={56} y={50} width={13} height={58} rx={2} fill={colors.ink} />
      <Path d="M68.5 89L88.5 70.5H107L68.5 105.5Z" fill={colors.ink} />
      <Path d="M78 96.5L89.5 86L110 108H92Z" fill={colors.ink} />
    </Svg>
  );
}

/** Lowercase "kharcha" wordmark. */
export function Wordmark({ size = 22, color = colors.ink }) {
  return (
    <Text style={{ fontFamily: fonts.display, fontSize: size, color, letterSpacing: -size * 0.05 }}>
      kharcha
    </Text>
  );
}

/** Coin + wordmark lockup. */
export function Brand({ markSize = 28, wordSize = 22 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Mark size={markSize} />
      <Wordmark size={wordSize} />
    </View>
  );
}
