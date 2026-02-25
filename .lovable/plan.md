

# Accounting System Upgrade -- 7 Transaction Types + No Clearing + Party Ledger Rewrite

## Summary
Complete rewrite of accounting module: current `income/expense/transfer/invoice_receipt/bill_payment` type system lai 7-type system (INCOME, EXPENSE, SALES_IN, SALES_OUT, PAYMENT_IN, PAYMENT_OUT, TRANSFER) ma upgrade garne. `is_cleared` / pending / settlement workflow completely hataucha. `party_transactions` ra `party_payments` tables lai legacy banaucha -- `transactions` table nai single source of truth huncha. Party ledger purely `transactions` table bata build huncha.

## Current State Analysis
- **transactions table**: `type` is plain text, currently uses `income`, `expense`, `transfer`. Has `is_cleared` boolean (default false)
- **DB enum `transaction_type`**: Already has `INCOME`, `EXPENSE`, `TRANSFER` -- needs 4 more values
- **Existing data**: 1603 expense, 621 income, 168 transfer records
- **party_transactions**: 47 records (inventory-linked), uses `is_settled`, `direction` (RECEIVABLE/PAYABLE)
- **party_payments**: 1 record, auto-creates transactions via trigger
- **Triggers to remove/replace**: `create_accounting_transaction_on_payment`, `create_party_transaction_from_stock_movement`, settlement logic
- **Balance trigger**: `recalculate_account_balance` currently filters `is_cleared = true` -- needs update
- **UI files to update**: ViewTransactions.tsx, PartyStatement.tsx, NewDepositDialog.tsx, NewExpenseDialog.tsx, NewTransferDialog.tsx, EditTransactionDialog.tsx, CreateReceivablePayableDialog.tsx, AccountingDashboardNew.tsx, useAccountingDashboardMetrics.ts

---

## Implementation Steps (11 phases)

### Phase 1: Database Migration -- Add Transaction Types + Add Columns
- Add `SALES_IN`, `SALES_OUT`, `PAYMENT_IN`, `PAYMENT_OUT` to `transaction_type` enum (keep existing 3)
- Add `transaction_type` column to `transactions` table (text, nullable initially for migration)
- Add `reference_type` and `reference_id` columns for inventory links
- Backfill existing data: `income` → `INCOME`, `expense` → `EXPENSE`, `transfer` → `TRANSFER`
- Make `transaction_type` NOT NULL after backfill

### Phase 2: Migrate Existing party_transactions + party_payments into transactions
- For each `party_transaction` (47 records): create corresponding `transactions` row with:
  - `SALES_IN` for direction=PAYABLE (stock IN)
  - `SALES_OUT` for direction=RECEIVABLE (wholesale OUT)
  - `reference_type='stock_movement'`, `reference_id=reference`
  - `account_id = settled_account_id` if settled, else NULL (credit entry)
- For existing `party_payments` (1 record): already has linked transaction via trigger, just update type to `PAYMENT_IN`/`PAYMENT_OUT`

### Phase 3: Rewrite `recalculate_account_balance` Function
New formula (no `is_cleared` filter):
```text
opening_balance
  + SUM(INCOME where account_id = this)
  - SUM(EXPENSE where account_id = this)
  + SUM(PAYMENT_IN where account_id = this)
  - SUM(PAYMENT_OUT where account_id = this)
  + SUM(TRANSFER where to_account_id = this)
  - SUM(TRANSFER where from_account_id = this)
  + SUM(SALES_OUT where account_id = this AND account_id IS NOT NULL)
  - SUM(SALES_IN where account_id = this AND account_id IS NOT NULL)
```
Uses `transaction_type` column instead of `type`.

### Phase 4: Replace/Disable Old Triggers
- **Remove** `create_accounting_transaction_on_payment` trigger (party_payments no longer used for new records)
- **Replace** `create_party_transaction_from_stock_movement` trigger with new `create_transaction_from_stock_movement` that:
  - Creates `transactions` row directly (not `party_transactions`)
  - IN → `SALES_IN`, WHOLESALE_OUT → `SALES_OUT`
  - Sets `reference_type='stock_movement'`, `reference_id=movement.id`
  - `account_id = NULL` (credit mode by default)
  - `party_id` from movement
