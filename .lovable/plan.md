# Consignment Management Module

A new Import/Export Consignment Management module added under the existing **Inventory** section. Reuses your existing Customers, Suppliers (Parties), Accounting (Receivable/Payable), Role/Permission system, UI components, and design tokens — nothing existing will be removed or replaced.

## Where it lives
- Sidebar: **Inventory → Consignment Management**
- Routes:
  - `/inventory/consignments` — list page (tabs: Active / Completed)
  - `/inventory/consignments/:id` — detail page

## Pages & UI

### List page (`ConsignmentsList.tsx`)
- **Top summary cards (5):** Active, Completed, In Transit, Pending Customs, Receivable / Payable / Est. Profit (reusing `StatCard`).
- **Filter bar:** search (ID / customer / supplier), status, shipment mode (Air/Sea/Road/Courier), origin country, date range, active/completed — using existing filter components.
- **Tabs:** Active Consignments | Completed Consignments (shadcn `Tabs`).
- **Table:** Consignment ID, Customer, Supplier, Product, Mode, Origin → Destination, Status badge (color-coded), ETA, Total Cost, Profit, Actions (View, Edit, Delete with confirm modal, Mark Completed).
- **Create/Edit dialog:** large form (basic + shipment details). Customer/Supplier selected via existing `SearchablePartySelect` (parties table — `party_type` filters CUSTOMER / SUPPLIER / BOTH).
- **Export buttons:** consignment list, customer-wise, supplier-wise, status-wise, profit/loss, pending payments (XLSX via existing export pattern).

### Detail page (`ConsignmentDetail.tsx`)
Sections (cards/tabs): Basic Info • Customer & Supplier • Shipment Info • **Status Timeline** (17 stages, click to advance with remarks) • **Costing** (auto-totaled) • **Payments** (linked to accounting) • **Documents** (upload/preview/download/delete) • **Activity Log** • Notes.

## Status flow (17 stages)
Inquiry Received → Quotation Sent → Order Confirmed → Advance Received → Supplier Ordered → Goods Ready → Picked Up → In Origin Warehouse → Shipped → In Transit → Arrived at Port/Border → Customs Clearance Pending → Customs Cleared → In Nepal Warehouse → Out for Delivery → Delivered → Completed.

Each status change records: status, timestamp, user, remarks.

## Database (new tables, all `store_id`-scoped with RLS + GRANTs)
- `consignments` — main record (consignment_code auto-generated `CNS-0001`, customer_party_id, supplier_party_id, product fields, shipment fields, status, mode, origin/destination, dates, totals, profit, is_completed, completed_at, locked).
- `consignment_status_history` — status change log.
- `consignment_costs` — line items per cost type (product/freight/customs/agent/transport/warehouse/packaging/other).
- `consignment_payments` — customer & supplier payments; mirrors into existing `party_payments` / `party_transactions` so receivable/payable stays unified (no duplicate accounting logic).
- `consignment_documents` — file metadata pointing to a new storage bucket `consignment-docs`.
- `consignment_activity_logs` — generic audit trail.

RLS: store-scoped reads/writes via existing `user_has_store_access` + `is_owner`. Role permissions wired through the existing dynamic RBAC (`system_modules` + `role_permissions`) — new module key `consignment_management`.

## Permissions (via existing RBAC)
- **OWNER/ADMIN:** full CRUD, complete, unlock locked records.
- **ACCOUNTANT:** edit costing & payments only.
- **WAREHOUSE / LOGISTICS:** update shipment + status only.
- **LEADS / CALLING (sales):** create + view.
- Others: read-only per existing permission rows.

## Completion rules
"Mark Completed" enabled only when: status = Delivered, ≥1 document uploaded, payment status reviewed, costing totals saved. On completion → moves to Completed tab, locks financial fields (admin can unlock), stamps `completed_at`.

## Reuse map (no duplication)
| Need | Reuses |
|---|---|
| Customer/Supplier picker | `SearchablePartySelect` + `parties` table (`party_type` BOTH supported) |
| Receivable/Payable | writes into existing `party_payments` + `party_transactions` |
| Stat cards / badges / dialogs | `StatCard`, `getLeadStatusBadgeClass` pattern, shadcn `Dialog` (max-w-[1800px] per project std) |
| Date filters | `DateQuickFilters` |
| Role gating | `ProtectedRoute` + `useMyPermissions` |
| Store isolation | `useCurrentStoreId` + `store_id` filter |
| File storage | new public-read storage bucket `consignment-docs` |

## Out of scope (kept untouched)
Existing Customers, Suppliers, Parties, Inventory stock movements, Accounting transactions/ledgers, HRM, Leads, Orders — none of their files or tables are modified.

## Build order
1. DB migration (6 tables + GRANTs + RLS + storage bucket + RBAC module row).
2. Hooks: `useConsignments`, `useConsignmentDetail`, `useConsignmentCosts`, `useConsignmentPayments`, `useConsignmentDocuments`.
3. List page + Create/Edit dialog.
4. Detail page with all sections.
5. Sidebar link under Inventory + route registration.
6. Export utilities + reports.

Reply **"go"** to start, or tell me anything you want changed (different status stages, drop a section, different default tab, etc.).
