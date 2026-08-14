import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcile, accountTotals, describeOverlap } from '../js/reconcile.js';

const entry = (over = {}) => ({
  id: 'e1',
  accountKey: 'checking',
  date: '2026-08-10',
  description: 'McDonalds',
  amount: -11.40,
  status: 'pending',
  ...over,
});

const txn = (over = {}) => ({
  id: 't1',
  accountKey: 'checking',
  date: '2026-08-13',
  postedDate: '2026-08-13',
  description: "McDonald's",
  amount: -11.40,
  pending: false,
  ...over,
});

test('clears a pending entry when the same amount posts', () => {
  const result = reconcile([entry()], [txn()]);
  assert.equal(result.cleared.length, 1);
  assert.equal(result.cleared[0].entry.id, 'e1');
  assert.equal(result.cleared[0].txn.id, 't1');
  assert.equal(result.stillPending.length, 0);
  assert.equal(result.unmatchedTxns.length, 0);
});

test('clears on amount alone when nothing else could match', () => {
  const result = reconcile(
    [entry({ description: 'Rent' })],
    [txn({ description: 'FIFTH THIRD BANK MTG PMT' })],
  );
  assert.equal(result.cleared.length, 1);
  assert.equal(result.cleared[0].reason, 'only transaction it could be');
});

test('does not auto-clear when two entries share the same amount', () => {
  const result = reconcile(
    [entry({ id: 'a', description: 'gas' }), entry({ id: 'b', description: 'snacks' })],
    [txn({ description: 'Wawa' })],
  );
  assert.equal(result.cleared.length, 0, 'ambiguous pairs must be confirmed by hand');
  assert.equal(result.suggestions.length, 1);
  assert.equal(result.suggestions[0].confidence, 'medium');
  assert.equal(result.stillPending.length, 1);
});

test('merchant name breaks the tie between same-amount entries', () => {
  const result = reconcile(
    [entry({ id: 'a', description: 'Wawa gas' }), entry({ id: 'b', description: 'Home Depot' })],
    [txn({ description: 'Wawa' })],
  );
  assert.equal(result.cleared.length, 1);
  assert.equal(result.cleared[0].entry.id, 'a');
});

test('one posted transaction never clears two entries', () => {
  const result = reconcile(
    [entry({ id: 'a', description: 'Wawa' }), entry({ id: 'b', description: 'Wawa' })],
    [txn({ description: 'Wawa' })],
  );
  assert.equal(result.cleared.length + result.suggestions.length, 1);
  assert.equal(result.stillPending.length, 1);
});

test('two identical charges clear against two posted transactions', () => {
  const result = reconcile(
    [entry({ id: 'a', description: 'Wawa' }), entry({ id: 'b', description: 'Wawa' })],
    [txn({ id: 't1', description: 'Wawa' }), txn({ id: 't2', description: 'Wawa' })],
  );
  assert.equal(result.cleared.length, 2);
  assert.notEqual(result.cleared[0].txn.id, result.cleared[1].txn.id);
});

test('a deposit never clears a withdrawal of the same size', () => {
  const result = reconcile([entry({ amount: -50 })], [txn({ amount: 50 })]);
  assert.equal(result.cleared.length, 0);
  assert.equal(result.suggestions.length, 0);
  assert.equal(result.unmatchedTxns.length, 1);
});

test('an entry on another account is never matched', () => {
  const result = reconcile([entry({ accountKey: 'savings' })], [txn()]);
  assert.equal(result.cleared.length, 0);
  assert.equal(result.unmatchedTxns.length, 1);
});

test('a transaction posted long after the window stays unmatched', () => {
  const result = reconcile([entry({ date: '2026-01-01' })], [txn({ postedDate: '2026-08-13' })]);
  assert.equal(result.cleared.length, 0);
  assert.equal(result.stillPending.length, 1);
});

test('an uncashed check still clears five weeks later', () => {
  const result = reconcile(
    [entry({ date: '2026-07-08', description: 'Check 1042 plumber', checkNo: '1042', amount: -450 })],
    [txn({ postedDate: '2026-08-12', description: 'CHECK # 1042', amount: -450 })],
  );
  assert.equal(result.cleared.length, 1);
  assert.equal(result.cleared[0].reason, 'check #1042 posted');
});

