# Company Hold / My Savings Feature

Payroll ma अहिले Allowances ra Deductions छ — sangai **Company Hold** (SSF/saving type) field थप्ने। Hold amount payslip बाट काटिन्छ tara company ले staff को नाममा hold गर्छ। Admin ले pachi release गर्न सक्छ, history रहन्छ, ra release हुँदा calculation मिल्छ।

## 1. Database (new migration)

**New columns on `payroll_records`:**
- `company_hold` numeric default 0 — यो month को hold amount
- Net salary calculation: `basic + allowances - deductions - company_hold`

**New table `company_hold_ledger`** (per-employee running balance entries):
- employee_id, store_id, month_start (date)
- type: `HOLD` (payroll बाट) or `RELEASE` (admin बाट)
- amount (positive), notes, created_by, created_at
- payroll_record_id (nullable — HOLD entries मा link)

RLS:
- OWNER / ADMIN / MANAGER / ACCOUNTANT → full read/write
- Employees → own rows read only (via employee → user_id mapping)

Trigger: payroll record insert/update हुँदा matching HOLD entry auto-create / update.

## 2. Payroll Edit Dialog
- Modal ma **Company Hold** input थप्ने (Allowances/Deductions छेउमा)
- Net Salary live preview: Basic + Allow − Deduct − Hold
- Save हुँदा `payroll_records.company_hold` update + ledger sync

## 3. Payslip
- Payslip मा Company Hold line item देखाउने (deduction section तल अलग row)
- Net Salary calculation मा include

## 4. Admin Portal — Company Hold Section
New page: `/hrm/company-hold` (ADMIN/MANAGER/ACCOUNTANT/OWNER access)
- Staff list with: Total Held, Total Released, **Current Balance**
- Click staff row → modal/drawer with:
  - Month-wise breakdown (BS months)
  - HOLD / RELEASE entries table with date, amount, notes, by-whom
  - **Release** button → amount input + notes → creates RELEASE ledger entry
- History tab: सबै release history with filters

## 5. Staff Portal — My Savings
New page under MyHR: `/myhr/savings` (sidebar link "My Savings")
- Card: Total Saved, Total Released, Available Balance
- Month-wise breakdown table (अफ्नो only)
- Release history (read-only)

## 6. Calculation logic
- Current Balance = Σ HOLD − Σ RELEASE
- Release validation: amount ≤ current balance
- Release entries do NOT affect payroll net salary — separate cash-out tracking

## Technical details

**Files to create:**
- `supabase` migration (new column + table + RLS + trigger)
- `src/hooks/useCompanyHold.ts` — queries/mutations
- `src/pages/hrm/CompanyHold.tsx` — admin list + detail
- `src/components/hrm/CompanyHoldDetailDialog.tsx` — month breakdown + release
- `src/components/hrm/ReleaseHoldDialog.tsx`
- `src/pages/myhr/MySavings.tsx` — staff view

**Files to edit:**
- Payroll edit dialog component (find via HRMPayroll / HRMSalaryPayroll)
- Payslip component (HRMSalarySlip)
- Router (App.tsx) — add routes
- Sidebar — add menu items with proper role gating

**Role gating:** Use existing `ProtectedRoute` with roles `['OWNER','ADMIN','MANAGER','ACCOUNTANT']` for admin page; My Savings open to all authenticated employees.

Net salary formula update applied wherever payroll totals are computed (search for `allowances - deductions` pattern).
