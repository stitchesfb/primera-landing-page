// UI wiring. Reads from `store`, renders, and turns clicks back into store calls.

import { store } from './store.js';
import { accountTotals } from './reconcile.js';
import { formatMoney, formatSigned, formatDate, parseAmount, round2, today, daysBetween } from './money.js';

const $ = (id) => document.getElementById(id);
const CASH_KINDS = new Set(['checking', 'savings']);

const view = { filter: 'all', account: 'all', search: '' };

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
));

function toast(message) {
  const node = $('toast');
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { node.hidden = true; }, 4000);
}

function accountById(key) {
  return store.state.accounts.find((account) => account.key === key);
}

function accountName(key) {
  const account = accountById(key);
  return account ? account.name : 'Unknown account';
}

// ---- totals ----------------------------------------------------------------

function renderTotals() {
  const { accounts, entries } = store.state;
  const cash = accounts.filter((account) => CASH_KINDS.has(account.kind));
  const usable = cash.filter((account) => !account.balanceHidden);

  let cleared = 0;
  let real = 0;
  for (const account of usable) {
    const totals = accountTotals(account, entries);
    cleared += totals.bankBalance || 0;
    real += totals.real || 0;
  }

  const cashKeys = new Set(cash.map((account) => account.key));
  const pending = entries.filter((entry) => entry.status === 'pending' && cashKeys.has(entry.accountKey));
  const out = pending.filter((entry) => entry.amount < 0).reduce((total, entry) => total + entry.amount, 0);
  const inbound = pending.filter((entry) => entry.amount > 0).reduce((total, entry) => total + entry.amount, 0);

  const hasBalances = usable.length > 0;
  $('totalReal').textContent = hasBalances ? formatMoney(round2(real)) : '—';
  $('totalReal').classList.toggle('negative', hasBalances && real < 0);
  $('totalCleared').textContent = hasBalances ? formatMoney(round2(cleared)) : '—';
  $('totalPendingOut').textContent = formatMoney(round2(out));
  $('totalPendingIn').textContent = formatMoney(round2(inbound));

  const outCount = pending.filter((entry) => entry.amount < 0).length;
  const inCount = pending.filter((entry) => entry.amount > 0).length;
  $('pendingOutNote').textContent = outCount === 1 ? '1 charge not taken yet' : `${outCount} charges not taken yet`;
  $('pendingInNote').textContent = inCount === 1 ? '1 deposit not in yet' : `${inCount} deposits not in yet`;

  const hidden = cash.length - usable.length;
  $('clearedNote').textContent = !hasBalances
    ? 'sync to pull your balances'
    : hidden > 0
      ? `${usable.length} of ${cash.length} accounts — ${hidden} balance unavailable`
      : `across ${usable.length} cash account${usable.length === 1 ? '' : 's'}`;
}

// ---- accounts --------------------------------------------------------------

function renderAccounts() {
  const container = $('accounts');
  const { accounts, entries } = store.state;

  if (!accounts.length) {
    container.innerHTML = `<p class="empty">No accounts yet. Hit <strong>Sync bank</strong> to pull them in, or add one by hand.</p>`;
    return;
  }

  container.innerHTML = accounts.map((account) => {
    const totals = accountTotals(account, entries);
    const balance = totals.balanceKnown
      ? formatMoney(totals.real)
      : '<span class="unknown">unavailable</span>';
    const bankLine = totals.balanceKnown
      ? `bank ${formatMoney(totals.bankBalance)}`
      : esc(account.hiddenReason || 'balance not provided by the feed');
    const pendingLine = totals.pendingCount
      ? `<span class="chip chip-pending">${totals.pendingCount} pending ${formatSigned(totals.pendingTotal)}</span>`
      : '<span class="chip chip-clean">all cleared</span>';

    return `
      <article class="account ${totals.isDebt ? 'is-debt' : ''}">
        <header>
          <span class="account-name">${esc(account.name)}</span>
          <span class="account-inst">${esc(account.institution || '')}</span>
        </header>
        <strong class="account-balance ${totals.balanceKnown && totals.real < 0 && !totals.isDebt ? 'negative' : ''}">${balance}</strong>
        <span class="account-sub">${totals.isDebt ? 'owed after pending' : 'real balance'} · ${bankLine}</span>
        ${pendingLine}
        ${account.manual ? `<button class="link" data-action="set-balance" data-key="${account.key}">Update balance</button>` : ''}
      </article>`;
  }).join('');
}

