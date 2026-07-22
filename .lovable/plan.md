## Goal

Confirmed lead ra order lai single-click "Push to Courier" garna miloos:

- Calling staff → aafnai lead/order matra push garna sakne
- Admin / Manager / Logistics → sabai ko push garna milne
- Courier picker ma **API-connected couriers matra** dekhine (jasle setup vayeko xaina, list mai nadekhaune)
- order ko filter area ma ma **Refresh Status** button — courier API bata latest status pull garx pahila refresh huna baki ko matra  (calling staff le pani aafno order ma garna milx)
- Existing logistics system, lead/order flow, RLS, accounting — **kei bigrindaina**

---

## Current state (verified)

- Two parallel courier stacks exist:
  1. `logistics_settings` table + `send-to-courier` / `courier-ncm-create` / `courier-gaaubesi-create` edge functions (used by `SendToCourierDialog`) — currently ADMIN/MANAGER/LOGISTICS only.
  2. `couriers` table with `is_api_connected` flag + `SubmitToCourierModal` + `courierSubmissionService.ts` — uses a **mock AWB** (`AWB${Date.now()}`), no real API call.
- `courier-ncm-create` and `courier-gaaubesi-create` are the only real integrations; PATHAO/GBL are stubs in `courierAPI.ts`.
- `order_courier` table already tracks `awb_number`, `status`, `courier_id`.
- Lead detail / list has no "Push to Courier" single-row action; only bulk flow exists on orders page.

## Plan

### 1. Unify on `logistics_settings` as the source of truth for "API connected"

- Treat a courier as **API-connected** when its `logistics_settings` row has `is_active = true` AND required credentials present (per-provider check: NCM needs token, GAAUBESI needs api_key, etc.).
- Add a small helper `useConnectedCouriers()` hook returning only providers passing that check.
- Deprecate `SubmitToCourierModal` mock path; keep file for now but route callers to the new modal to avoid regressions.

### 2. New `PushToCourierButton` + `PushToCourierDialog` (single-lead / single-order)

- Reuses existing `send-to-courier` edge function (real NCM) and adds branch to call `courier-gaaubesi-create` when courier = GAAUBESI.
- Dialog auto-fills from lead/order (customer, phone, address, COD amount, product, qty, delivery location) and shows only connected couriers with recommended one preselected via existing `useRecommendedCourier`.
- On success: writes `order_courier` row, updates `orders.courier_provider`, `courier_awb`, `courier_submitted_at`, `order_status='DISPATCHED'`, logs `order_history` — mirrors current `send-to-courier` behavior. No new schema.

### 3. Placement of the action

- **Order rows** (CallingOrders, CallingMyOrders, AdminOrders, LogisticsOrders): add a Truck icon action in row dropdown → opens `PushToCourierDialog`.
- **Confirmed leads** (LeadsAll, AdminLeads, CallingOrders lead-side): show button only when lead status = `CONFIRMED` and an order exists. If lead is confirmed but order not yet created, action is disabled with tooltip "Create order first" (uses existing confirm-as-order flow).
- **Order detail page**: prominent "Push to Courier" button in header when not yet dispatched; replaced by AWB + "Refresh Status" once dispatched.

### 4. Permission rules (client + edge function)

- Client gating in the button:
  - `OWNER`, `ADMIN`, `MANAGER`, `LOGISTICS`, `SALES_MANAGER` → can push any lead/order
  - `CALLING`, `FOLLOWUP` → can push only rows where `assigned_to = auth.uid()` OR `created_by = auth.uid()`
  - Other roles → button hidden
- Edge function `send-to-courier` currently rejects non ADMIN/MANAGER/LOGISTICS. **Widen** its role check to also accept CALLING/FOLLOWUP **but** require ownership (assigned_to or created_by match) using service-role query. Owners/admins skip ownership check.

### 5. Refresh Status

