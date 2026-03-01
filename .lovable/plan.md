# Performance & Scalability Hardening Plan — ERP Vedaz

## Root Cause Report

### Top 3 Root Causes

**1. Unbounded Queries Hitting the 1000-Row Limit + Full Table Scans**  
Every list and dashboard hook (`useLeads`, `useOrders`, `useTransactions`, `usePartiesWithBalances`, `useInventorySummaryByWarehouse`, `useDashboardStats`) fetches ALL rows from large tables (100k+ leads, transactions, stock_movements) client-side, then aggregates in JavaScript. This regularly hits PostgREST's 1000-row silent truncation, producing wrong counts and slow responses.

- `useLeadDashboardStats` — fetches all leads for date range, filters in JS
- `useOrderDashboardStats` — fetches all orders for date range, filters in JS
- `usePartiesWithBalances` — fetches up to 5000 transactions, groups in JS
- `useInventorySummaryByWarehouse` — fetches entire `stock_movements` table
- `useAccountingDashboardMetrics` — 5+ sequential queries fetching all transactions
- `useNetWorthOverTime` — 12 sequential queries (one per month) fetching all transactions
- `useStaffPerformance` — N+1 pattern: one query per staff member

**2. Excessive Realtime Subscriptions Causing Refetch Storms**  
17 files create ~25+ realtime channels. Many are unfiltered (listen to ALL changes on `leads`, `orders` tables) and trigger `invalidateQueries` on every change, causing full re-fetches for all connected users. With 50 users making changes, each user's browser receives constant invalidation events.

Key offenders:

- `useDashboardStats.ts` — 2 channels (leads + orders), unfiltered, invalidate on every change
- `CallingLeads.tsx`, `AdminLeads.tsx`, `LeadsAll.tsx`, `CallingOrders.tsx` — all subscribe to entire `leads`/`orders` tables
- `useTeamChat.ts` — 5 separate channels per user
- `useStaffLeadStats` — 3 channels per staff user (leads, transfers, profiles)

**3. Persistent Database Errors Causing Retry Loops**  
DB logs show recurring errors that were supposedly fixed but persist:

- `column notifications.to_user_id does not exist` — still firing
- `column orders_1.created_by_user_id does not exist` — still firing  
- `column task_remarks.parent_id does not exist` — still firing
- `column tasks.has_issue does not exist` — still firing
- `column leave_quota.month_start does not exist` — still firing

These cause query failures → retries → more DB load.

---

## Implementation Plan

### Phase 1: Fix Persistent DB Errors (Immediate)

**Task 1.1** — Fix `notifications.to_user_id` error

- Search codebase for remaining `to_user_id` references and replace with `target_user_id`

**Task 1.2** — Fix `orders.created_by_user_id` error  

- The `useLogisticsStats` join still references this wrong column. Fix to `created_by_staff_id`

**Task 1.3** — Fix `leave_quota.month_start` error

- `useLeaveQuotas` references `month_start` — verify actual column name in DB and fix

**Task 1.4** — Fix `task_remarks.parent_id` and `tasks.has_issue` errors

- These were supposedly fixed in `AdminUnifiedDashboard.tsx` but still appear in logs — verify and fix all remaining references

### Phase 2: Server-Side Aggregation via RPC Functions

**Task 2.1** — Create `get_dashboard_stats` RPC

- Single database function that returns all dashboard counts (leads by status, orders by status, totals, sales) for a given store_id + date range
- Replaces 4+ separate queries in `useLeadDashboardStats` and `useOrderDashboardStats`
- Uses COUNT/SUM directly in SQL — no row limit issue

**Task 2.2** — Create `get_sidebar_badges` RPC

- Single function returning all badge counts (unread notifications, pending tasks, new leads, etc.) for a user_id + store_id + role
- Replaces 8-10 parallel queries in `useSidebarBadges`

**Task 2.3** — Create `get_party_balances` RPC