- **Replace** `sync_party_transaction_on_stock_update` → update linked `transactions` row instead
- **Replace** `sync_party_transaction_on_stock_delete` → delete linked `transactions` row instead
- **Update** `block_stock_change_if_settled` → check linked `transactions` row instead of `party_transactions`
- **Update** `update_account_balance_on_transaction` → use `transaction_type` column, remove `is_cleared` check
- **Remove** `update_account_balance_on_party_payment` trigger

### Phase 5: Update `useTransactions` Hook
- Change `Transaction.type` to use new `transaction_type` field
- Remove `is_cleared` from interface and all filter logic
- Remove `useMarkTransactionsCleared`, `usePendingReceivables`, `usePendingPayables`, `usePendingPartyReceivables`, `usePendingPartyPayables`
- Update `useCreateTransaction` to use `transaction_type` instead of `type`
- Remove cascade delete logic for `party_transactions` and `party_payments` from `useDeleteTransaction`

### Phase 6: New Transaction UI -- Two-Button System
**ViewTransactions.tsx** rewrite:
- Replace 3 buttons (Deposit/Expense/Transfer) with 2: "Add Transaction" + "Transfer"
- "Add Transaction" → opens type selector modal with 6 options: INCOME, EXPENSE, SALES_IN, SALES_OUT, PAYMENT_IN, PAYMENT_OUT
- After selecting type → opens the appropriate form dialog
- Remove "Cleared" column and badge from table
- Update type filter dropdown to show all 7 types
- Update `getTypeColor` for new types

**New/Updated Dialog Components:**
- Rename `NewDepositDialog` → reuse for INCOME (remove `is_cleared` toggle)
- Rename `NewExpenseDialog` → reuse for EXPENSE (remove `is_cleared` toggle)
- `NewTransferDialog` → remove `is_cleared` toggle
- Create `NewPaymentInDialog` -- party optional, account required, amount, date, method, description
- Create `NewPaymentOutDialog` -- party optional, account required, amount, date, method, description
- Create `NewSalesInDialog` -- party optional, account optional (cash toggle), amount, date, description
- Create `NewSalesOutDialog` -- party optional, account optional (cash toggle), amount, date, description
- Create `TransactionTypeSelector` -- modal to choose which type to add

**EditTransactionDialog** -- remove `is_cleared` toggle, show `transaction_type` as read-only badge

### Phase 7: Party Ledger Rewrite
**`usePartyStatement.ts`** complete rewrite:
- Query ONLY from `transactions` where `party_id = selectedParty`
- No more `party_transactions` or `party_payments` queries
- Debit/Credit mapping:
  - SALES_OUT → Credit (they owe us)
  - PAYMENT_IN → Debit (they paid us, reduces what they owe)
  - SALES_IN → Debit (we owe them)
  - PAYMENT_OUT → Credit (we paid them, reduces what we owe)
  - INCOME with party → Credit
  - EXPENSE with party → Debit
- Running balance = cumulative (Credit - Debit), sorted by date asc then transaction_code
- Balance > 0 = Receivable, Balance < 0 = Payable

**PartyStatement.tsx** cleanup:
- Remove all settlement/clear pending workflows (handleClearPending, handleInventoryPayment, handleBulkPayment)
- Remove pending checkboxes, bulk pay/receive buttons
- Remove settle dialogs, clear dialogs
- Keep: delete, export CSV, search, date filters, product filter
- Add: PDF export button, row selection for export
- Party list summary: calculate from transactions directly

### Phase 8: PDF Export for Party Ledger
- Add `jsPDF` + `jspdf-autotable` (already in dependencies)
- Generate professional PDF invoice from selected ledger rows
- Include: party name, date range, table of selected entries, totals (debit/credit/balance)
- Use branding/logo if available

### Phase 9: Dashboard Metrics Rewrite
**`useAccountingDashboardMetrics.ts`**:
- Total Income = `SUM(amount) WHERE transaction_type = 'INCOME'`
- Total Expense = `SUM(amount) WHERE transaction_type = 'EXPENSE'`
- Profit/Loss = Income - Expense
- Receivable/Payable: compute per-party balance from `transactions` where `party_id IS NOT NULL`:
  - Per party: `SUM(credit types) - SUM(debit types)`
  - Total Receivable = `SUM(MAX(party_balance, 0))`
  - Total Payable = `SUM(ABS(MIN(party_balance, 0)))`
