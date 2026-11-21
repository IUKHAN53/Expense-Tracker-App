// Splitting one bill across lists: evenly, by percent, by shares, or by exact amounts.
// Works in paisa (integer cents) so the parts always add up to the bill exactly.

export const SPLIT_MODES = ['equal', 'percent', 'shares', 'amounts'];

/** Split `total` in proportion to `weights`; leftover paisa go to the largest fractions. */
export function splitByWeights(total, weights) {
  const cents = Math.round(Number(total) * 100);
  const sum = weights.reduce((s, w) => s + w, 0);
  if (!(cents > 0) || !(sum > 0) || weights.some((w) => !(w >= 0))) return null;
  const raw = weights.map((w) => (cents * w) / sum);
  const base = raw.map(Math.floor);
  let left = cents - base.reduce((s, c) => s + c, 0);
  const order = raw.map((r, i) => [r - base[i], i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left -= 1) base[order[k][1]] += 1;
  return base.map((c) => c / 100);
}

/**
 * @param total bill amount
 * @param mode one of SPLIT_MODES
 * @param values one number per list (ignored for 'equal'): percents, share weights or amounts
 * @returns { amounts } or { error } (a message for the user)
 */
export function computeSplit(total, mode, values) {
  const n = values.length;
  if (n < 2) return { error: 'Pick at least two lists to split.' };
  if (!(Number(total) > 0)) return { error: 'Enter an amount.' };
  const nums = values.map((v) => Number(v) || 0);
  if (nums.some((v) => v < 0)) return { error: 'Parts can’t be negative.' };

  if (mode === 'equal') return { amounts: splitByWeights(total, nums.map(() => 1)) };
  if (mode === 'percent') {
    const sum = Math.round(nums.reduce((s, v) => s + v, 0) * 100) / 100;
    if (sum !== 100) return { error: `Percentages add up to ${sum}%, not 100%.` };
    return { amounts: splitByWeights(total, nums) };
  }
  if (mode === 'shares') {
    if (!nums.some((v) => v > 0)) return { error: 'Give at least one list a share.' };
    return { amounts: splitByWeights(total, nums) };
  }
  // amounts: must add up to the bill exactly
  const cents = nums.map((v) => Math.round(v * 100));
  const diff = Math.round(Number(total) * 100) - cents.reduce((s, c) => s + c, 0);
  if (diff !== 0) {
    const r = Math.abs(diff) / 100;
    return { error: diff > 0 ? `${r} still to assign.` : `${r} more than the bill.`, remaining: diff / 100 };
  }
  return { amounts: cents.map((c) => c / 100) };
}
