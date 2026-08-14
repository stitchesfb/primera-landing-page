import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal localStorage so the store can run outside a browser.
const backing = new Map();
globalThis.localStorage = {
  getItem: (key) => (backing.has(key) ? backing.get(key) : null),
  setItem: (key, value) => backing.set(key, String(value)),
  removeItem: (key) => backing.delete(key),
};

const { store } = await import('../js/store.js');

const snapshot = (over = {}) => ({
  generated_at: '2026-08-14T18:00:00Z',
  accounts: [
    {
      key: 'checking',
      name: 'EVERYDAY CHECKING ...7930',
      institution: 'Wells Fargo',
      type: 'Checking',
      balance: { current: 29.19, available: 6.30, currency: 'USD' },
    },
    {
      key: 'amex',
      name: 'Blue from American Express',
      type: 'CreditCard',
      balance: { currency: 'USD' },
      balance_unavailable_reason: 'balance not included on your current plan',
    },
  ],
  transactions: [],
  ...over,
});

const txn = (over = {}) => ({
  id: 't1',
  accountKey: 'checking',
  date: '2026-08-13',
  postedDate: '2026-08-13',
  description: 'Wawa',
  amount: -15.76,
  pending: false,
  ...over,
});

const today = new Date().toISOString().slice(0, 10);

test.beforeEach(() => {
  backing.clear();
  store.reset();
});

test('a first sync files old activity as history, not as new', () => {
  const report = store.applySnapshot(snapshot({ transactions: [txn(), txn({ id: 't2', amount: -40 })] }));
  assert.equal(report.newFromBank.length, 0, 'history is already in the bank balance');
  assert.equal(store.state.startedOn, today);
});

test('activity after the first sync does show up as new', () => {
  store.applySnapshot(snapshot({ transactions: [txn()] }));
  const report = store.applySnapshot(snapshot({
    transactions: [txn(), txn({ id: 't_today', postedDate: today, description: 'New charge' })],
  }));
  assert.deepEqual(report.newFromBank.map((t) => t.id), ['t_today']);
});

test('an unknown balance survives the round trip as unknown', () => {
  store.applySnapshot(snapshot());
  const amex = store.state.accounts.find((account) => account.key === 'amex');
  assert.equal(amex.balanceHidden, true);
  assert.equal(amex.balance.current, undefined);
  assert.match(amex.hiddenReason, /plan/);
});

test('a later snapshot updates balances without duplicating accounts', () => {
  store.applySnapshot(snapshot());
  store.applySnapshot(snapshot({
    accounts: [{ key: 'checking', name: 'EVERYDAY CHECKING ...7930', type: 'Checking', balance: { current: 500, currency: 'USD' } }],
  }));
  assert.equal(store.state.accounts.length, 2);
  assert.equal(store.state.accounts.find((a) => a.key === 'checking').balance.current, 500);
});

test('a short snapshot does not erase transactions already known', () => {
  store.applySnapshot(snapshot({ transactions: [txn(), txn({ id: 't2' })] }));
  store.applySnapshot(snapshot({ transactions: [txn({ id: 't3' })] }));
  assert.deepEqual(store.state.bankTxns.map((t) => t.id).sort(), ['t1', 't2', 't3']);
});

test('a pending entry clears on the sync that brings its transaction in', () => {
  store.applySnapshot(snapshot());
  store.addEntry({ accountKey: 'checking', date: '2026-08-13', description: 'Wawa', amount: -15.76 });
  const report = store.applySnapshot(snapshot({ transactions: [txn()] }));

  assert.equal(report.autoCleared.length, 1);
  const entry = store.state.entries[0];
  assert.equal(entry.status, 'cleared');
  assert.equal(entry.bankTxnId, 't1');
  assert.equal(store.state.links.t1, entry.id);
});

test('re-syncing the same data does not clear anything twice', () => {
  store.applySnapshot(snapshot());
  store.addEntry({ accountKey: 'checking', date: '2026-08-13', description: 'Wawa', amount: -15.76 });
  store.applySnapshot(snapshot({ transactions: [txn()] }));
  const again = store.applySnapshot(snapshot({ transactions: [txn()] }));

  assert.equal(again.autoCleared.length, 0);
  assert.equal(store.state.entries.filter((e) => e.status === 'cleared').length, 1);
});

test('when the bank takes a different amount, the bank wins and both are kept', () => {
  store.applySnapshot(snapshot());
  store.addEntry({ accountKey: 'checking', date: '2026-08-13', description: 'Dinner', amount: -40 });
  store.applySnapshot(snapshot({ transactions: [txn({ description: 'Dinner', amount: -47.5 })] }));

  // Different amounts are never auto-applied, so confirm it the way the UI does.
  store.applyMatch(store.state.entries[0].id, 't1');
  const entry = store.state.entries[0];
  assert.equal(entry.amount, -47.5);
  assert.equal(entry.originalAmount, -40);
});

test('turning off auto-clear leaves the match for you to confirm', () => {
  store.applySnapshot(snapshot());
  store.state.settings.autoClear = false;
  store.addEntry({ accountKey: 'checking', date: '2026-08-13', description: 'Wawa', amount: -15.76 });
  const report = store.applySnapshot(snapshot({ transactions: [txn()] }));

  assert.equal(report.autoCleared.length, 0);
  assert.equal(report.suggestions.length, 1);
  assert.equal(store.state.entries[0].status, 'pending');
});

test('marking an entry pending again releases its bank transaction', () => {
  store.applySnapshot(snapshot());
  store.addEntry({ accountKey: 'checking', date: '2026-08-13', description: 'Wawa', amount: -15.76 });
  store.applySnapshot(snapshot({ transactions: [txn()] }));

  const entry = store.state.entries[0];
  store.setStatus(entry.id, 'pending');
  assert.equal(store.state.links.t1, undefined);
  assert.equal(entry.bankTxnId, null);
});

test('deleting a cleared entry frees its transaction to be matched again', () => {
  store.applySnapshot(snapshot());
  store.addEntry({ accountKey: 'checking', date: '2026-08-13', description: 'Wawa', amount: -15.76 });
  store.applySnapshot(snapshot({ transactions: [txn()] }));

  store.deleteEntry(store.state.entries[0].id);
  assert.equal(store.state.links.t1, undefined);
});

test('a garbage file is rejected instead of wiping the register', () => {
  store.applySnapshot(snapshot());
  store.addEntry({ accountKey: 'checking', date: '2026-08-13', description: 'Wawa', amount: -15.76 });
  assert.throws(() => store.applySnapshot({ nonsense: true }), /bank snapshot/);
  assert.equal(store.state.entries.length, 1);
});

test('state survives being written and read back', () => {
  store.applySnapshot(snapshot({ transactions: [txn()] }));
  store.addEntry({ accountKey: 'checking', date: today, description: 'Supplies', amount: -325.40 });

  store.state = { version: 1, accounts: [], entries: [], bankTxns: [], links: {}, ignoredTxns: [], settings: {} };
  store.load();

  assert.equal(store.state.entries.length, 1);
  assert.equal(store.state.entries[0].description, 'Supplies');
  assert.equal(store.state.accounts.length, 2);
});
