import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, '..', 'tools', 'build-snapshot.mjs');
const fixture = (name) => join(here, 'fixtures', name);

const snapshot = JSON.parse(execFileSync('node', [
  script,
  fixture('era-accounts.json'),
  fixture('era-transactions.json'),
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));

test('every account from the feed lands in the snapshot', () => {
  assert.equal(snapshot.accounts.length, 4);
  assert.deepEqual(
    snapshot.accounts.map((account) => account.key),
    ['uagr_visible_checking', 'uagr_visible_credit', 'uagr_excluded_card', 'uagr_mangled'],
  );
});

test('a name mangled by the provider is cleaned up', () => {
  const account = snapshot.accounts.find((candidate) => candidate.key === 'uagr_mangled');
  assert.equal(account.name, 'WAY2SAVE SAVINGS ...1937');
});

test('a known balance is carried across', () => {
  const checking = snapshot.accounts.find((account) => account.key === 'uagr_visible_checking');
  assert.equal(checking.balance.current, 29.19);
  assert.equal(checking.balance.available, 6.30);
  assert.equal(checking.type, 'Checking');
});

test('an account the plan excludes reports no balance and says why', () => {
  const excluded = snapshot.accounts.find((account) => account.key === 'uagr_excluded_card');
  assert.equal('current' in excluded.balance, false, 'must not invent a zero balance');
  assert.match(excluded.balance_unavailable_reason, /plan/);
});

test('transactions keep their ids, dates and sign', () => {
  const mcd = snapshot.transactions.find((txn) => txn.id === 'utgr_mcd');
  assert.equal(mcd.accountKey, 'uagr_visible_checking');
  assert.equal(mcd.amount, -11.40);
  assert.equal(mcd.date, '2026-08-12');
  assert.equal(mcd.postedDate, '2026-08-13');
  assert.equal(mcd.merchantName, "McDonald's");
  assert.match(mcd.originalDescription, /MCDONALD/);
});

test('a bank hold is carried through flagged as pending', () => {
  const hold = snapshot.transactions.find((txn) => txn.id === 'utgr_hold');
  assert.equal(hold.pending, true);
});

test('transactions come back newest first', () => {
  const dates = snapshot.transactions.map((txn) => txn.postedDate);
  assert.deepEqual(dates, [...dates].sort().reverse());
});
