-- Add store_id to warehouses table
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Add store_id to branches table
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Add store_id to HRM tables
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.hr_policies ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.office_holidays ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.leave_types ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.hr_bank_accounts ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Add store_id to Training tables
ALTER TABLE public.training_courses ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.training_enrollments ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Add store_id to Accounting tables
ALTER TABLE public.accounting_banks ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.accounting_suppliers ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.accounting_wholesalers ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.accounting_expense_categories ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.accounting_bills ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.accounting_invoices ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.accounting_cash_ledger ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.accounting_transactions ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Add store_id to Marketing tables
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.ads_spend ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Add store_id to Messaging tables
ALTER TABLE public.message_channels ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.message_templates ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.message_automation_rules ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.message_logs ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Add store_id to daily_pl table
ALTER TABLE public.daily_pl ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Add store_id to assets table
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);
ALTER TABLE public.asset_assignments ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Add store_id to attendance_records
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_warehouses_store_id ON public.warehouses(store_id);
CREATE INDEX IF NOT EXISTS idx_branches_store_id ON public.branches(store_id);
CREATE INDEX IF NOT EXISTS idx_departments_store_id ON public.departments(store_id);
CREATE INDEX IF NOT EXISTS idx_employees_store_id ON public.employees(store_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_store_id ON public.campaigns(store_id);
CREATE INDEX IF NOT EXISTS idx_influencers_store_id ON public.influencers(store_id);
CREATE INDEX IF NOT EXISTS idx_ads_store_id ON public.ads(store_id);
CREATE INDEX IF NOT EXISTS idx_ads_spend_store_id ON public.ads_spend(store_id);
CREATE INDEX IF NOT EXISTS idx_accounting_banks_store_id ON public.accounting_banks(store_id);
CREATE INDEX IF NOT EXISTS idx_training_courses_store_id ON public.training_courses(store_id);
CREATE INDEX IF NOT EXISTS idx_daily_pl_store_id ON public.daily_pl(store_id);