- Computes receivable/payable per party server-side
- Replaces client-side aggregation in `usePartiesWithBalances` that fetches 5000 transactions

**Task 2.4** — Create `get_accounting_dashboard` RPC

- Single function for accounting metrics (net worth, income, expense, receivable, payable)
- Replaces 5+ sequential queries in `useAccountingDashboardMetrics`

**Task 2.5** — Create `get_inventory_summary` RPC

- Computes stock summary with in/out totals server-side
- Replaces the massive client-side join in `useInventorySummaryByWarehouse`

### Phase 3: Enforce Pagination on All List Views

**Task 3.1** — Add pagination to `useLeads`

- Add `.range(from, to)` with default page size of 50
- Return total count via `{ count: 'exact' }` for pagination UI
- Already has server-side filters — just needs limit enforcement

**Task 3.2** — Add pagination to `useOrders`

- Same pattern: `.range()` + count header

**Task 3.3** — Add pagination to `useTransactions`

- Same pattern

**Task 3.4** — Add pagination to `useStockMovements`

- Same pattern

### Phase 4: Realtime Subscription Cleanup

**Task 4.1** — Remove realtime from dashboard stats hooks

- Delete the `supabase.channel()` subscriptions from `useLeadDashboardStats` and `useOrderDashboardStats`
- These already poll via React Query's `refetchInterval` — realtime is redundant and harmful

**Task 4.2** — Remove realtime from list pages

- Remove unfiltered channels from `CallingLeads.tsx`, `AdminLeads.tsx`, `LeadsAll.tsx`, `CallingOrders.tsx`, `LogisticsOutsideValley.tsx`
- Replace with manual refresh button or conservative polling (60s)

**Task 4.3** — Consolidate `useTeamChat` channels

- Reduce from 5 channels to max 2 (messages for active room + unread count)

**Task 4.4** — Remove `useStaffLeadStats` realtime channels (3 channels per user)

- Replace with polling at 60s intervals

**Task 4.5** — Keep realtime only for:

- `useNotifications` (1 channel, filtered by store_id) — essential for real-time alerts
- `useChat` (1 channel per active room) — essential for chat
- Total target: max 3 channels per page

### Phase 5: Database Indexes

**Task 5.1** — Create composite indexes via migration:

```sql
-- Leads: most common filter patterns
CREATE INDEX IF NOT EXISTS idx_leads_store_date ON leads(store_id, date);
CREATE INDEX IF NOT EXISTS idx_leads_store_status ON leads(store_id, status, current_team);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to_user_id, store_id);

-- Orders: most common filter patterns  
CREATE INDEX IF NOT EXISTS idx_orders_store_date ON orders(store_id, order_date);
CREATE INDEX IF NOT EXISTS idx_orders_store_status ON orders(store_id, order_status);

-- Transactions: most common filter patterns
CREATE INDEX IF NOT EXISTS idx_transactions_store_date ON transactions(store_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_party ON transactions(party_id, transaction_type);

-- Stock movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_warehouse ON stock_movements(product_id, warehouse_id, movement_type);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_user_id, read_at);

-- Attendance
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, date);
```

### Phase 6: Frontend Query Budget & Caching

**Task 6.1** — Update `AdminUnifiedDashboard` to use new RPCs

- Replace 15+ individual hooks with 2-3 RPC calls (dashboard stats, accounting summary, inventory summary)
- Each RPC returns pre-aggregated data — no client-side math needed

**Task 6.2** — Increase staleTime for non-critical data

- Sidebar badges: `staleTime: 5 minutes` (already set)
- Dashboard stats: `staleTime: 2 minutes`  
- Inventory summary: `staleTime: 5 minutes`
- Accounting metrics: `staleTime: 5 minutes`

**Task 6.3** — Fix `useNetWorthOverTime` N+1 pattern

- Replace 12 sequential monthly queries with single RPC that groups by month

