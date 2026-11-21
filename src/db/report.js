// Report maths for the Reports screen. Pure functions over presented entries
// (repo.entries.inRange), so they can be checked without a database.
import { monthKey } from './month.js';

const r2 = (n) => Math.round(n * 100) / 100;
export const UNCATEGORISED = 0; // filter id for entries with no category

/** Keep entries matching every active filter (empty filter = no restriction). */
export function applyFilters(entries, { listIds = [], categoryIds = [], search = '' } = {}) {
  const q = search.trim().toLowerCase();
  return entries.filter((e) => (!listIds.length || listIds.includes(e.spending_list_id))
    && (!categoryIds.length || categoryIds.includes(e.category_id ?? UNCATEGORISED))
    && (!q || `${e.item_name} ${e.notes || ''}`.toLowerCase().includes(q)));
}

function group(entries, keyOf, nameOf, total) {
  const m = new Map();
  for (const e of entries) {
    const k = keyOf(e);
    const g = m.get(k) || { key: k, name: nameOf(e), total: 0, count: 0 };
    g.total += e.amount;
    g.count += 1;
    m.set(k, g);
  }
  return [...m.values()]
    .map((g) => ({ ...g, total: r2(g.total), share: total ? g.total / total : 0 }))
    .sort((a, b) => b.total - a.total);
}

/**
 * @param entries already filtered
 * @param from Date, inclusive
 * @param to Date, exclusive
 * @param asOf Date; for a period still in progress, per-day uses the days elapsed so far
 */
export function buildReport(entries, from, to, asOf = to) {
  const total = r2(entries.reduce((s, e) => s + e.amount, 0));
  const end = asOf < to ? asOf : to;
  const days = Math.max(1, Math.ceil((end - from) / 86400000));

  // Every month in the range, including empty ones, oldest first.
  const months = [];
  for (let d = new Date(from.getFullYear(), from.getMonth(), 1); d < to; d.setMonth(d.getMonth() + 1)) {
    months.push(monthKey(d));
  }
  const perMonth = new Map(months.map((k) => [k, 0]));
  for (const e of entries) {
    const k = monthKey(new Date(e.purchased_at)); // stored as UTC; bucket by local month
    if (perMonth.has(k)) perMonth.set(k, perMonth.get(k) + e.amount);
  }
  const byMonth = months.map((k) => ({ key: k, total: r2(perMonth.get(k)) }));

  // Every day in the range (local days); days after asOf are flagged so charts can grey them.
  const dayKey = (d) => `${monthKey(d)}-${String(d.getDate()).padStart(2, '0')}`;
  const perDay = new Map();
  for (const e of entries) {
    const k = dayKey(new Date(e.purchased_at));
    perDay.set(k, (perDay.get(k) || 0) + e.amount);
  }
  const byDay = [];
  const weekdaySum = [0, 0, 0, 0, 0, 0, 0]; // Monday first
  const weekdayDays = [0, 0, 0, 0, 0, 0, 0];
  for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
    const k = dayKey(d);
    const v = perDay.get(k) || 0;
    const future = d >= end;
    byDay.push({ key: k, day: d.getDate(), total: r2(v), future });
    if (!future) {
      const w = (d.getDay() + 6) % 7;
      weekdaySum[w] += v;
      weekdayDays[w] += 1;
    }
  }
  const byWeekday = weekdaySum.map((v, i) => ({ key: i, average: weekdayDays[i] ? r2(v / weekdayDays[i]) : 0 }));

  return {
    total,
    count: entries.length,
    perDay: r2(total / days),
    days,
    largest: entries.reduce((a, e) => (!a || e.amount > a.amount ? e : a), null),
    byCategory: group(entries, (e) => e.category_id ?? UNCATEGORISED, (e) => e.category?.name || 'Uncategorised', total),
    byList: group(entries, (e) => e.spending_list_id, (e) => e.spending_list?.name || 'List', total),
    byMonth,
    byDay,
    byWeekday,
    topItems: group(entries, (e) => e.item_name.trim().toLowerCase(), (e) => e.item_name.trim(), total).slice(0, 10),
  };
}

/** Change against the previous period, as a fraction (0.12 = 12% more). null when there's nothing to compare. */
export function change(current, previous) {
  return previous > 0 ? (current - previous) / previous : null;
}

/** Running total per day, for "spending pace" lines. */
export function cumulative(byDay) {
  let run = 0;
  return byDay.map((d) => { run += d.total; return r2(run); });
}
