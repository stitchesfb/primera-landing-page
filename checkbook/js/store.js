// State + persistence. Everything lives in this browser's localStorage; no
// account, no server, no copy of your money data anywhere else.

import { round2, today } from './money.js';
import { reconcile } from './reconcile.js';

const KEY = 'realbalance.v1';

const EMPTY = {
  version: 1,
  accounts: [],       // { key, name, institution, kind, balance, balanceAsOf, balanceHidden }
  entries: [],        // { id, accountKey, date, description, amount, status, ... }
  bankTxns: [],       // last synced posted transactions, kept for matching + review
  links: {},          // bankTxnId -> entryId
  ignoredTxns: [],    // bank transactions you chose not to add to the register
  lastSync: null,
  settings: { autoClear: true },
};

const KIND_BY_TYPE = {
  Checking: 'checking',
  Savings: 'savings',
  CreditCard: 'credit',
  PersonalLoan: 'loan',
  Loan: 'loan',
  Mortgage: 'loan',
  Investment: 'investment',
  ManualAsset: 'checking',
  ManualLiability: 'credit',
};

export function newId(prefix = 'e') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export const store = {
  state: structuredClone(EMPTY),

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.state = { ...structuredClone(EMPTY), ...JSON.parse(raw) };
    } catch (error) {
      console.warn('Could not read saved data, starting fresh.', error);
      this.state = structuredClone(EMPTY);
    }
    return this.state;
  },

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('Could not save. Your browser storage may be full.', error);
    }
  },

  // ---- register -----------------------------------------------------------

  addEntry(input) {
    const entry = {
      id: newId(),
      accountKey: input.accountKey,
      date: input.date || today(),
      description: String(input.description || '').trim(),
      amount: round2(input.amount),
      checkNo: String(input.checkNo || '').trim(),
      note: String(input.note || '').trim(),
      status: input.status || 'pending',
      source: input.source || 'manual',
      bankTxnId: input.bankTxnId || null,
      clearedOn: input.clearedOn || null,
      createdAt: new Date().toISOString(),
    };
    this.state.entries.unshift(entry);
    if (entry.bankTxnId) this.state.links[entry.bankTxnId] = entry.id;
    this.save();
    return entry;
  },

  updateEntry(id, patch) {
    const entry = this.state.entries.find((candidate) => candidate.id === id);
    if (!entry) return null;
    Object.assign(entry, patch);
    if ('amount' in patch) entry.amount = round2(patch.amount);
    this.save();
    return entry;
  },

  deleteEntry(id) {
    const entry = this.state.entries.find((candidate) => candidate.id === id);
    if (entry && entry.bankTxnId) delete this.state.links[entry.bankTxnId];
    this.state.entries = this.state.entries.filter((candidate) => candidate.id !== id);
    this.save();
  },

  // Marking cleared by hand — for accounts with no feed, or when you can see it
  // on the bank site before the sync catches up.
  setStatus(id, status) {
    const entry = this.state.entries.find((candidate) => candidate.id === id);
    if (!entry) return;
    entry.status = status;
    if (status === 'cleared') {
      entry.clearedOn = entry.clearedOn || today();
    } else {
      entry.clearedOn = null;
      if (entry.bankTxnId) {
        delete this.state.links[entry.bankTxnId];
        entry.bankTxnId = null;
      }
    }
    this.save();
  },

  // ---- accounts -----------------------------------------------------------

  addManualAccount(name, kind = 'checking', openingBalance = 0) {
    const account = {
      key: newId('acct'),
      name: String(name || 'Account').trim(),
      institution: 'Manual',
      kind,
      manual: true,
      balance: { current: round2(openingBalance), currency: 'USD' },
      balanceAsOf: new Date().toISOString(),
      balanceHidden: false,
    };
    this.state.accounts.push(account);
    this.save();
    return account;
  },

  setManualBalance(key, balance) {
    const account = this.state.accounts.find((candidate) => candidate.key === key);
    if (!account) return;
    account.balance = { ...account.balance, current: round2(balance) };
    account.balanceAsOf = new Date().toISOString();
    account.balanceHidden = false;
    this.save();
  },

  // ---- sync ---------------------------------------------------------------

  /**
   * Fold a bank snapshot into the register: refresh balances, clear the pending
   * entries that have posted, and hand back everything that needs a human.
   */
  applySnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.accounts)) {
      throw new Error('That file does not look like a bank snapshot.');
    }

    for (const incoming of snapshot.accounts) {
      const balance = incoming.balance || {};
      const known = typeof balance.current === 'number';
      const existing = this.state.accounts.find((candidate) => candidate.key === incoming.key);
      const fields = {
        key: incoming.key,
        name: incoming.name,
        institution: incoming.institution || '',
        kind: KIND_BY_TYPE[incoming.type] || incoming.kind || 'checking',
        balance: known ? { ...balance, current: round2(balance.current) } : { currency: balance.currency || 'USD' },
        balanceAsOf: incoming.balance_as_of || snapshot.generated_at || null,
        // The feed can legitimately withhold a balance (plan limits, a
        // connection that needs repair). Say so — never show it as $0.
        balanceHidden: !known,
        hiddenReason: incoming.balance_unavailable_reason || null,
      };
      if (existing) {
        if (existing.manual && !known) continue; // keep a manual balance we own
        Object.assign(existing, fields, { manual: false });
      } else {
        this.state.accounts.push(fields);
      }
    }

    const incomingTxns = (snapshot.transactions || []).map((txn) => ({
      id: txn.id,
      accountKey: txn.accountKey || txn.account,
      date: txn.date,
      postedDate: txn.postedDate || txn.posted_date || txn.date,
      description: txn.description || '',
      originalDescription: txn.originalDescription || txn.original_description || '',
      merchantName: txn.merchantName || txn.merchant_name || '',
      amount: round2(txn.amount),
      category: txn.category || '',
      pending: Boolean(txn.pending ?? txn.is_pending),
    }));

    // Merge rather than replace: a shorter snapshot must not erase history.
    const byId = new Map(this.state.bankTxns.map((txn) => [txn.id, txn]));
    let added = 0;
    for (const txn of incomingTxns) {
      if (!byId.has(txn.id)) added += 1;
      byId.set(txn.id, txn);
    }
    this.state.bankTxns = [...byId.values()].sort((a, b) => (a.postedDate < b.postedDate ? 1 : -1));

    const autoCleared = this.autoReconcile({ save: false });
    const result = reconcile(this.state.entries, this.state.bankTxns, {
      linkedTxnIds: Object.keys(this.state.links),
    });

    this.state.lastSync = new Date().toISOString();
    this.save();

    const ignored = new Set(this.state.ignoredTxns);
    return {
      autoCleared: this.state.settings.autoClear ? autoCleared : [],
      suggestions: [
        ...(this.state.settings.autoClear ? [] : result.cleared),
        ...result.suggestions,
      ],
      newFromBank: result.unmatchedTxns.filter((txn) => !ignored.has(txn.id)),
      stillPending: result.stillPending,
      addedTxnCount: added,
      accountCount: snapshot.accounts.length,
      generatedAt: snapshot.generated_at || null,
    };
  },

  /**
   * Clear every pending entry that unambiguously matches a posted transaction.
   * Safe to call at any time — it only ever acts on high-confidence matches,
   * so an entry you type today against a transaction that posted yesterday
   * clears immediately instead of waiting for the next sync.
   */
  autoReconcile({ save = true } = {}) {
    if (!this.state.settings.autoClear) return [];
    const result = reconcile(this.state.entries, this.state.bankTxns, {
      linkedTxnIds: Object.keys(this.state.links),
    });
    for (const match of result.cleared) {
      this.applyMatch(match.entry.id, match.txn.id, { save: false });
    }
    if (save && result.cleared.length) this.save();
    return result.cleared;
  },

  // Tie a register entry to the posted transaction that settled it.
  applyMatch(entryId, txnId, { save = true } = {}) {
    const entry = this.state.entries.find((candidate) => candidate.id === entryId);
    const txn = this.state.bankTxns.find((candidate) => candidate.id === txnId);
    if (!entry || !txn) return null;

    entry.status = 'cleared';
    entry.bankTxnId = txn.id;
    entry.clearedOn = txn.postedDate || txn.date;
    entry.clearedAmount = txn.amount;
    // The bank is the authority on what actually left the account.
    if (round2(entry.amount) !== round2(txn.amount)) {
      entry.originalAmount = entry.amount;
      entry.amount = round2(txn.amount);
    }
    this.state.links[txn.id] = entry.id;
    if (save) this.save();
    return entry;
  },

  // A posted transaction you never wrote down — add it, already cleared.
  adoptTxn(txnId) {
    const txn = this.state.bankTxns.find((candidate) => candidate.id === txnId);
    if (!txn) return null;
    return this.addEntry({
      accountKey: txn.accountKey,
      date: txn.postedDate || txn.date,
      description: txn.description || txn.merchantName || 'Bank transaction',
      amount: txn.amount,
      status: 'cleared',
      source: 'bank',
      bankTxnId: txn.id,
      clearedOn: txn.postedDate || txn.date,
    });
  },

  ignoreTxn(txnId) {
    if (!this.state.ignoredTxns.includes(txnId)) this.state.ignoredTxns.push(txnId);
    this.save();
  },

  pendingReview() {
    const ignored = new Set(this.state.ignoredTxns);
    const result = reconcile(this.state.entries, this.state.bankTxns, {
      linkedTxnIds: Object.keys(this.state.links),
    });
    return {
      suggestions: [...(this.state.settings.autoClear ? [] : result.cleared), ...result.suggestions],
      newFromBank: result.unmatchedTxns.filter((txn) => !ignored.has(txn.id)),
    };
  },

  exportJson() {
    return JSON.stringify(this.state, null, 2);
  },

  importJson(text) {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.entries)) throw new Error('Not a Real Balance backup file.');
    this.state = { ...structuredClone(EMPTY), ...parsed };
    this.save();
  },

  reset() {
    this.state = structuredClone(EMPTY);
    this.save();
  },
};
