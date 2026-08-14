# Bank snapshot format

The app never talks to a bank itself. It reads a plain JSON file describing
what your accounts look like right now, and reconciles your register against it.
Anything that can produce this shape can feed the app.

```jsonc
{
  "generated_at": "2026-08-14T18:01:10Z",   // when the balances were read
  "source": "era-context-mcp",              // free-form label

  "accounts": [
    {
      "key": "uagr_7NwD9gYjSt5",            // stable id — must not change between syncs
      "name": "EVERYDAY CHECKING ...7930",
      "institution": "Wells Fargo",
      "type": "Checking",                   // Checking | Savings | CreditCard | Loan | Investment
      "balance": {
        "current": 29.19,                   // omit entirely if the balance is unknown
        "available": 6.30,
        "currency": "USD"
      },
      "balance_as_of": "2026-08-14T18:01:10Z",
      "balance_unavailable_reason": "..."   // optional, shown when `current` is missing
    }
  ],

  "transactions": [
    {
      "id": "utgr_9NhF54CrL7q",             // stable id — this is what prevents double-counting
      "accountKey": "uagr_7NwD9gYjSt5",
      "date": "2026-08-12",                 // when it happened
      "postedDate": "2026-08-13",           // when it hit the account (used for matching)
      "description": "McDonald's",
      "merchantName": "McDonald's",         // optional
      "originalDescription": "PURCHASE ...", // optional, raw bank text — helps match checks
      "amount": -11.40,                     // negative = money out, positive = money in
      "category": "Dining out",             // optional
      "pending": false                      // true = bank hold, not settled; never clears an entry
    }
  ]
}
```

## Rules that matter

**`current` missing means unknown, not zero.** If a feed cannot give you a
balance, leave `current` out. The app shows "unavailable" and leaves that
account out of the totals rather than quietly reporting $0 as your money.

**Ids must be stable.** Matching, and the protection against clearing the same
entry twice, both key off `transactions[].id`. If your source renumbers
transactions on every export, the app will offer the same transaction again.

**Snapshots merge, they don't replace.** Sending a snapshot that only covers
the last week will not erase older transactions the app already knows about.

**`pending: true` is ignored on purpose.** A card authorization is not money
gone — the amount often changes before it settles. Entries stay pending until
something actually posts.
