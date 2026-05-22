import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { colors, fonts } from '../theme';

/**
 * Mark B — the Kharcha square chart mark: a dark rounded square holding a
 * peaks-and-valleys trend line. Used as the app logo at icon scale.
 */
export function Mark({ size = 36, ink = colors.ink, accent = colors.accent, paper = colors.bg }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Rect x={2} y={2} width={92} height={92} rx={16} fill={ink} />
      <Line x1={14} y1={74} x2={82} y2={74} stroke={accent} strokeWidth={1} opacity={0.35} />
      <Path
        d="M14 64 L 28 44 L 40 56 L 54 30 L 68 50 L 82 38"
        fill="none"
        stroke={paper}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={28} cy={44} r={2.8} fill={accent} />
      <Circle cx={54} cy={30} r={2.8} fill={accent} />
      <Circle cx={82} cy={38} r={2.8} fill={accent} />
    </Svg>
  );
}

/** The "kharcha" wordmark in italic Newsreader. */
export function Wordmark({ size = 22, color = colors.ink }) {
  return (
    <Text style={{ fontFamily: fonts.serifMediumItalic, fontSize: size, color, letterSpacing: -0.5 }}>
      kharcha
    </Text>
  );
}

/** Mark + wordmark lockup. */
export function Brand({ markSize = 30, wordSize = 22 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <Mark size={markSize} />
      <Wordmark size={wordSize} />
    </View>
  );
}
