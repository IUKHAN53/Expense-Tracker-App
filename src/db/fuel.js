// Fuel records + stats, ported from the backend FuelController.
// km/L per fill = (this odometer − previous odometer) / this fill's litres.
// Fills without an odometer are shown but skipped when chaining.

const r2 = (n) => Math.round(n * 100) / 100;

/** @param rows car-list fuel entries, oldest first. */
export function buildFuel(rows, now = new Date()) {
  const records = [];
  let prevOdo = null;
  for (const e of rows) {
    const liters = Number(e.fuel_liters);
    const odo = e.odometer;
    let kmSince = null;
    let kmpl = null;
    if (odo != null && prevOdo != null && odo > prevOdo && liters > 0) {
      kmSince = odo - prevOdo;
      kmpl = r2(kmSince / liters);
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
      is_full_tank: !!e.is_full_tank,
      notes: e.notes,
      km_since_last: kmSince,
      km_per_liter: kmpl,
      rs_per_km: kmSince ? r2(e.amount / kmSince) : null,
    });
    if (odo != null) prevOdo = odo;
  }
  records.reverse(); // newest first for display

  return { records, stats: stats(rows, records, now) };
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