- Remove `party_transactions` dependency entirely
- Net worth/assets keep existing logic but use `transaction_type`

**`useNetWorthOverTime`**: update type filters from `income/invoice_receipt` → `INCOME/SALES_OUT/PAYMENT_IN`

### Phase 10: Inventory Sync Verification
- Stock IN → creates `SALES_IN` transaction (via new trigger)
- WHOLESALE_OUT → creates `SALES_OUT` transaction (via new trigger)
- Cash toggle on stock movement forms: if true, set `account_id` on linked transaction
- Existing `related_to_accounting` toggle continues to work (trigger checks it)
- Soft-delete of stock movement → deletes linked transaction
- Update of qty/price → updates linked transaction amount

### Phase 11: Cleanup Legacy References
- Stop writing to `party_transactions` and `party_payments` tables (keep data for audit)
- Remove imports/usage of `usePartyTransactions`, `usePartyPayments`, `useCreatePartyPayment`, `useCreatePartyTransaction`
- Remove `AddPartyTransactionDialog` from PartyStatement
- Remove pending-related query invalidations from all hooks
- Update all query key invalidations

---

## Technical Details

### Migration SQL Summary
```sql
-- 1. Add new enum values
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'SALES_IN';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'SALES_OUT';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'PAYMENT_IN';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'PAYMENT_OUT';

-- 2. Add transaction_type column + reference columns
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_type text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_type text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_id text;

-- 3. Backfill
UPDATE transactions SET transaction_type = UPPER(type) WHERE transaction_type IS NULL;

-- 4. Migrate party_transactions into transactions table
-- (INSERT from party_transactions with proper type mapping)

-- 5. Rewrite recalculate_account_balance (no is_cleared)
-- 6. Replace stock movement trigger
-- 7. Remove party_payment trigger
-- 8. Update balance trigger to use transaction_type
```

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/accounting/TransactionTypeSelector.tsx` | Type picker modal (6 options) |
| `src/components/accounting/NewPaymentInDialog.tsx` | PAYMENT_IN form |
| `src/components/accounting/NewPaymentOutDialog.tsx` | PAYMENT_OUT form |
| `src/components/accounting/NewSalesInDialog.tsx` | SALES_IN form (optional account) |
| `src/components/accounting/NewSalesOutDialog.tsx` | SALES_OUT form (optional account) |
| Migration SQL | Schema + trigger changes |

### Files to Heavily Modify
| File | Changes |
|------|---------|
| `src/hooks/useTransactions.ts` | Remove clearing, update types, simplify delete |
| `src/hooks/usePartyStatement.ts` | Complete rewrite -- transactions table only |
| `src/hooks/useAccountingDashboardMetrics.ts` | New formulas using transaction_type |
| `src/pages/admin/accounting/ViewTransactions.tsx` | Two-button UI, remove cleared column |
| `src/pages/admin/accounting/PartyStatement.tsx` | Remove settlement workflows, add PDF export |
| `src/components/accounting/NewDepositDialog.tsx` | Remove is_cleared toggle |
| `src/components/accounting/NewExpenseDialog.tsx` | Remove is_cleared toggle |
| `src/components/accounting/NewTransferDialog.tsx` | Remove is_cleared toggle |
| `src/components/accounting/EditTransactionDialog.tsx` | Remove is_cleared, use transaction_type |
| `src/hooks/usePartyPayments.ts` | Stop new writes (keep for legacy read) |

### Files to Delete/Deprecate
| File | Reason |
|------|--------|
| `src/components/accounting/CreateReceivablePayableDialog.tsx` | Replaced by type-specific dialogs |
| `src/components/accounting/AddPartyTransactionDialog.tsx` | No longer needed |

### Data Safety
- `party_transactions` and `party_payments` tables remain for audit trail
- `is_cleared` column remains in DB but never read/written
- Existing `type` column (`income`/`expense`/`transfer`) remains alongside new `transaction_type`
- All existing trigger-based balance logic replaced with cleaner version

### Estimated Impact
- ~15 files modified/created
- 1 large migration (enum + columns + backfill + trigger rewrites)
- Zero data loss (additive changes only)
- All existing transactions preserved with proper type mapping