test('a near-miss amount is suggested, never applied silently', () => {
  const result = reconcile(
    [entry({ description: 'Dinner', amount: -40 })],
    [txn({ description: 'Dinner', amount: -46 })],
  );
  assert.equal(result.cleared.length, 0);
  const [suggestion] = result.suggestions;
  assert.equal(suggestion.confidence, 'low');
  assert.match(suggestion.reason, /amount differs/);
});

test('a tip added after the fact still gets suggested', () => {
  const result = reconcile(
    [entry({ description: 'Dinner Applebees', amount: -40 })],
    [txn({ description: 'Applebees', amount: -47.5 })],
  );
  assert.equal(result.cleared.length, 0, 'a different amount is never cleared on its own');
  assert.equal(result.suggestions.length, 1);
});

test('the tip allowance never scales up to a mortgage payment', () => {
  const result = reconcile(
    [entry({ description: 'Mortgage', amount: -2245.96 })],
    [txn({ description: 'Mortgage', amount: -2100 })],
  );
  assert.equal(result.suggestions.length, 0, '$146 apart is a different transaction');
});

test('tolerance settings are respected when overridden', () => {
  const result = reconcile(
    [entry({ description: 'Dinner', amount: -40 })],
    [txn({ description: 'Dinner', amount: -41.5 })],
    { amountTolerance: 1, amountTolerancePercent: 0 },
  );
  assert.equal(result.suggestions.length, 0);
});

test('already-linked transactions are skipped so re-syncing is safe', () => {
  const result = reconcile([entry()], [txn()], { linkedTxnIds: ['t1'] });
  assert.equal(result.cleared.length, 0);
  assert.equal(result.stillPending.length, 1);
  assert.equal(result.unmatchedTxns.length, 0);
});

test('cleared entries are left alone on re-run', () => {
  const result = reconcile([entry({ status: 'cleared' })], [txn()]);
  assert.equal(result.cleared.length, 0);
  assert.equal(result.unmatchedTxns.length, 1, 'the posted txn is offered as a new entry instead');
});

test('bank-pending holds are ignored until they post', () => {
  const result = reconcile([entry()], [txn({ pending: true })]);
  assert.equal(result.cleared.length, 0);
  assert.equal(result.stillPending.length, 1);
});

test('descriptions overlap on merchant words, not on bank boilerplate', () => {
  assert.ok(describeOverlap('Wawa gas', 'PURCHASE AUTHORIZED ON 08/12 WAWA XXX NJ CARD 4604') > 0);
  assert.equal(describeOverlap('Wawa', 'PURCHASE AUTHORIZED CARD DEBIT'), 0);
});

test('checking balance subtracts what has not cleared yet', () => {
  const account = { key: 'checking', kind: 'checking', balance: { current: 29.19 } };
  const totals = accountTotals(account, [
    { accountKey: 'checking', amount: -20, status: 'pending' },
    { accountKey: 'checking', amount: -100, status: 'cleared' },
  ]);
  assert.equal(totals.bankBalance, 29.19);
  assert.equal(totals.pendingTotal, -20);
  assert.equal(totals.real, 9.19);
  assert.equal(totals.pendingCount, 1);
});

test('a pending deposit raises the real balance', () => {
  const account = { key: 'checking', kind: 'checking', balance: { current: 100 } };
  const totals = accountTotals(account, [{ accountKey: 'checking', amount: 250, status: 'pending' }]);
  assert.equal(totals.real, 350);
});

test('a pending charge on a credit card increases what is owed', () => {
  const account = { key: 'card', kind: 'credit', balance: { current: 5075.83 } };
  const totals = accountTotals(account, [{ accountKey: 'card', amount: -24.17, status: 'pending' }]);
  assert.equal(totals.real, 5100);
});

test('an account whose balance the plan hides reports unknown, not zero', () => {
  const account = { key: 'amex', kind: 'credit', balance: {} };
  const totals = accountTotals(account, [{ accountKey: 'amex', amount: -10, status: 'pending' }]);
  assert.equal(totals.balanceKnown, false);
  assert.equal(totals.real, null);
  assert.equal(totals.pendingTotal, -10);
});
