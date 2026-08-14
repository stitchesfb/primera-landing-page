// Reconciliation engine.
//
// The register holds entries you typed in yourself. The bank feed holds
// transactions that have actually posted. This module decides which of your
// pending entries correspond to which posted bank transactions, so an entry
// stops being "pending" the moment the money really left the account.
//
// It is deliberately free of DOM and storage concerns so it can be unit tested
// with plain `node --test`.

import { cents, round2, daysBetween } from './money.js';

export const DEFAULTS = {
  // A posted transaction can be at most this many days after the date you
  // wrote on the entry (a check can sit uncashed for weeks).
  windowDaysAfter: 45,
  // ...and at most this many days before it (you may have back-dated slightly).
  windowDaysBefore: 3,
  // Amounts that are not identical can still be proposed as a match when they
  // are within this much. The percentage covers the case that actually happens
  // — a restaurant tip added after you wrote down the bill — while the cap
  // stops a percentage of a mortgage payment from swallowing half the register.
  amountTolerance: 2.0,
  amountTolerancePercent: 0.2,
  amountToleranceCap: 15.0,
};

function toleranceFor(amount, options) {
  const percent = Math.abs(amount) * options.amountTolerancePercent;
  return Math.min(options.amountToleranceCap, Math.max(options.amountTolerance, percent));
}

const NOISE = new Set([
  'purchase', 'authorized', 'card', 'debit', 'credit', 'transfer', 'the', 'and',
  'llc', 'inc', 'co', 'com', 'pos', 'ach', 'recurring', 'payment', 'pmt', 'from',
  'ref', 'id', 'transaction', 'withdrawal', 'deposit', 'online', 'mobile',
]);

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !NOISE.has(token) && !/^x+\d*$/.test(token));
}

// Share of the shorter token set that also appears in the longer one.
export function describeOverlap(a, b) {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  if (!left.size || !right.size) return 0;
  let hits = 0;
  for (const token of left) {
    if (right.has(token)) hits += 1;
  }
  return hits / Math.min(left.size, right.size);
}

function checkNumberMatches(entry, txn) {
  const checkNo = String(entry.checkNo || '').trim();
  if (!checkNo) return false;
  const haystack = `${txn.description || ''} ${txn.originalDescription || ''}`;
  return new RegExp(`(^|\\D)0*${checkNo}(\\D|$)`).test(haystack);
}

function buildCandidate(entry, txn, options) {
  // Money must move the same direction. A $40 debit never clears a $40 deposit.
  if (Math.sign(cents(entry.amount)) !== Math.sign(cents(txn.amount))) return null;

  const delta = daysBetween(entry.date, txn.postedDate || txn.date);
  if (delta > options.windowDaysAfter) return null;
  if (delta < -options.windowDaysBefore) return null;

  const diff = Math.abs(cents(entry.amount) - cents(txn.amount)) / 100;
  const amountExact = diff < 0.005;
  if (!amountExact && diff > toleranceFor(entry.amount, options)) return null;

  const overlap = describeOverlap(entry.description, `${txn.description || ''} ${txn.merchantName || ''}`);
  const checkMatch = checkNumberMatches(entry, txn);

  let score = amountExact ? 100 : Math.max(10, 45 - diff * 10);
  score += Math.max(0, 25 - Math.abs(delta) * 2);
  score += overlap * 30;
  if (checkMatch) score += 40;

  return { entry, txn, amountExact, amountDiff: diff, delta, overlap, checkMatch, score };
}

/**
 * @param {Array} entries  register entries (only `pending` ones are considered)
 * @param {Array} bankTxns posted transactions from the bank feed
 * @param {Object} opts    { linkedTxnIds: Set|Array, ...DEFAULTS overrides }
 * @returns {{cleared: Array, suggestions: Array, unmatchedTxns: Array, stillPending: Array}}
 */
export function reconcile(entries, bankTxns, opts = {}) {
  const options = { ...DEFAULTS, ...opts };
  const linked = new Set(opts.linkedTxnIds || []);

  const pending = (entries || []).filter((entry) => entry.status === 'pending');
  const available = (bankTxns || []).filter((txn) => !linked.has(txn.id) && !txn.pending);

  const candidates = [];
  for (const entry of pending) {
    for (const txn of available) {
      if (entry.accountKey !== txn.accountKey) continue;
      const candidate = buildCandidate(entry, txn, options);
      if (candidate) candidates.push(candidate);
    }
  }

  // An exact-amount pair that is the only option on both sides is unambiguous:
  // there is nothing else it could possibly be. That is what lets us clear an
  // entry without asking, even when the descriptions look nothing alike
  // ("Rent" vs "FIFTH THIRD BANK MTG PMT").
  const exact = candidates.filter((candidate) => candidate.amountExact);
  const perEntry = new Map();
  const perTxn = new Map();
  for (const candidate of exact) {
    perEntry.set(candidate.entry.id, (perEntry.get(candidate.entry.id) || 0) + 1);
    perTxn.set(candidate.txn.id, (perTxn.get(candidate.txn.id) || 0) + 1);
  }

  for (const candidate of candidates) {
    const unique = candidate.amountExact
      && perEntry.get(candidate.entry.id) === 1
      && perTxn.get(candidate.txn.id) === 1;
    const strongName = candidate.amountExact && (candidate.overlap >= 0.34 || candidate.checkMatch);

    candidate.unique = Boolean(unique);
    candidate.confidence = (unique || strongName) ? 'high' : candidate.amountExact ? 'medium' : 'low';
    candidate.reason = candidate.checkMatch
      ? `check #${candidate.entry.checkNo} posted`
      : !candidate.amountExact
        ? `amount differs by ${candidate.amountDiff.toFixed(2)}`
        : strongName
          ? 'same amount and merchant'
          : unique
            ? 'only transaction it could be'
            : 'same amount, more than one possible match';
  }

  const rank = { high: 3, medium: 2, low: 1 };
  candidates.sort((a, b) => (rank[b.confidence] - rank[a.confidence]) || (b.score - a.score));

  const usedEntries = new Set();
  const usedTxns = new Set();
  const cleared = [];
  const suggestions = [];

  for (const candidate of candidates) {
    if (usedEntries.has(candidate.entry.id) || usedTxns.has(candidate.txn.id)) continue;
    usedEntries.add(candidate.entry.id);
    usedTxns.add(candidate.txn.id);
    (candidate.confidence === 'high' ? cleared : suggestions).push(candidate);
  }

  return {
    cleared,
    suggestions,
    unmatchedTxns: available.filter((txn) => !usedTxns.has(txn.id)),
    stillPending: pending.filter((entry) => !usedEntries.has(entry.id)),
  };
}

// Balance math, kept here so the UI never invents its own arithmetic.
export function accountTotals(account, entries) {
  const mine = (entries || []).filter((entry) => entry.accountKey === account.key);
  const pending = mine.filter((entry) => entry.status === 'pending');
  const pendingTotal = round2(pending.reduce((total, entry) => total + cents(entry.amount), 0) / 100);

  const bankBalance = account.balance && typeof account.balance.current === 'number'
    ? account.balance.current
    : null;

  // A credit-card balance is a debt: the feed reports it as a positive number,
  // so pending charges (negative) have to be subtracted rather than added.
  const isDebt = account.kind === 'credit' || account.kind === 'loan';
  const real = bankBalance === null
    ? null
    : round2(isDebt ? bankBalance - pendingTotal : bankBalance + pendingTotal);

  return {
    bankBalance,
    pendingTotal,
    pendingCount: pending.length,
    real,
    isDebt,
    balanceKnown: bankBalance !== null,
  };
}