// ---- review ----------------------------------------------------------------

function renderReview() {
  const { suggestions, newFromBank } = store.pendingReview();
  const panel = $('reviewPanel');
  const count = suggestions.length + newFromBank.length;

  if (!count) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  $('reviewCount').textContent = String(count);

  const suggestionHtml = suggestions.length ? `
    <h3 class="review-sub">Is this the same thing?</h3>
    <ul class="review-list">
      ${suggestions.map((match) => `
        <li class="review-item">
          <div class="match">
            <div class="match-side">
              <span class="match-label">You wrote</span>
              <strong>${esc(match.entry.description)}</strong>
              <span class="match-meta">${formatDate(match.entry.date)} · ${formatSigned(match.entry.amount)}</span>
            </div>
            <span class="match-arrow" aria-hidden="true">→</span>
            <div class="match-side">
              <span class="match-label">Bank posted</span>
              <strong>${esc(match.txn.description || match.txn.merchantName)}</strong>
              <span class="match-meta">${formatDate(match.txn.postedDate)} · ${formatSigned(match.txn.amount)}</span>
            </div>
          </div>
          <p class="match-reason">${esc(match.reason)}</p>
          <div class="review-actions">
            <button class="btn btn-small btn-primary" data-action="confirm-match" data-entry="${match.entry.id}" data-txn="${match.txn.id}">Yes, it cleared</button>
            <button class="btn btn-small btn-ghost" data-action="reject-match" data-txn="${match.txn.id}">No, keep pending</button>
          </div>
        </li>`).join('')}
    </ul>` : '';

  const bankHtml = newFromBank.length ? `
    <h3 class="review-sub">Posted at the bank, not in your register (${newFromBank.length})</h3>
    <ul class="review-list compact">
      ${newFromBank.slice(0, 40).map((txn) => `
        <li class="review-item row">
          <div>
            <strong>${esc(txn.description || txn.merchantName || 'Transaction')}</strong>
            <span class="match-meta">${formatDate(txn.postedDate)} · ${esc(accountName(txn.accountKey))}</span>
          </div>
          <span class="amount ${txn.amount < 0 ? 'negative' : 'positive'}">${formatSigned(txn.amount)}</span>
          <div class="review-actions">
            <button class="btn btn-small btn-secondary" data-action="adopt-txn" data-txn="${txn.id}">Add as cleared</button>
            <button class="btn btn-small btn-ghost" data-action="ignore-txn" data-txn="${txn.id}">Ignore</button>
          </div>
        </li>`).join('')}
    </ul>
    ${newFromBank.length > 40 ? `<p class="fine">Showing the 40 most recent of ${newFromBank.length}.</p>` : ''}` : '';

  $('reviewBody').innerHTML = suggestionHtml + bankHtml;
}

// ---- register --------------------------------------------------------------

function visibleEntries() {
  const needle = view.search.trim().toLowerCase();
  return store.state.entries
    .filter((entry) => view.filter === 'all' || entry.status === view.filter)
    .filter((entry) => view.account === 'all' || entry.accountKey === view.account)
    .filter((entry) => !needle
      || entry.description.toLowerCase().includes(needle)
      || String(entry.amount).includes(needle)
      || (entry.note || '').toLowerCase().includes(needle))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.createdAt < b.createdAt ? 1 : -1)));
}