### Phase 7: UI Stability — No Stuck Loading

**Task 7.1** — Add timeout wrapper for all critical hooks

- Create `useQueryWithTimeout` utility that wraps React Query
- After 8 seconds of loading, show data from cache (stale) or error with Retry button
- Prevents infinite spinner states

**Task 7.2** — Add circuit breaker for non-critical features

- If sidebar badges or realtime fails, silently degrade (show 0 counts)
- Never block core ERP functionality for badge/notification failures

---

## Technical Details

### RPC Function Pattern (example: `get_dashboard_stats`)

```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_store_id UUID, p_date_from DATE, p_date_to DATE
) RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public' AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'leads', (SELECT json_build_object(
      'total', COUNT(*),
      'confirmed', COUNT(*) FILTER (WHERE status='CONFIRMED' OR order_id IS NOT NULL),
      'cnr', COUNT(*) FILTER (WHERE status='CALL_NOT_RECEIVED'),
      'followup', COUNT(*) FILTER (WHERE status='FOLLOW_UP'),
      'cancelled', COUNT(*) FILTER (WHERE status='CANCELLED'),
      'new', COUNT(*) FILTER (WHERE status='NEW'),
      'assigned', COUNT(*) FILTER (WHERE status='ASSIGNED')
    ) FROM leads WHERE store_id=p_store_id AND date BETWEEN p_date_from AND p_date_to),
    'orders', (SELECT json_build_object(
      'total', COUNT(*),
      'confirmed', COUNT(*) FILTER (WHERE order_status='CONFIRMED'),
      'delivered', COUNT(*) FILTER (WHERE order_status='DELIVERED'),
      'total_sales', COALESCE(SUM(amount) FILTER (WHERE order_status IN ('CONFIRMED','DISPATCHED','DELIVERED','PACKED')), 0)
    ) FROM orders WHERE store_id=p_store_id AND is_deleted=false 
      AND order_date BETWEEN (p_date_from||'T00:00:00+05:45') AND (p_date_to||'T23:59:59+05:45'))
  ) INTO result;
  RETURN result;
END; $$;
```

### Pagination Pattern

```typescript
// Before (fetches all rows, hits 1000 limit)
const { data } = await supabase.from('leads').select('*');

// After (paginated with total count)  
const { data, count } = await supabase
  .from('leads')
  .select('*', { count: 'exact' })
  .range(page * pageSize, (page + 1) * pageSize - 1);
```

### Files Modified (Summary)

- **New DB migration**: RPC functions + indexes
- **Modified hooks**: `useSidebarBadges.ts`, `useDashboardStats.ts`, `useAccountingDashboardMetrics.ts`, `useLeads.ts`, `useOrders.ts`, `useTransactions.ts`, `useStockMovements.ts`, `useInventorySummaryByWarehouse.ts`, `useParties.ts`, `useLeaveQuota.ts`
- **Modified pages**: `AdminUnifiedDashboard.tsx`, `CallingLeads.tsx`, `AdminLeads.tsx`, `LeadsAll.tsx`, `CallingOrders.tsx`
- **New utility**: `useQueryWithTimeout.ts`

&nbsp;

Do this also : 

&nbsp;

“RLS policy evaluation must be O(1) per row; remove any SELECT inside RLS functions/policies.”

“All RPCs (SECURITY DEFINER) must validate auth.uid() + role + store access internally to prevent data leaks.”

“Avoid count:'exact' on large tables; use estimated/none + summary totals when needed.”

“Add summary tables for high-cost analytics (daily totals) updated by scheduled jobs.”

“Add request deduplication + cancellation (abort) to stop overlapping fetches.”

“Introduce central query key map; never invalidate broad keys on realtime events.”

“Add schema sync gate: regenerate supabase types and eliminate legacy column references (fail build if found).”

“Add per-role feature degradation: if badges/stats fail, do not block core lists/forms.”