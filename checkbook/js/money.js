// Money helpers. Everything is stored in dollars as a Number, rounded to cents.
// Convention across the whole app: negative = money leaving the account,
// positive = money coming in. Same convention the bank feed uses.

export function cents(value) {
  return Math.round((Number(value) || 0) * 100);
}

export function round2(value) {
  return cents(value) / 100;
}

export function sum(values) {
  return round2(values.reduce((total, value) => total + cents(value), 0) / 100);
}

const FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return FORMATTER.format(round2(value));
}

export function formatSigned(value) {
  const rounded = round2(value);
  const formatted = FORMATTER.format(Math.abs(rounded));
  if (rounded > 0) return `+${formatted}`;
  if (rounded < 0) return `−${formatted}`;
  return formatted;
}

// Accepts "1,234.56", "$45", "45.5", "(12.00)" and returns a Number.
export function parseAmount(input) {
  if (typeof input === 'number') return round2(input);
  const raw = String(input ?? '').trim();
  if (!raw) return NaN;
  const negative = /^\(.*\)$/.test(raw);
  const cleaned = raw.replace(/[()$,\s]/g, '');
  const value = Number(cleaned);
  if (Number.isNaN(value)) return NaN;
  return round2(negative ? -value : value);
}

export function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

// Whole days between two YYYY-MM-DD strings (b - a).
export function daysBetween(a, b) {
  const parse = (value) => {
    const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
    return Date.UTC(y, (m || 1) - 1, d || 1);
  };
  return Math.round((parse(b) - parse(a)) / 86400000);
}

export function formatDate(value) {
  if (!value) return '';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  return `${m}/${d}/${String(y).slice(2)}`;
}
