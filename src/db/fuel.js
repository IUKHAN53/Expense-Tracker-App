// Fuel records + stats.
// km/L uses the full-tank-to-full-tank method: at each full fill,
//   km/L = (odometer − odometer at the previous full fill)
//          / (litres of every fill since then, this one included).
// Top-ups get no km/L of their own; their litres roll into the next full
// fill. A missing flag (old/imported data) counts as full, so histories made
// only of full fills give the same numbers as the simple fill-to-fill method.

const r2 = (n) => Math.round(n * 100) / 100;
const isFull = (e) => e.is_full_tank !== false && e.is_full_tank !== 0;

/** @param rows car-list fuel entries, oldest first. */
export function buildFuel(rows, now = new Date()) {
  const records = [];
  let prevOdo = null;
  let prevFullOdo = null;
  let litersSinceFull = 0;
  let amountSinceFull = 0;
  for (const e of rows) {
    const liters = Number(e.fuel_liters);
    const odo = e.odometer;
    const kmSince = odo != null && prevOdo != null && odo > prevOdo ? odo - prevOdo : null;
    let kmpl = null;
    let costPerKm = null;
    litersSinceFull += liters > 0 ? liters : 0;
    amountSinceFull += Number(e.amount) || 0;
    if (isFull(e)) {
      if (odo != null && prevFullOdo != null && odo > prevFullOdo && litersSinceFull > 0) {
        kmpl = r2((odo - prevFullOdo) / litersSinceFull);
        costPerKm = amountSinceFull / (odo - prevFullOdo);
      }
      // A full fill without a reading can't anchor the next calculation.
      prevFullOdo = odo ?? null;
      litersSinceFull = 0;
      amountSinceFull = 0;
    }
    records.push({
      id: e.id,
      date: e.purchased_at,
      item_name: e.item_name,
      odometer: odo,
      liters: r2(liters),
      rate: e.fuel_rate,
      amount: e.amount,
      fuel_type: e.fuel_type || 'E92',
      is_full_tank: isFull(e),
      notes: e.notes,
      km_since_last: kmSince,
      km_per_liter: kmpl,
      rs_per_km: kmpl ? r2(costPerKm) : null,
    });
    if (odo != null) prevOdo = odo;
  }
  records.reverse(); // newest first for display

  return { records, stats: stats(rows, records, now) };
}

/**
 * Live numbers for a refill being typed in: km since the last reading and,
 * for a full fill, its km/L and cost per km — same method as buildFuel.
 * @param records buildFuel().records (newest first)
 * @param draft { id?, date (ISO), odometer, liters, amount, full }
 */
export function previewFill(records, draft) {
  const before = records
    .filter((r) => r.id !== draft.id && r.date <= draft.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
  const last = before.find((r) => r.odometer != null) || null;
  const odo = Number(draft.odometer);
  const out = {
    lastOdometer: last?.odometer ?? null,
    lastDate: last?.date ?? null,
    kmSince: null,
    kmpl: null,
    perKm: null,
    lowerThanLast: false,
  };
  if (!odo || !last) return out;
  if (odo <= last.odometer) {
    out.lowerThanLast = true;
    return out;
  }
  out.kmSince = odo - last.odometer;
  if (!draft.full) return out;

  // Walk back to the previous full fill, adding the top-ups in between.
  let liters = Number(draft.liters) || 0;
  let amount = Number(draft.amount) || 0;
  for (const r of before) {
    if (r.is_full_tank) {
      if (r.odometer == null || odo <= r.odometer || liters <= 0) return out;
      out.kmpl = r2((odo - r.odometer) / liters);
      out.perKm = r2(amount / (odo - r.odometer));
      return out;
    }
    liters += r.liters || 0;
    amount += r.amount || 0;
  }
  return out;
}

function stats(rows, records, now) {
  if (!rows.length) {
    return {
      avg_km_per_liter: null, avg_km_per_liter_all_time: null, avg_window: 'last 5 fills',
      last_fill_date: null, last_odometer: null, last_fuel_type: null,
      month_liters: 0, month_spent: 0, month_kms: 0,
      total_records: 0, all_time_liters: 0, all_time_spent: 0,
    };
  }
  const last = rows[rows.length - 1];
  const kmpls = records.map((r) => r.km_per_liter).filter((v) => v > 0);
  const avg = (a) => (a.length ? r2(a.reduce((s, v) => s + v, 0) / a.length) : null);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const month = rows.filter((e) => e.purchased_at >= monthStart);
  const odos = month.map((e) => e.odometer).filter((v) => v != null);
  const sum = (a, f) => r2(a.reduce((s, e) => s + Number(f(e) || 0), 0));

  return {
    avg_km_per_liter: avg(kmpls.slice(0, 5)),
    avg_km_per_liter_all_time: avg(kmpls),
    avg_window: 'last 5 fills',
    last_fill_date: last.purchased_at,
    last_odometer: last.odometer,
    last_fuel_type: last.fuel_type,
    month_liters: sum(month, (e) => e.fuel_liters),
    month_spent: sum(month, (e) => e.amount),
    month_kms: odos.length >= 2 ? Math.max(...odos) - Math.min(...odos) : 0,
    total_records: rows.length,
    all_time_liters: sum(rows, (e) => e.fuel_liters),
    all_time_spent: sum(rows, (e) => e.amount),
  };
}
