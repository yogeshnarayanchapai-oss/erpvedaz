&nbsp;

Stable Architecture + Low Cloud Cost + Future-Proof Scaling

&nbsp;

&nbsp;

---

&nbsp;

🔴 Problem Summary (Real Root Cause)

&nbsp;

The system overload is not just due to missing indexes.

&nbsp;

The real architectural issue is:

&nbsp;

382 RLS policies exist

&nbsp;

205 policies call has_role() / is_owner() / user_has_store_access()

&nbsp;

These functions query user_roles and user_store_access

&nbsp;

RLS is evaluated per-row

&nbsp;

So every query on large tables (leads, orders, tasks) multiplies these function calls

&nbsp;

Even with indexes, billions of lookups happen

&nbsp;

18 realtime subscriptions multiply invalidations

&nbsp;

Sidebar badge system makes 10+ DB calls every 5 minutes per active user

&nbsp;

&nbsp;

This is an architecture-level inefficiency, not just a missing index problem.

&nbsp;

We need a structural fix — not a temporary workaround.

&nbsp;

&nbsp;

---

&nbsp;

🎯 Core Strategy

&nbsp;

We will fix this in 4 layers:

&nbsp;

1. Eliminate per-row RLS function calls

&nbsp;

&nbsp;

2. Optimize lookup tables correctly (partial indexes)

&nbsp;

&nbsp;

3. Reduce total query volume drastically

&nbsp;

&nbsp;

4. Reduce realtime + polling pressure

&nbsp;

&nbsp;

&nbsp;

NO hacks like SET enable_seqscan = off.

&nbsp;

&nbsp;

---

&nbsp;

✅ PHASE 1 — CRITICAL (Architecture Fix)

&nbsp;

1.1 Remove Function Calls From RLS Policies (Most Important)

&nbsp;

We will gradually remove:

&nbsp;

has_role()

&nbsp;

is_owner()

&nbsp;

user_has_store_access()

&nbsp;

has_store_role()

&nbsp;

get_user_store_role()

&nbsp;

&nbsp;

from RLS policies.

&nbsp;

Instead, use inline EXISTS checks.

&nbsp;

Example rewrite:

&nbsp;

❌ Current (bad):

&nbsp;

USING (has_role(auth.uid(), 'ADMIN'))

&nbsp;

✅ Replace with:

&nbsp;

