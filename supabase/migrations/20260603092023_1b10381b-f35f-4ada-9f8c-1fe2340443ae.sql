
-- 1. Add company_hold column and redefine net_salary
ALTER TABLE public.payroll_records DROP COLUMN net_salary;
ALTER TABLE public.payroll_records ADD COLUMN company_hold numeric DEFAULT 0;
ALTER TABLE public.payroll_records ADD COLUMN net_salary numeric GENERATED ALWAYS AS
  (basic_salary + COALESCE(allowances, 0) - COALESCE(deductions, 0) - COALESCE(company_hold, 0)) STORED;

-- 2. Company hold ledger table
CREATE TABLE public.company_hold_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  store_id uuid,
  entry_type text NOT NULL CHECK (entry_type IN ('HOLD','RELEASE')),
  amount numeric NOT NULL CHECK (amount >= 0),
  month_start date,
  notes text,
  payroll_record_id uuid REFERENCES public.payroll_records(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chl_employee ON public.company_hold_ledger(employee_id);
CREATE INDEX idx_chl_payroll ON public.company_hold_ledger(payroll_record_id);
CREATE UNIQUE INDEX uniq_chl_payroll_hold ON public.company_hold_ledger(payroll_record_id) WHERE entry_type = 'HOLD';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_hold_ledger TO authenticated;
GRANT ALL ON public.company_hold_ledger TO service_role;

ALTER TABLE public.company_hold_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage company hold ledger"
ON public.company_hold_ledger FOR ALL
USING (
  (has_role(auth.uid(),'ADMIN'::app_role) OR has_role(auth.uid(),'OWNER'::app_role)
   OR has_role(auth.uid(),'MANAGER'::app_role) OR has_role(auth.uid(),'ACCOUNTANT'::app_role)
   OR has_role(auth.uid(),'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
)
WITH CHECK (
  has_role(auth.uid(),'ADMIN'::app_role) OR has_role(auth.uid(),'OWNER'::app_role)
   OR has_role(auth.uid(),'MANAGER'::app_role) OR has_role(auth.uid(),'ACCOUNTANT'::app_role)
   OR has_role(auth.uid(),'HR'::app_role)
);

CREATE POLICY "Employees view own hold ledger"
ON public.company_hold_ledger FOR SELECT
USING (
  employee_id IN (SELECT e.id FROM employees e WHERE e.user_id = auth.uid())
);

-- 3. Trigger to sync HOLD entries on payroll insert/update/delete
CREATE OR REPLACE FUNCTION public.sync_payroll_company_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.company_hold_ledger WHERE payroll_record_id = OLD.id AND entry_type = 'HOLD';
    RETURN OLD;
  END IF;

  IF COALESCE(NEW.company_hold, 0) > 0 THEN
    INSERT INTO public.company_hold_ledger (employee_id, store_id, entry_type, amount, month_start, payroll_record_id, notes, created_by)
    VALUES (NEW.employee_id, NEW.store_id, 'HOLD', NEW.company_hold, NEW.month, NEW.id, 'Auto from payroll', auth.uid())
    ON CONFLICT (payroll_record_id) WHERE entry_type = 'HOLD'
    DO UPDATE SET amount = EXCLUDED.amount, month_start = EXCLUDED.month_start, store_id = EXCLUDED.store_id;
  ELSE
    DELETE FROM public.company_hold_ledger WHERE payroll_record_id = NEW.id AND entry_type = 'HOLD';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_payroll_company_hold
AFTER INSERT OR UPDATE OR DELETE ON public.payroll_records
FOR EACH ROW EXECUTE FUNCTION public.sync_payroll_company_hold();
