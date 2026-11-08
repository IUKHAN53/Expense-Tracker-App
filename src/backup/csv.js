// Plain CSV of every entry, for spreadsheets. Not encrypted — the UI warns.

const COLUMNS = [
  'date', 'list', 'category', 'item', 'amount', 'quantity', 'unit', 'notes',
  'fuel_liters', 'fuel_rate', 'odometer', 'fuel_type', 'original_amount', 'original_currency',
];

function cell(v) {
  if (v == null) return '';
  let s = String(v);
  // Stop spreadsheets treating text as a formula (CSV injection).
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** @param snapshot output of db.exportAll() */
export function snapshotToCsv(snapshot) {
  const lists = new Map(snapshot.lists.map((l) => [l.id, l.name]));
  const cats = new Map(snapshot.categories.map((c) => [c.id, c.name]));
  const rows = [...snapshot.entries]
    .sort((a, b) => (a.purchased_at < b.purchased_at ? -1 : 1))
    .map((e) => [
      e.purchased_at, lists.get(e.spending_list_id), cats.get(e.category_id), e.item_name,
      e.amount, e.quantity, e.unit, e.notes, e.fuel_liters, e.fuel_rate, e.odometer,
      e.fuel_type, e.original_amount, e.original_currency,
    ].map(cell).join(','));
  return [COLUMNS.join(','), ...rows].join('\r\n');
}