- New edge function `courier-refresh-status` (single order):
  - Loads order + `order_courier` row → dispatches per-provider tracking call:
    - NCM → new implementation using existing NCM token (mirrors `courier-ncm-create` style)
    - GAAUBESI → existing `courier-gaaubesi-track`
    - PATHAO / GBL → return `not_implemented` gracefully (UI shows "Live tracking not available for this courier yet")
  - Updates `orders.order_status` (mapping courier status → internal enum), `order_courier.status`, appends `order_history` entry.
- UI: `RefreshCourierStatusButton` next to AWB on order rows and order detail. Same permission rules as push (staff can refresh own orders).
- Debounce/rate-limit: disable button for 10s after click; toast shows last-refreshed timestamp.

### 6. Courier setup docs (what user must configure)

To use this end-to-end, in **Admin → Logistics → Settings** for each courier the user wants live:

1. Toggle `is_active = ON`
2. Fill credentials (already existing fields):
  - **NCM**: API token, branch code
  - **GAAUBESI**: api_key, api_secret, base_url
  - **PATHAO / GBL**: currently stub — real integration needs their API docs; will show as "not connected" until implemented
3. Click **Test Connection** (existing `test-courier-connection` — extend to cover GAAUBESI too)
4. Save. That courier will now appear in the Push-to-Courier dropdown across the app.

No new secrets required beyond what user already stores per provider in `logistics_settings`.

### 7. Safety / non-regression

- Existing bulk `SubmitToCourierModal` flow stays functional but internally routes to the new edge path (removes mock AWB). Or, minimally: leave old modal untouched and only add the new single-row flow — decide during build; default is to keep old modal but stop using it in new entry points.
- No schema migrations required (uses `logistics_settings`, `couriers`, `order_courier`, `orders`, `order_history` already present).
- Store-scoped queries and RLS unchanged; owner bypass preserved.
- All new UI respects date/store context.

---

## Technical section

**New files**

- `src/hooks/useConnectedCouriers.ts` — filters `logistics_settings` by `is_active` + required credential fields per provider.
- `src/hooks/usePushToCourier.ts` — mutation wrapper around `send-to-courier` / `courier-gaaubesi-create`; handles per-provider payload shape.
- `src/hooks/useRefreshCourierStatus.ts` — calls new edge function.
- `src/components/orders/PushToCourierDialog.tsx` — dialog with connected-couriers dropdown, prefilled fields, weight/COD editable.
- `src/components/orders/PushToCourierButton.tsx` — row action with permission gating (uses `useAuth` + `useEffectiveRole`).
- `src/components/orders/RefreshCourierStatusButton.tsx`.
- `supabase/functions/courier-refresh-status/index.ts` — per-order status pull; verify_jwt handled per project standard.

**Edge function edits**

- `supabase/functions/send-to-courier/index.ts`: widen role gate to include CALLING/FOLLOWUP with ownership check on `orders.assigned_to` / `created_by`; keep admin/manager/logistics unrestricted.

**UI edits**

- `LeadsAll.tsx`, `AdminLeads.tsx`, `LeadsFollowup.tsx`: add `<PushToCourierButton>` in row menu (shown for CONFIRMED leads that have `order_id`).
- `CallingOrders.tsx`, `CallingMyOrders.tsx`, `AdminOrders.tsx`, `LogisticsOrders.tsx`: add push + refresh actions in row menu.
- Order detail page: header actions.

**Permission helper**

```ts
canPushCourier(role, row) =
  ['OWNER','ADMIN','MANAGER','LOGISTICS','SALES_MANAGER'].includes(role) ||
  (['CALLING','FOLLOWUP'].includes(role) && (row.assigned_to === uid || row.created_by === uid))
```

Applied both in UI (hide button) and edge function (403 if fails).

**Status mapping (courier → internal)**

- delivered → `DELIVERED`
- in_transit / picked_up / out_for_delivery → `DISPATCHED`
- returned / rto → `RETURNED`
- cancelled → `CANCELLED`
Anything else → keep current `order_status`, only update `order_courier.status`.