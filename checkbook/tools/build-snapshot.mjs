#!/usr/bin/env node
// Turn raw Era Context MCP responses into a bank snapshot the app can read.
//
//   node tools/build-snapshot.mjs accounts.json txns-*.json > data/bank-snapshot.json
//
// `accounts.json`  = the response from accounts__list_financial_accounts
// `txns-*.json`    = one or more responses from transactions__list_transactions
//
// Anything already in snapshot shape passes through untouched, so the same
// script works for other feeds (Plaid, a CSV converter, a bank export).

import { readFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: build-snapshot.mjs <accounts.json> [transactions.json ...]');
  process.exit(1);
}

const accounts = new Map();
const transactions = new Map();

function addAccount(raw) {
  const key = raw.account_group_key || raw.key;
  if (!key) return;
  const balance = raw.balance || {};
  const hasBalance = typeof balance.current === 'number';

  accounts.set(key, {
    key,
    name: raw.name,
    institution: raw.institution || '',
    type: raw.type || 'Checking',
    // An account excluded by the plan comes back with a currency and nothing
    // else. Keep it that way: unknown must never be rendered as zero.
    balance: hasBalance
      ? {
          current: raw.balance.current,
          ...(typeof balance.available === 'number' ? { available: balance.available } : {}),
          currency: balance.currency || 'USD',
        }
      : { currency: balance.currency || 'USD' },
    ...(raw.balance_as_of ? { balance_as_of: raw.balance_as_of } : {}),
    ...(hasBalance
      ? {}
      : {
          balance_unavailable_reason: raw.visibility === 'tier_excluded'
            ? 'balance not included on your current plan'
            : 'balance not provided by the bank feed',
        }),
  });
}

function addTransaction(raw) {
  const id = raw.transaction_id || raw.id;
  if (!id) return;
  transactions.set(id, {
    id,
    accountKey: raw.account_group_key || raw.accountKey,
    date: (raw.transaction_date || raw.date || '').slice(0, 10),
    postedDate: (raw.posted_date || raw.postedDate || raw.transaction_date || raw.date || '').slice(0, 10),
    description: raw.description || raw.merchant_name || '',
    ...(raw.merchant_name || raw.merchantName ? { merchantName: raw.merchant_name || raw.merchantName } : {}),
    ...(raw.original_description || raw.originalDescription
      ? { originalDescription: raw.original_description || raw.originalDescription }
      : {}),
    amount: Number(raw.amount),
    ...(raw.category ? { category: raw.category } : {}),
    pending: Boolean(raw.is_pending ?? raw.pending ?? false),
  });
}

for (const file of files) {
  const payload = JSON.parse(readFileSync(file, 'utf8'));
  for (const account of payload.accounts || []) addAccount(account);
  for (const txn of payload.transactions || []) addTransaction(txn);
}

if (!accounts.size) {
  console.error('No accounts found. Pass the accounts__list_financial_accounts response first.');
  process.exit(1);
}

const snapshot = {
  generated_at: new Date().toISOString(),
  source: 'era-context-mcp',
  accounts: [...accounts.values()],
  transactions: [...transactions.values()].sort((a, b) => (a.postedDate < b.postedDate ? 1 : -1)),
};

process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
console.error(`Wrote ${snapshot.accounts.length} accounts and ${snapshot.transactions.length} transactions.`);
