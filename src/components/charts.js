// Small SVG charts for Reports, drawn with react-native-svg (already used for the logo).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { colors, fonts } from '../theme';

/** Segment colours, in order of size. Ink and yellow first, like the rest of the app. */
export const PALETTE = ['#111111', '#F5C518', '#1F8A4C', '#2F6FDB', '#C8372D', '#8A5CF6', '#6B6B6B', '#E08A1E'];
export const OTHER_COLOR = '#D6D6D6';

/** Keep the biggest slices and fold the rest into one "Other" slice. */
export function slices(rows, max = PALETTE.length) {
  const head = rows.slice(0, max - 1);
  const rest = rows.slice(max - 1);
  const out = head.map((r, i) => ({ ...r, color: PALETTE[i] }));
  if (rest.length === 1) out.push({ ...rest[0], color: PALETTE[max - 1] });
  else if (rest.length) out.push({ key: '__other', name: `Other (${rest.length})`, total: rest.reduce((s, r) => s + r.total, 0), color: OTHER_COLOR });
  return out;
}

function arc(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
}

/** Ring chart with a label in the middle. */
export function Donut({ data, size = 180, stroke = 26, center, sub }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  const r = (size - stroke) / 2;
  const c = size / 2;
  let a = 0;
  const gap = data.length > 1 ? 0.025 : 0;
  return (
    <View style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel={`Share chart, ${data.length} parts`}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={colors.soft} strokeWidth={stroke} fill="none" />
        {total > 0 && data.map((d) => {
          const sweep = (d.total / total) * Math.PI * 2;
          const a0 = a + gap / 2;
          const a1 = a + sweep - gap / 2;
          a += sweep;
          if (sweep >= Math.PI * 2 - 0.001) {
            return <Circle key={String(d.key)} cx={c} cy={c} r={r} stroke={d.color} strokeWidth={stroke} fill="none" />;
          }
          return a1 > a0 ? <Path key={String(d.key)} d={arc(c, c, r, a0, a1)} stroke={d.color} strokeWidth={stroke} fill="none" /> : null;
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Text style={styles.centerValue} numberOfLines={1} adjustsFontSizeToFit>{center}</Text>
        {sub ? <Text style={styles.centerSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

/**
 * Column chart. data: [{ label, value, muted, highlight }]. A dashed line marks the
 * average of the non-muted columns; labels show every `labelEvery` columns.
 */
export function Columns({ data, width, height = 150, labelEvery = 1, showAverage = true, format = (v) => String(Math.round(v)) }) {
  const live = data.filter((d) => !d.muted);
  const max = Math.max(...data.map((d) => d.value), 1);
  const avg = live.length ? live.reduce((s, d) => s + d.value, 0) / live.length : 0;
  const chartH = height - 22;
  const slot = width / Math.max(data.length, 1);
  const barW = Math.max(2, Math.min(28, slot * 0.66));
  const y = (v) => chartH - (v / max) * (chartH - 6);
  return (
    <View accessibilityRole="image" accessibilityLabel={`Column chart, average ${format(avg)}`}>
      <Svg width={width} height={chartH}>
        <Line x1={0} y1={chartH - 0.5} x2={width} y2={chartH - 0.5} stroke={colors.rule} strokeWidth={1} />
        {data.map((d, i) => {
          const h = Math.max(d.value > 0 ? 3 : 0, chartH - y(d.value));
          return (
            <Rect
              key={i}
              x={i * slot + (slot - barW) / 2}
              y={chartH - h}
              width={barW}
              height={h}
              rx={Math.min(4, barW / 2)}
              fill={d.highlight ? colors.primary : d.muted ? colors.rule : colors.ink}
            />
          );
        })}
        {showAverage && avg > 0 ? (
          <Line x1={0} y1={y(avg)} x2={width} y2={y(avg)} stroke={colors.bad} strokeWidth={1.5} strokeDasharray="5 4" />
        ) : null}
      </Svg>
      {/* Labels are wider than a thin column, so centre a fixed-width box on each one. */}
      <View style={{ height: 22, width }}>
        {data.map((d, i) => (i % labelEvery === 0 ? (
          <Text key={i} style={[styles.axis, { position: 'absolute', width: 40, left: i * slot + slot / 2 - 20 }]} numberOfLines={1}>
            {d.label}
          </Text>
        ) : null))}
      </View>
    </View>
  );
}

/** Two running-total lines: this period (ink) against the previous one (dashed grey). */
export function PaceLine({ current, previous, width, height = 140 }) {
  const n = Math.max(current.length, previous.length, 2);
  const max = Math.max(...current, ...previous, 1);
  const x = (i) => (i / (n - 1)) * width;
  const y = (v) => height - 4 - (v / max) * (height - 12);
  const path = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(v)}`).join(' ');
  const last = current.length - 1;
  return (
    <Svg width={width} height={height} accessibilityRole="image" accessibilityLabel="Running total this period against the previous one">
      <Line x1={0} y1={height - 0.5} x2={width} y2={height - 0.5} stroke={colors.rule} strokeWidth={1} />
      {previous.length > 1 ? <Path d={path(previous)} stroke={colors.muted} strokeWidth={2} strokeDasharray="6 5" fill="none" /> : null}
      {current.length > 1 ? (
        <G>
          <Path d={`${path(current)} L ${x(last)} ${height} L 0 ${height} Z`} fill={colors.primary} opacity={0.35} />
          <Path d={path(current)} stroke={colors.ink} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
          <Circle cx={x(last)} cy={y(current[last])} r={5} fill={colors.ink} stroke={colors.primary} strokeWidth={2.5} />
        </G>
      ) : null}
    </Svg>
  );
}

export function Legend({ items }) {
  return (
    <View style={styles.legend}>
      {items.map((it) => (
        <View key={it.label} style={styles.legendItem}>
          <View style={[styles.swatch, it.dashed ? { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: it.color } : { backgroundColor: it.color }]} />
          <Text style={styles.legendText}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  centerValue: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.6, color: colors.ink },
  centerSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  axis: { textAlign: 'center', fontFamily: fonts.sans, fontSize: 10.5, color: colors.inkSoft, paddingTop: 5 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 4, borderRadius: 2 },
  legendText: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkSoft },
});