function renderRegister() {
  const rows = visibleEntries();
  const body = $('registerBody');
  $('registerEmpty').hidden = rows.length > 0;

  body.innerHTML = rows.map((entry) => {
    const stale = entry.status === 'pending' && daysBetween(entry.date, today()) > 30;
    const cleared = entry.status === 'cleared';
    const adjusted = entry.originalAmount !== undefined && entry.originalAmount !== null;

    return `
      <tr class="${cleared ? 'is-cleared' : 'is-pending'}">
        <td class="date" data-label="Date">${formatDate(entry.date)}</td>
        <td data-label="Description">
          <span class="desc">${esc(entry.description)}</span>
          ${entry.checkNo ? `<span class="tag">check #${esc(entry.checkNo)}</span>` : ''}
          ${adjusted ? `<span class="tag tag-warn">was ${formatMoney(entry.originalAmount)}, bank took ${formatMoney(entry.amount)}</span>` : ''}
          ${stale ? '<span class="tag tag-warn">pending over 30 days</span>' : ''}
        </td>
        <td class="muted" data-label="Account">${esc(accountName(entry.accountKey))}</td>
        <td class="num ${entry.amount < 0 ? 'negative' : 'positive'}" data-label="Amount">${formatSigned(entry.amount)}</td>
        <td data-label="Status">
          <span class="status ${cleared ? 'status-cleared' : 'status-pending'}">
            ${cleared ? `Cleared ${entry.clearedOn ? formatDate(entry.clearedOn) : ''}` : 'Pending'}
          </span>
        </td>
        <td class="row-actions">
          <button class="link" data-action="toggle-status" data-id="${entry.id}">${cleared ? 'Mark pending' : 'Mark cleared'}</button>
          <button class="link danger" data-action="delete-entry" data-id="${entry.id}">Delete</button>
        </td>
      </tr>`;
  }).join('');
}

// ---- selects + status ------------------------------------------------------

function renderAccountPickers() {
  const options = store.state.accounts
    .map((account) => `<option value="${account.key}">${esc(account.name)}</option>`)
    .join('');

  const filter = $('accountFilter');
  filter.innerHTML = `<option value="all">All accounts</option>${options}`;
  filter.value = view.account;

  const form = $('fAccount');
  const previous = form.value;
  form.innerHTML = options || '<option value="">Sync or add an account first</option>';
  if (previous) form.value = previous;
}

function renderSyncStatus() {
  const { lastSync } = store.state;
  $('syncStatus').textContent = lastSync
    ? `Bank data as of ${new Date(lastSync).toLocaleString()}`
    : 'Not synced yet';
}

function render() {
  renderTotals();
  renderAccounts();
  renderReview();
  renderAccountPickers();
  renderRegister();
  renderSyncStatus();
}

// ---- sync ------------------------------------------------------------------

function summarize(report) {
  const parts = [];
  parts.push(report.autoCleared.length === 1
    ? '1 pending entry cleared'
    : `${report.autoCleared.length} pending entries cleared`);
  if (report.suggestions.length) parts.push(`${report.suggestions.length} to confirm`);
  if (report.newFromBank.length) parts.push(`${report.newFromBank.length} new from the bank`);
  if (report.stillPending.length) parts.push(`${report.stillPending.length} still pending`);
  return `${parts.join(' · ')}.`;
}

function applySnapshotText(text) {
  let snapshot;
  try {
    snapshot = JSON.parse(text);
  } catch {
    throw new Error('That is not valid JSON.');
  }
  const report = store.applySnapshot(snapshot);
  render();
  return report;
}

async function syncFromFile() {
  const result = $('syncResult');
  result.textContent = 'Loading…';
  try {
    const response = await fetch(`data/bank-snapshot.json?t=${Date.now()}`);
    if (!response.ok) throw new Error(`No snapshot at data/bank-snapshot.json (${response.status}).`);
    const report = applySnapshotText(await response.text());
    result.textContent = summarize(report);
    toast(summarize(report));
  } catch (error) {
    result.textContent = location.protocol === 'file:'
      ? 'Browsers block file reads on file:// — run a local server, or use “Choose a file…” instead.'
      : error.message;
  }
}

// ---- events ----------------------------------------------------------------

function wire() {
  $('entryForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const amount = parseAmount($('fAmount').value);
    if (Number.isNaN(amount) || amount === 0) return toast('Enter an amount.');
    const accountKey = $('fAccount').value;
    if (!accountKey) return toast('Add or sync an account first.');

    const magnitude = Math.abs(amount);
    store.addEntry({
      accountKey,
      date: $('fDate').value || today(),
      description: $('fDesc').value,
      amount: $('fDirection').value === 'out' ? -magnitude : magnitude,
      checkNo: $('fCheck').value,
      status: 'pending',
    });

    $('fDesc').value = '';
    $('fAmount').value = '';
    $('fCheck').value = '';
    $('fDesc').focus();

    // It may already have posted — in that case it is cleared, not pending.
    if (store.autoReconcile().length) toast('Already posted at the bank — marked cleared.');
    render();
  });

  document.body.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, id, txn, entry, key } = button.dataset;

    if (action === 'toggle-status') {
      const found = store.state.entries.find((candidate) => candidate.id === id);
      store.setStatus(id, found.status === 'cleared' ? 'pending' : 'cleared');
    } else if (action === 'delete-entry') {
      const found = store.state.entries.find((candidate) => candidate.id === id);
      if (!confirm(`Delete “${found.description}”?`)) return;
      store.deleteEntry(id);
    } else if (action === 'confirm-match') {
      store.applyMatch(entry, txn);
      toast('Marked as cleared.');
    } else if (action === 'reject-match') {
      store.ignoreTxn(txn);
      toast('Left pending.');
    } else if (action === 'adopt-txn') {
      store.adoptTxn(txn);
    } else if (action === 'ignore-txn') {
      store.ignoreTxn(txn);
    } else if (action === 'set-balance') {
      const account = accountById(key);
      const input = prompt(`Balance for ${account.name}`, account.balance.current ?? '');
      if (input === null) return;
      const value = parseAmount(input);
      if (Number.isNaN(value)) return toast('That is not a number.');
      store.setManualBalance(key, value);
    } else {
      return;
    }
    render();
  });

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      view.filter = tab.dataset.filter;
      document.querySelectorAll('.tab').forEach((other) => {
        const active = other === tab;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-selected', String(active));
      });
      renderRegister();
    });
  });

  $('accountFilter').addEventListener('change', (event) => {
    view.account = event.target.value;
    renderRegister();
  });

  $('search').addEventListener('input', (event) => {
    view.search = event.target.value;
    renderRegister();
  });

  $('addAccountBtn').addEventListener('click', () => {
    const name = prompt('Account name (for cash you track yourself)');
    if (!name) return;
    const balance = parseAmount(prompt('Balance today', '0') || '0');
    store.addManualAccount(name, 'checking', Number.isNaN(balance) ? 0 : balance);
    render();
  });

  // Sync dialog
  $('syncBtn').addEventListener('click', () => {
    $('syncResult').textContent = '';
    $('syncDialog').showModal();
  });
  $('syncFileBtn').addEventListener('click', (event) => {
    event.preventDefault();
    syncFromFile();
  });
  $('syncUpload').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const report = applySnapshotText(await file.text());
      $('syncResult').textContent = summarize(report);
    } catch (error) {
      $('syncResult').textContent = error.message;
    }
    event.target.value = '';
  });
  $('syncPasteBtn').addEventListener('click', (event) => {
    event.preventDefault();
    try {
      const report = applySnapshotText($('syncPaste').value);
      $('syncResult').textContent = summarize(report);
      $('syncPaste').value = '';
    } catch (error) {
      $('syncResult').textContent = error.message;
    }
  });

  // Options dialog
  $('menuBtn').addEventListener('click', () => {
    $('autoClearToggle').checked = store.state.settings.autoClear;
    $('menuDialog').showModal();
  });
  $('autoClearToggle').addEventListener('change', (event) => {
    store.state.settings.autoClear = event.target.checked;
    store.save();
    render();
  });
  $('exportBtn').addEventListener('click', (event) => {
    event.preventDefault();
    const blob = new Blob([store.exportJson()], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `real-balance-${today()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
  $('importInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      store.importJson(await file.text());
      render();
      toast('Backup restored.');
      $('menuDialog').close();
    } catch (error) {
      toast(error.message);
    }
    event.target.value = '';
  });
  $('resetBtn').addEventListener('click', (event) => {
    event.preventDefault();
    if (!confirm('Erase every entry and account stored in this browser?')) return;
    store.reset();
    render();
    $('menuDialog').close();
  });
}

// ---- boot ------------------------------------------------------------------

store.load();
$('fDate').value = today();
wire();
render();

// A first-run convenience: if the page is served over http and a snapshot is
// sitting next to it, load it so the app opens with real balances.
if (!store.state.lastSync && location.protocol !== 'file:') {
  fetch('data/bank-snapshot.json')
    .then((response) => (response.ok ? response.text() : null))
    .then((text) => {
      if (!text) return;
      const report = applySnapshotText(text);
      toast(`Loaded your accounts. ${summarize(report)}`);
    })
    .catch(() => { /* no snapshot yet — the empty state explains what to do */ });
}
