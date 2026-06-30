# Daily Checkout Tasks — Extension of Task Management

Extending the existing Task Management module **without touching** existing tasks, attendance, checkout, roles, or permissions. All new functionality lives in new tables + new pages + a pre-checkout popup hook.

## 1. Database (new tables only)

Three new tables, fully isolated from existing `tasks`:

- `**daily_checkout_tasks**` — title, description, store_id, department_id (nullable), assigned_staff_id (nullable), frequency (`DAILY` | `SPECIFIC_DATE` | `WEEKDAYS`), specific_date, selected_weekdays (int[]), is_mandatory, is_active, priority, created_by, timestamps.
- `**daily_task_submissions**` — daily_task_id, staff_id (profile id), department_id, store_id, submission_date, is_done, remark, submitted_at, checkout_time.
- `**daily_task_checkout_overrides**` — staff_id, date, override_by, override_reason, override_time, store_id.

RLS:

- Admin/Owner/Manager/HR/SALES_MANAGER → full manage within store.
- Staff → SELECT own assigned tasks; INSERT own submissions; SELECT own submissions.
- All tables get proper `GRANT` to `authenticated` + `service_role`.
- If admin/owner/manager/hr/sales manager has aasigned daily work they should also checkout tick.

No existing table is modified.

## 2. Admin pages (new submenus under Task Management)

Add two routes under the existing HRM/Tasks section in `AppSidebar.tsx`:

- `**/hrm/daily-tasks/setup**` → `DailyTaskSetup.tsx`
  - Compact table layout (not cards): Title · Department · Staff · Frequency · Mandatory · Active · Priority · Actions.
  - Add/Edit dialog with all fields, weekday multiselect, department/staff pickers (reuse existing `useStaff` / departments).
  - Activate/deactivate toggle inline.
- `**/hrm/daily-tasks/reports**` → `DailyTaskReports.tsx`
  - Summary cards: assigned / done / not done / submitted staff / not-submitted staff / dept completion %.
  - Filters: date range, single date, staff, dept, task, status, mandatory, submitted/not.
  - Table of submissions + a "Not Submitted" section computed from assigned-vs-submitted diff.
  - Override records listed at bottom; admin can create override entry.

Sidebar entries are only shown to admin-equivalent roles (existing `roleUtils` helpers).

## 3. Staff checkout integration (safe hook into existing `AttendanceButton`)

`src/components/layout/AttendanceButton.tsx` is the single checkout entry point. Minimal change:

- Before calling `checkOut.mutate()`, fetch today's active assigned daily tasks for the user via a new `useTodayDailyTasks()` hook (resolves dept tasks + staff-specific tasks, dedupes by task id, staff-specific wins).
- If list is empty → existing checkout runs unchanged.
- If list is non-empty → open new `DailyTaskCheckoutDialog`.
- On successful submit → insert rows into `daily_task_submissions`, then trigger the original `checkOut.mutate(todayRecord.id)`.

Existing check-in flow and attendance hook are untouched.

## 4. Compact checkout popup

`src/components/tasks/DailyTaskCheckoutDialog.tsx`:

- Single Dialog, max-h with internal scroll, sticky footer "Submit Daily Tasks & Checkout".
- Each task = one compact row: title (truncate + tooltip for description) · Done switch · remark input.
- Mobile: stacked compact rows, no horizontal scroll.
- Validation: not-done ⇒ remark required (inline red helper text), submit disabled until valid.
- Loading + error toasts via existing `sonner`.

## 5. Optional staff dashboard widget

Small "Today's Daily Tasks" card in `MyHRDashboard.tsx` showing compact rows of assigned tasks with done/pending status for today. View-only; submission still happens at checkout.

## 6. Emergency override

In Daily Task Reports, an "Override Checkout" action for admin/owner lets them insert an override record for a staff/date. When `AttendanceButton` finds an override row for today, it skips the popup and runs normal checkout.

## 7. Permissions

Reuse existing role checks:

- Setup + Reports pages gated to OWNER/ADMIN/MANAGER/HR/SALES_MANAGER via existing `ProtectedRoute` patterns and sidebar `roleUtils`.
- Submissions readable by self for all staff; admin sees all in store.

## Files added

- `supabase/migrations/<ts>_daily_checkout_tasks.sql`
- `src/hooks/useDailyCheckoutTasks.ts`
- `src/components/tasks/DailyTaskCheckoutDialog.tsx`
- `src/components/tasks/DailyTaskFormDialog.tsx`
- `src/pages/hrm/DailyTaskSetup.tsx`
- `src/pages/hrm/DailyTaskReports.tsx`

## Files touched (additive only)

- `src/components/layout/AttendanceButton.tsx` — pre-checkout popup hook.
- `src/components/layout/AppSidebar.tsx` — two new menu entries under Tasks/HRM.
- `src/App.tsx` — two new routes.
- `src/pages/myhr/MyHRDashboard.tsx` — optional widget.

Nothing existing is renamed, removed, or repurposed.