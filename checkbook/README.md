# Real Balance

A check register that knows what actually cleared.

You write down what you spend as you spend it. Everything starts **pending**.
When the money really leaves the account, the entry flips to **cleared** on its
own — because it was matched against a transaction that genuinely posted at your
bank. The big number at the top is what you have *after* everything pending,
which is the number you actually care about.

Same idea as I Check Balance, minus the part where you tick things off by hand.

```
checkbook/
  index.html          the whole app
  css/app.css         styles
  js/money.js         money + date helpers
  js/reconcile.js     the matching engine (no DOM — unit tested)
  js/store.js         state, localStorage, applying a sync
  js/app.js           rendering and events
  data/SCHEMA.md      the bank snapshot format
  tools/build-snapshot.mjs   turns bank data into that format
  test/               node --test suite
```

No build step, no framework, no dependencies. Same as the rest of this repo.

## Run it

```bash
cd checkbook
python3 -m http.server 8000   # http://localhost:8000
npm test                      # 28 tests, no install needed
```

Open it on your phone too — the register turns into cards on small screens.
Your data lives in that browser's localStorage and is never uploaded anywhere.
Use **⋯ → Export my data** for a backup.

## How the automatic clearing works

The app reads a **bank snapshot** — a JSON file describing your accounts and the
transactions that have posted (format in `data/SCHEMA.md`). On every sync it
compares your pending entries against it.

An entry clears **by itself** only when the match is unambiguous:

- the amount is identical, and
- the merchant matches, **or** the check number appears, **or** it is the only
  transaction on that account that the entry could possibly be.

Anything less lands in **Needs your review** for you to confirm — a near-miss
amount (a tip added after you wrote the bill down), or two entries competing for
one transaction. Transactions that posted but were never in your register are
listed there too, one click to add.

Rules the engine sticks to:

- A deposit never clears a withdrawal, even for the same amount.
- One posted transaction never clears two entries.
- Card authorizations (`pending: true` in the feed) never clear anything — the
  amount often changes before it settles.
- Re-syncing the same snapshot does nothing twice; matches are keyed to
  transaction ids.
- When the bank took a different amount than you wrote down, the bank wins and
  the row shows both numbers.
- A balance the feed cannot provide shows as **unavailable** and is left out of
  the totals. It is never shown as $0.

Turn off **⋯ → Clear automatically** if you would rather confirm every match.

## Getting the snapshot

The app never holds your bank credentials — it reads a file. Three ways to get one:

**1. From a Claude session with your bank connected** (what this repo is set up
for). Ask for a refresh in plain words:

> Refresh my bank snapshot: pull my accounts and recent transactions, run them
> through `checkbook/tools/build-snapshot.mjs`, and write
> `checkbook/data/bank-snapshot.json`.

Serve the folder and the app picks the file up on load. To keep it current
without asking, schedule that same prompt to run daily.

**2. From raw API responses**, if you have them saved:

```bash
node tools/build-snapshot.mjs accounts.json transactions.json > data/bank-snapshot.json
```

It reads Era Context MCP response shapes directly, and passes through anything
already in snapshot format — so a Plaid export or a CSV converter works too, as
long as it produces `data/SCHEMA.md`.

**3. By hand.** Copy `data/bank-snapshot.sample.json` to
`data/bank-snapshot.json` and edit it. Sync → *Choose a file…* also works if you
would rather not put the file on disk next to the app.

`data/bank-snapshot.json` is gitignored on purpose. Do not commit your balances.

## Accounts with no feed

Cash, or an account you would rather not connect: **Add account by hand**, then
**Update balance** whenever you check it. Pending entries against it behave the
same way; you clear them yourself with *Mark cleared*.
