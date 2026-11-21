// Tiny calculator for amount fields: "250+180", "1200/3", "3*450-50".
// Only digits, dots and + - * / (also × ÷); anything else, or a dangling operator, gives null.

/** Characters an amount field may contain while typing. */
export const cleanExpr = (t) => String(t).replace(/×/g, '*').replace(/÷/g, '/').replace(/[^0-9.+\-*/]/g, '');

/** True when the text is a sum, not just a number. */
export const isExpr = (t) => /\d\s*[+\-*/]\s*\d/.test(cleanExpr(t));

/** Evaluate with normal precedence (* and / before + and -). Returns a number rounded to 2dp, or null. */
export function evaluate(text) {
  const s = cleanExpr(text);
  if (!s || !/^\d*\.?\d+([+\-*/]\d*\.?\d+)*$/.test(s)) return null;
  const tokens = s.match(/\d*\.?\d+|[+\-*/]/g);
  // First pass: fold * and / into the running term.
  const terms = [Number(tokens[0])];
  const ops = [];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const n = Number(tokens[i + 1]);
    if (op === '*') terms[terms.length - 1] *= n;
    else if (op === '/') {
      if (n === 0) return null;
      terms[terms.length - 1] /= n;
    } else {
      ops.push(op);
      terms.push(n);
    }
  }
  let total = terms[0];
  ops.forEach((op, i) => { total = op === '+' ? total + terms[i + 1] : total - terms[i + 1]; });
  return Number.isFinite(total) ? Math.round(total * 100) / 100 : null;
}