USING ( EXISTS ( SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN' ) )

&nbsp;

For store access:

&nbsp;

USING ( EXISTS ( SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = store_id AND usa.is_active = true ) )

&nbsp;

This removes per-row function execution overhead.

&nbsp;

Target: Rewrite heavy-traffic tables first:

&nbsp;

leads

&nbsp;

orders

&nbsp;

tasks

&nbsp;

product_inventory

&nbsp;

leave_requests

&nbsp;

&nbsp;

Impact: Huge CPU drop. Stable long-term performance.

&nbsp;

&nbsp;

---

&nbsp;

1.2 Add Proper Partial Indexes (Correct Way)

&nbsp;

For user_roles:

&nbsp;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_role ON public.user_roles (user_id, role);

&nbsp;

For user_store_access (active only):

&nbsp;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usa_active_user_role_store ON public.user_store_access (user_id, store_role, store_id) WHERE is_active = true;

&nbsp;

This keeps indexes small and highly efficient.

&nbsp;

&nbsp;

---

&nbsp;

1.3 ANALYZE Tables (No pg_stat_reset)

&nbsp;

Run:

&nbsp;

ANALYZE public.user_roles; ANALYZE public.user_store_access; ANALYZE public.leads; ANALYZE public.orders; ANALYZE public.tasks;

&nbsp;

Do NOT run pg_stat_reset() in production.

&nbsp;

&nbsp;

---

&nbsp;

✅ PHASE 2 — High Priority (Query Volume Reduction)

&nbsp;

2.1 Replace 10+ Sidebar Queries With Single RPC

&nbsp;

Create one function:

&nbsp;

get_sidebar_badges()

&nbsp;

Single DB call per 5–10 minutes instead of 10+.

&nbsp;

Frontend:

&nbsp;

const { data } = await supabase.rpc('get_sidebar_badges', {...});

&nbsp;

Impact: Massive reduction in DB round-trips.

&nbsp;

&nbsp;

---

&nbsp;

2.2 Reduce Realtime Subscriptions (18 → ~5)

&nbsp;

Keep only:

&nbsp;

Chat messages

&nbsp;

Direct notifications

&nbsp;

Critical live updates

&nbsp;

&nbsp;

Remove:

&nbsp;

Realtime from sidebar badges

&nbsp;

Duplicate leads listeners

&nbsp;

Duplicate dashboard listeners

&nbsp;

&nbsp;

All channels must include store_id filter.

&nbsp;

&nbsp;

---

&nbsp;

2.3 Disable Background Polling

&nbsp;

In QueryClient config:

&nbsp;

refetchIntervalInBackground: false

&nbsp;

Stops polling when tab inactive.

&nbsp;

Huge cost reduction for users leaving tabs open.

&nbsp;

&nbsp;

---

&nbsp;

✅ PHASE 3 — Smart Frontend Optimization

&nbsp;

3.1 Lazy Load Data

&nbsp;

Load only when section visible:

&nbsp;

Inventory

&nbsp;

Accounting

&nbsp;

HRM

&nbsp;

Reports

&nbsp;

&nbsp;

No mount-triggered global queries.

&nbsp;

&nbsp;

---

&nbsp;

3.2 Increase Cache Time

&nbsp;

Reference/config data → 15 min

Dashboard stats → 10 min

Transactional data → 5 min

&nbsp;

&nbsp;

---

&nbsp;

3.3 Remove select('*') Everywhere

&nbsp;

Only fetch required columns.

&nbsp;

Reduces transfer size and CPU.

&nbsp;

&nbsp;

---

&nbsp;

✅ PHASE 4 — Optional Advanced Optimization (Future-Proof)

&nbsp;

4.1 Move Roles to JWT Claims (Ultimate Optimization)

&nbsp;

Instead of DB lookup:

&nbsp;

USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN')

&nbsp;

Benefits:

&nbsp;

Removes role table lookup entirely

&nbsp;

RLS becomes pure in-memory check

&nbsp;

&nbsp;

Requires:

&nbsp;

Custom auth hook

&nbsp;

JWT refresh on role change

&nbsp;

&nbsp;

Do later if needed.

&nbsp;

&nbsp;

---

&nbsp;

4.2 Materialized View for Dashboard Stats (If Growth Increases)

&nbsp;

If badges become heavy:

&nbsp;

Create materialized view

&nbsp;

Refresh every 5 minutes

&nbsp;

Read from view instead of live tables

&nbsp;

&nbsp;

&nbsp;

---

&nbsp;

📊 Expected Results

&nbsp;

After Phase 1-2:

&nbsp;

Sequential scans: Drop from billions → thousands

&nbsp;

DB queries per user: Drop from 20-30/min → 3-5/min

&nbsp;

CPU usage: Drop from 90%+ → 15-25%

&nbsp;

Cloud cost: Reduce 40-60%

&nbsp;

System stability: No more cascading overload.

&nbsp;

&nbsp;

---

&nbsp;

🛡 Safe Migration Strategy

&nbsp;

Phase 1: Rewrite RLS policies table by table. Zero downtime.

&nbsp;

Phase 2: Deploy RPC first. Then update frontend.

&nbsp;

Phase 3: Frontend-only changes.

&nbsp;

No downtime required.

&nbsp;

&nbsp;

---

&nbsp;

🚨 Important Decision

&nbsp;

We will NOT use:

&nbsp;

SET enable_seqscan = off

&nbsp;

Because:

&nbsp;

It is a workaround

&nbsp;

Not architecturally clean

&nbsp;

Risky long-term

&nbsp;

Not future-proof

&nbsp;

&nbsp;

We fix root cause instead.

&nbsp;

&nbsp;

---

&nbsp;

🎯 Final Goal

&nbsp;

✔ Stable under high concurrency

✔ Low cloud cost

✔ Clean RLS architecture

✔ Scalable for future growth

✔ No emergency hacks

✔ Production safe