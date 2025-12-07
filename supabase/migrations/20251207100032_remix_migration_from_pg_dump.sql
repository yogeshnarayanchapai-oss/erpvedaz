CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'ADMIN',
    'LEADS',
    'CALLING',
    'FOLLOWUP',
    'LOGISTICS',
    'MARKETING',
    'MANAGER',
    'HR'
);


--
-- Name: bill_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bill_status AS ENUM (
    'DRAFT',
    'PENDING',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'CANCELLED'
);


--
-- Name: channel_post_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.channel_post_status AS ENUM (
    'PENDING',
    'SCHEDULED',
    'PUBLISHED',
    'FAILED'
);


--
-- Name: cod_settlement_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cod_settlement_status AS ENUM (
    'PENDING',
    'SETTLED',
    'PARTIAL'
);


--
-- Name: courier_provider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.courier_provider AS ENUM (
    'NCM',
    'GBL',
    'PATHAO',
    'GAAUBESI'
);


--
-- Name: course_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.course_level AS ENUM (
    'BASIC',
    'INTERMEDIATE',
    'ADVANCED'
);


--
-- Name: employee_doc_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.employee_doc_status AS ENUM (
    'PENDING',
    'VERIFIED',
    'REJECTED'
);


--
-- Name: employee_doc_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.employee_doc_type AS ENUM (
    'PROFILE_PHOTO',
    'CITIZENSHIP_FRONT',
    'CITIZENSHIP_BACK',
    'PAN_CARD',
    'COMPANY_REQUIREMENT_DOC',
    'OTHER'
);


--
-- Name: enrollment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enrollment_status AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED'
);


--
-- Name: invoice_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoice_status AS ENUM (
    'DRAFT',
    'SENT',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'CANCELLED'
);


--
-- Name: lead_bucket; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lead_bucket AS ENUM (
    'NEW',
    'FOLLOWUP',
    'CANCELLED',
    'FOLLOW_UP_POOL',
    'CNR_POOL'
);


--
-- Name: lead_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lead_status AS ENUM (
    'NEW',
    'ASSIGNED',
    'IN_PROGRESS',
    'CONFIRMED',
    'FOLLOW_UP',
    'CALL_NOT_RECEIVED',
    'CANCELLED',
    'REDIRECT'
);


--
-- Name: logistics_delivery_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.logistics_delivery_status AS ENUM (
    'PENDING_PICKUP',
    'PICKED_UP',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELED',
    'RTO',
    'RETURNED_TO_SELLER'
);


--
-- Name: message_channel_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.message_channel_type AS ENUM (
    'SMS',
    'WHATSAPP'
);


--
-- Name: message_provider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.message_provider AS ENUM (
    'SPARROW',
    'TWILIO',
    'META',
    'OTHER'
);


--
-- Name: message_recipient_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.message_recipient_type AS ENUM (
    'CUSTOMER',
    'RESELLER',
    'STAFF',
    'ADMIN'
);


--
-- Name: message_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.message_status AS ENUM (
    'PENDING',
    'SENT',
    'FAILED'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'CONFIRMED',
    'PACKED',
    'DISPATCHED',
    'DELIVERED',
    'RETURNED',
    'SENT_FOR_DELIVERY',
    'LOCATION_CNR',
    'PENDING',
    'CANCELLED',
    'SENT_FOR_NCM',
    'SENT_FOR_PATHAO',
    'REDIRECT'
);


--
-- Name: payment_method_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method_type AS ENUM (
    'CASH',
    'BANK',
    'ONLINE'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'PENDING',
    'PAID',
    'COD'
);


--
-- Name: question_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.question_type AS ENUM (
    'MCQ',
    'TRUE_FALSE'
);


--
-- Name: social_platform; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.social_platform AS ENUM (
    'FACEBOOK',
    'INSTAGRAM',
    'TIKTOK',
    'YOUTUBE',
    'LINKEDIN',
    'TWITTER'
);


--
-- Name: stock_movement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stock_movement_type AS ENUM (
    'IN',
    'OUT',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'ADJUSTMENT',
    'RTO_IN',
    'RTO_OUT'
);


--
-- Name: team_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.team_type AS ENUM (
    'LEADS',
    'CALLING',
    'FOLLOWUP'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'INCOME',
    'EXPENSE',
    'TRANSFER'
);


--
-- Name: audit_trigger_func(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_trigger_func() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action, table_name, record_id, user_id, old_data)
    VALUES (TG_OP, TG_TABLE_NAME, OLD.id, auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (action, table_name, record_id, user_id, old_data, new_data)
    VALUES (TG_OP, TG_TABLE_NAME, NEW.id, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action, table_name, record_id, user_id, new_data)
    VALUES (TG_OP, TG_TABLE_NAME, NEW.id, auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: create_accounting_transaction_on_payment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_accounting_transaction_on_payment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_transaction_id UUID;
  v_description TEXT;
  v_party_name TEXT;
BEGIN
  -- Get party name
  SELECT name INTO v_party_name FROM parties WHERE id = NEW.party_id;
  
  -- Create description
  IF NEW.payment_type = 'RECEIVED' THEN
    v_description := 'Payment received from ' || COALESCE(v_party_name, 'party');
  ELSE
    v_description := 'Payment made to ' || COALESCE(v_party_name, 'party');
  END IF;
  
  -- Insert into transactions table with lowercase type values
  INSERT INTO transactions (
    date,
    type,
    category_id,
    account_id,
    party_id,
    amount,
    description,
    note,
    is_cleared,
    created_at
  ) VALUES (
    NEW.date,
    CASE 
      WHEN NEW.payment_type = 'RECEIVED' THEN 'income'
      ELSE 'expense'
    END,
    NULL,
    NEW.bank_account_id,
    NEW.party_id,
    NEW.amount,
    v_description || COALESCE(' - ' || NEW.note, ''),
    NEW.note,
    true,
    now()
  ) RETURNING id INTO v_transaction_id;
  
  RETURN NEW;
END;
$$;


--
-- Name: create_party_transaction_from_stock_movement(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_party_transaction_from_stock_movement() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_existing_count INTEGER;
BEGIN
  -- Only create party transaction if party_id is set
  IF NEW.party_id IS NOT NULL AND NEW.movement_source IS NOT NULL THEN
    
    -- For SUPPLIER purchases (IN movements)
    IF NEW.movement_type = 'IN' AND NEW.movement_source = 'SUPPLIER' THEN
      -- Check if a party transaction already exists for this stock movement
      SELECT COUNT(*) INTO v_existing_count
      FROM public.party_transactions
      WHERE party_id = NEW.party_id
        AND source = 'STOCK_IN'
        AND reference = NEW.id::text;
      
      -- Only create if no existing record
      IF v_existing_count = 0 THEN
        INSERT INTO public.party_transactions (
          party_id,
          date,
          product_id,
          warehouse_id,
          qty,
          rate,
          amount,
          direction,
          source,
          reference,
          remarks
        ) VALUES (
          NEW.party_id,
          NEW.movement_date,
          NEW.product_id,
          NEW.warehouse_id,
          NEW.qty,
          COALESCE(NEW.unit_cost, 0),
          NEW.qty * COALESCE(NEW.unit_cost, 0),
          'PAYABLE',
          'STOCK_IN',
          NEW.id::text,
          NEW.remark
        );
      END IF;
    END IF;
    
    -- For WHOLESALE sales (OUT movements)
    IF NEW.movement_type = 'OUT' AND NEW.movement_source = 'WHOLESALE' THEN
      -- Check if a party transaction already exists for this stock movement
      SELECT COUNT(*) INTO v_existing_count
      FROM public.party_transactions
      WHERE party_id = NEW.party_id
        AND source = 'WHOLESALE_OUT'
        AND reference = NEW.id::text;
      
      -- Only create if no existing record
      IF v_existing_count = 0 THEN
        INSERT INTO public.party_transactions (
          party_id,
          date,
          product_id,
          warehouse_id,
          qty,
          rate,
          amount,
          direction,
          source,
          reference,
          remarks
        ) VALUES (
          NEW.party_id,
          NEW.movement_date,
          NEW.product_id,
          NEW.warehouse_id,
          NEW.qty,
          COALESCE(NEW.unit_price, 0),
          NEW.qty * COALESCE(NEW.unit_price, 0),
          'RECEIVABLE',
          'WHOLESALE_OUT',
          NEW.id::text,
          NEW.remark
        );
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: create_verification_otp(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_verification_otp(p_user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_otp TEXT;
BEGIN
  v_otp := generate_otp();
  
  INSERT INTO public.email_verifications (user_id, otp_code, expires_at)
  VALUES (p_user_id, v_otp, NOW() + INTERVAL '15 minutes')
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    otp_code = v_otp,
    expires_at = NOW() + INTERVAL '15 minutes',
    verified = FALSE,
    verified_at = NULL;
  
  RETURN v_otp;
END;
$$;


--
-- Name: generate_otp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_otp() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  otp TEXT;
BEGIN
  otp := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  RETURN otp;
END;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Always assign CALLING role by default, admin must change it later
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'CALLING'::app_role  -- SECURITY: Never trust client-supplied role
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    'CALLING'::app_role  -- SECURITY: Default role only
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: log_order_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_order_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Log order status change
  IF OLD.order_status IS DISTINCT FROM NEW.order_status THEN
    INSERT INTO public.order_history (order_id, changed_by, event_type, old_value, new_value, description)
    VALUES (
      NEW.id,
      auth.uid(),
      'STATUS_CHANGE',
      OLD.order_status::TEXT,
      NEW.order_status::TEXT,
      'Order status changed from ' || COALESCE(OLD.order_status::TEXT, 'None') || ' to ' || COALESCE(NEW.order_status::TEXT, 'None')
    );
  END IF;

  -- Log payment status change
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO public.order_history (order_id, changed_by, event_type, old_value, new_value, description)
    VALUES (
      NEW.id,
      auth.uid(),
      'PAYMENT_CHANGE',
      OLD.payment_status::TEXT,
      NEW.payment_status::TEXT,
      'Payment status changed from ' || COALESCE(OLD.payment_status::TEXT, 'None') || ' to ' || COALESCE(NEW.payment_status::TEXT, 'None')
    );
  END IF;

  -- Log courier submission
  IF OLD.courier_provider IS DISTINCT FROM NEW.courier_provider THEN
    INSERT INTO public.order_history (order_id, changed_by, event_type, old_value, new_value, description)
    VALUES (
      NEW.id,
      auth.uid(),
      'COURIER_UPDATE',
      OLD.courier_provider,
      NEW.courier_provider,
      'Submitted to courier: ' || COALESCE(NEW.courier_provider, 'None')
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: log_order_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_order_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.order_status IS DISTINCT FROM NEW.order_status THEN
    INSERT INTO public.order_status_history (order_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.order_status, NEW.order_status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: perform_system_reset(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.perform_system_reset() RETURNS TABLE(table_name text, rows_deleted bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count BIGINT;
BEGIN
  -- 1. Order-related child tables first
  DELETE FROM public.order_items WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'order_items'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.order_status_history WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'order_status_history'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.order_history WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'order_history'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.order_comments WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'order_comments'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.order_events WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'order_events'; rows_deleted := v_count; RETURN NEXT;

  -- 2. Logistics/Courier tables
  DELETE FROM public.courier_updates WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'courier_updates'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.cod_settlements WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'cod_settlements'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.logistics_orders WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'logistics_orders'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.courier_stats WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'courier_stats'; rows_deleted := v_count; RETURN NEXT;

  -- 3. Lead-related tables
  DELETE FROM public.call_logs WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'call_logs'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.lead_transfers WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'lead_transfers'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.followup_logs WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'followup_logs'; rows_deleted := v_count; RETURN NEXT;

  -- 4. Customer-related tables
  DELETE FROM public.customer_activity_log WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'customer_activity_log'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.customer_notes WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'customer_notes'; rows_deleted := v_count; RETURN NEXT;

  -- 5. Clear order_id from leads before deleting orders
  UPDATE public.leads SET order_id = NULL WHERE order_id IS NOT NULL;

  -- 6. Delete orders
  DELETE FROM public.orders WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'orders'; rows_deleted := v_count; RETURN NEXT;

  -- 7. Delete leads
  DELETE FROM public.leads WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'leads'; rows_deleted := v_count; RETURN NEXT;

  -- 8. Delete customers
  DELETE FROM public.customers WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'customers'; rows_deleted := v_count; RETURN NEXT;

  -- 9. Accounting tables
  DELETE FROM public.accounting_transaction_lines WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'accounting_transaction_lines'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.accounting_payments WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'accounting_payments'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.accounting_invoice_items WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'accounting_invoice_items'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.accounting_invoices WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'accounting_invoices'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.accounting_bills WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'accounting_bills'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.accounting_transactions WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'accounting_transactions'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.accounting_cash_ledger WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'accounting_cash_ledger'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.transactions WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'transactions'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.party_payments WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'party_payments'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.party_transactions WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'party_transactions'; rows_deleted := v_count; RETURN NEXT;

  -- 10. Inventory tables
  DELETE FROM public.stock_movements WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'stock_movements'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.sales_records WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'sales_records'; rows_deleted := v_count; RETURN NEXT;

  -- Reset product inventory to opening stock
  UPDATE public.product_inventory SET current_stock = opening_stock, reorder_required = false WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'product_inventory (reset)'; rows_deleted := v_count; RETURN NEXT;

  -- 11. HR related transactional data
  DELETE FROM public.attendance_records WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'attendance_records'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.leave_requests WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'leave_requests'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.leave_quota WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'leave_quota'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.payroll_records WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'payroll_records'; rows_deleted := v_count; RETURN NEXT;

  -- 12. Chat/Notifications
  DELETE FROM public.chat_messages WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'chat_messages'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.chat_room_members WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'chat_room_members'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.chat_rooms WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'chat_rooms'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.notifications WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'notifications'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.user_view_state WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'user_view_state'; rows_deleted := v_count; RETURN NEXT;

  -- 13. Marketing/Ads
  DELETE FROM public.ads WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'ads'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.ads_spend WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'ads_spend'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.staff_targets WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'staff_targets'; rows_deleted := v_count; RETURN NEXT;

  -- 14. Office expenses/notices
  DELETE FROM public.office_expenses WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'office_expenses'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.notices WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'notices'; rows_deleted := v_count; RETURN NEXT;

  -- 15. Audit tables
  DELETE FROM public.audit_manual_entries WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'audit_manual_entries'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.audit_entry_toggles WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'audit_entry_toggles'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.audit_snapshots WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'audit_snapshots'; rows_deleted := v_count; RETURN NEXT;

  DELETE FROM public.audit_logs WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'audit_logs'; rows_deleted := v_count; RETURN NEXT;

  -- 16. Reset account balances to opening balance
  UPDATE public.accounts SET current_balance = COALESCE(opening_balance, 0) WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'accounts (balance reset)'; rows_deleted := v_count; RETURN NEXT;

  UPDATE public.accounting_banks SET current_balance = COALESCE(opening_balance, 0) WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'accounting_banks (balance reset)'; rows_deleted := v_count; RETURN NEXT;

  -- 17. Reset parties balance (only if opening_balance column exists)
  UPDATE public.parties SET opening_balance = COALESCE(opening_balance, 0) WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'parties (balance reset)'; rows_deleted := v_count; RETURN NEXT;

  UPDATE public.accounting_suppliers SET current_balance = COALESCE(opening_balance, 0) WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'accounting_suppliers (balance reset)'; rows_deleted := v_count; RETURN NEXT;

  UPDATE public.accounting_wholesalers SET current_balance = COALESCE(opening_balance, 0) WHERE id IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'accounting_wholesalers (balance reset)'; rows_deleted := v_count; RETURN NEXT;

  RETURN;
END;
$$;


--
-- Name: prevent_confirmed_lead_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_confirmed_lead_assignment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If the lead is confirmed (status = 'CONFIRMED' or has an order_id), prevent assignment changes
  IF OLD.status = 'CONFIRMED' OR OLD.order_id IS NOT NULL THEN
    -- If trying to change assigned_to_user_id on a confirmed lead, reject
    IF OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
      RAISE EXCEPTION 'Cannot transfer or reassign a confirmed lead. This lead has already been converted to an order.';
    END IF;
    -- Also prevent changing current_team on confirmed leads
    IF OLD.current_team IS DISTINCT FROM NEW.current_team THEN
      RAISE EXCEPTION 'Cannot change team for a confirmed lead. This lead has already been converted to an order.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: recalculate_inventory(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalculate_inventory() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_product_id UUID;
  v_warehouse_id UUID;
  v_opening NUMERIC;
  v_in_total NUMERIC;
  v_out_total NUMERIC;
  v_new_stock NUMERIC;
  v_reorder_level NUMERIC;
BEGIN
  -- Determine which product/warehouse to update
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
    v_warehouse_id := OLD.warehouse_id;
  ELSE
    v_product_id := NEW.product_id;
    v_warehouse_id := NEW.warehouse_id;
  END IF;

  -- Get opening stock and reorder level
  SELECT COALESCE(opening_stock, 0), COALESCE(reorder_level, 0)
  INTO v_opening, v_reorder_level
  FROM public.product_inventory
  WHERE product_id = v_product_id AND warehouse_id = v_warehouse_id;

  -- If no inventory record exists, create one
  IF NOT FOUND THEN
    v_opening := 0;
    v_reorder_level := 0;
    INSERT INTO public.product_inventory (product_id, warehouse_id, opening_stock, current_stock, reorder_level)
    VALUES (v_product_id, v_warehouse_id, 0, 0, 0);
  END IF;

  -- Calculate total IN movements
  SELECT COALESCE(SUM(qty), 0) INTO v_in_total
  FROM public.stock_movements
  WHERE product_id = v_product_id 
    AND warehouse_id = v_warehouse_id
    AND movement_type IN ('IN', 'TRANSFER_IN', 'RTO_IN');

  -- Calculate total OUT movements
  SELECT COALESCE(SUM(qty), 0) INTO v_out_total
  FROM public.stock_movements
  WHERE product_id = v_product_id 
    AND warehouse_id = v_warehouse_id
    AND movement_type IN ('OUT', 'TRANSFER_OUT', 'ADJUSTMENT', 'RTO_OUT');

  -- Calculate new stock
  v_new_stock := v_opening + v_in_total - v_out_total;

  -- Update inventory
  UPDATE public.product_inventory
  SET current_stock = v_new_stock,
      reorder_required = (v_new_stock <= v_reorder_level),
      updated_at = now()
  WHERE product_id = v_product_id AND warehouse_id = v_warehouse_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: refresh_courier_stats(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_courier_stats(p_date date DEFAULT CURRENT_DATE) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.courier_stats (courier, date, total, delivered, in_transit, pending_pickup, rto, cancelled, cod_collected, cod_pending)
  SELECT 
    lo.courier::TEXT,
    p_date,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE lo.delivery_status = 'DELIVERED') as delivered,
    COUNT(*) FILTER (WHERE lo.delivery_status IN ('IN_TRANSIT', 'OUT_FOR_DELIVERY')) as in_transit,
    COUNT(*) FILTER (WHERE lo.delivery_status = 'PENDING_PICKUP') as pending_pickup,
    COUNT(*) FILTER (WHERE lo.delivery_status IN ('RETURNED', 'RTO')) as rto,
    COUNT(*) FILTER (WHERE lo.delivery_status = 'CANCELLED') as cancelled,
    COALESCE(SUM(CASE WHEN lo.cod_collected = true THEN lo.cod_amount ELSE 0 END), 0) as cod_collected,
    COALESCE(SUM(CASE WHEN lo.cod_collected = false AND lo.cod_amount > 0 THEN lo.cod_amount ELSE 0 END), 0) as cod_pending
  FROM public.logistics_orders lo
  WHERE DATE(lo.created_at) = p_date
  GROUP BY lo.courier
  ON CONFLICT (courier, date) 
  DO UPDATE SET
    total = EXCLUDED.total,
    delivered = EXCLUDED.delivered,
    in_transit = EXCLUDED.in_transit,
    pending_pickup = EXCLUDED.pending_pickup,
    rto = EXCLUDED.rto,
    cancelled = EXCLUDED.cancelled,
    cod_collected = EXCLUDED.cod_collected,
    cod_pending = EXCLUDED.cod_pending,
    updated_at = NOW();
END;
$$;


--
-- Name: reset_order_number_sequence(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_order_number_sequence(start_value integer DEFAULT 1000) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Reset the orders_order_number_seq to start from specified value
  EXECUTE format('ALTER SEQUENCE IF EXISTS orders_order_number_seq RESTART WITH %s', start_value);
END;
$$;


--
-- Name: setup_first_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.setup_first_admin() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Check if any admin exists
  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'ADMIN';
  
  -- If no admin exists, make this user an admin
  IF admin_count = 0 THEN
    -- Update profile to ADMIN
    UPDATE public.profiles SET role = 'ADMIN', is_active = true WHERE id = NEW.id;
    
    -- Update user_roles to ADMIN
    UPDATE public.user_roles SET role = 'ADMIN' WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: sync_customer_from_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_customer_from_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_customer_id UUID;
  v_customer_name TEXT;
  v_phone_number TEXT;
  v_full_address TEXT;
BEGIN
  -- Get customer info from lead if available
  IF NEW.lead_id IS NOT NULL THEN
    SELECT client_name, contact_number, full_address
    INTO v_customer_name, v_phone_number, v_full_address
    FROM leads
    WHERE id = NEW.lead_id;
  END IF;
  
  -- Skip if no phone number
  IF v_phone_number IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Insert or update customer
  INSERT INTO public.customers (
    phone_number,
    customer_name,
    full_address,
    first_order_date,
    last_order_date
  )
  VALUES (
    v_phone_number,
    v_customer_name,
    COALESCE(NEW.full_address, v_full_address),
    NEW.order_date,
    NEW.order_date
  )
  ON CONFLICT (phone_number) DO UPDATE SET
    customer_name = COALESCE(EXCLUDED.customer_name, customers.customer_name),
    full_address = COALESCE(EXCLUDED.full_address, customers.full_address),
    last_order_date = GREATEST(customers.last_order_date, EXCLUDED.last_order_date),
    updated_at = NOW()
  RETURNING id INTO v_customer_id;
  
  -- Link order to customer
  NEW.customer_id := v_customer_id;
  
  -- Update customer stats
  UPDATE public.customers
  SET
    total_orders = (
      SELECT COUNT(*)
      FROM orders
      WHERE customer_id = v_customer_id
    ),
    total_order_value = (
      SELECT COALESCE(SUM(amount), 0)
      FROM orders
      WHERE customer_id = v_customer_id
        AND order_status IN ('CONFIRMED', 'DELIVERED')
    ),
    delivered_orders = (
      SELECT COUNT(*)
      FROM orders
      WHERE customer_id = v_customer_id
        AND order_status = 'DELIVERED'
    ),
    rto_orders = (
      SELECT COUNT(*)
      FROM orders
      WHERE customer_id = v_customer_id
        AND order_status IN ('RETURNED', 'CANCELLED')
    )
  WHERE id = v_customer_id;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_account_balance_on_payment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_account_balance_on_payment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update account balance when payment is recorded
  IF NEW.bank_account_id IS NOT NULL THEN
    IF NEW.payment_type = 'RECEIVED' THEN
      -- Money coming in, increase account balance
      UPDATE accounts 
      SET current_balance = current_balance + NEW.amount
      WHERE id = NEW.bank_account_id;
    ELSIF NEW.payment_type = 'PAID' THEN
      -- Money going out, decrease account balance
      UPDATE accounts 
      SET current_balance = current_balance - NEW.amount
      WHERE id = NEW.bank_account_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_accounts_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_accounts_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_customer_notes_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_customer_notes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_order_comments_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_order_comments_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_parties_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_parties_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_stores_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_stores_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_transactions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_transactions_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: verify_email_otp(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_email_otp(p_user_id uuid, p_otp text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  UPDATE public.email_verifications
  SET verified = TRUE, verified_at = NOW()
  WHERE user_id = p_user_id 
    AND otp_code = p_otp 
    AND expires_at > NOW()
    AND verified = FALSE
  RETURNING TRUE INTO v_valid;
  
  IF v_valid THEN
    UPDATE public.profiles
    SET email_verified = TRUE, email_verified_at = NOW()
    WHERE id = p_user_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: accounting_banks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_banks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bank_name text NOT NULL,
    account_number text,
    account_holder text,
    branch_name text,
    ifsc_code text,
    opening_balance numeric DEFAULT 0,
    current_balance numeric DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounting_bills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_bills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bill_number text NOT NULL,
    supplier_id uuid,
    bill_date date NOT NULL,
    due_date date,
    category_id uuid,
    total_amount numeric DEFAULT 0 NOT NULL,
    paid_amount numeric DEFAULT 0,
    outstanding_amount numeric DEFAULT 0,
    status public.bill_status DEFAULT 'DRAFT'::public.bill_status,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounting_cash_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_cash_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_date date NOT NULL,
    transaction_type text NOT NULL,
    amount numeric NOT NULL,
    description text NOT NULL,
    reference_type text,
    reference_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounting_expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounting_invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid,
    product_id uuid,
    description text NOT NULL,
    quantity numeric NOT NULL,
    rate numeric NOT NULL,
    amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounting_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text NOT NULL,
    wholesaler_id uuid,
    order_id uuid,
    invoice_date date NOT NULL,
    due_date date,
    total_amount numeric DEFAULT 0 NOT NULL,
    paid_amount numeric DEFAULT 0,
    outstanding_amount numeric DEFAULT 0,
    status public.invoice_status DEFAULT 'DRAFT'::public.invoice_status,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounting_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_date date NOT NULL,
    amount numeric NOT NULL,
    payment_method public.payment_method_type NOT NULL,
    bank_id uuid,
    invoice_id uuid,
    bill_id uuid,
    reference_number text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounting_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    gst_number text,
    pan_number text,
    opening_balance numeric DEFAULT 0,
    current_balance numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounting_transaction_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_transaction_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid,
    account_id uuid,
    party_id uuid,
    debit numeric DEFAULT 0,
    credit numeric DEFAULT 0,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounting_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_date date NOT NULL,
    transaction_type public.transaction_type NOT NULL,
    amount numeric NOT NULL,
    payment_method public.payment_method_type NOT NULL,
    bank_id uuid,
    category_id uuid,
    description text NOT NULL,
    reference_type text,
    reference_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounting_wholesalers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_wholesalers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    gst_number text,
    pan_number text,
    opening_balance numeric DEFAULT 0,
    current_balance numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    account_number text,
    opening_balance numeric DEFAULT 0,
    current_balance numeric DEFAULT 0,
    currency text DEFAULT 'NPR'::text,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT accounts_type_check CHECK ((type = ANY (ARRAY['cash'::text, 'bank'::text, 'wallet'::text, 'other'::text])))
);


--
-- Name: ads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    date date NOT NULL,
    platform text NOT NULL,
    amount_spent numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    target_orders integer,
    dollar_rate numeric DEFAULT 133.5,
    amount_usd numeric
);


--
-- Name: ads_spend; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ads_spend (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    product_id uuid,
    product_name_cached text,
    platform text NOT NULL,
    selling_price numeric DEFAULT 0,
    usd_amount numeric DEFAULT 0,
    usd_to_npr_rate numeric DEFAULT 133.5,
    npr_amount numeric DEFAULT 0,
    delivery_cost_per_order numeric DEFAULT 0,
    target_orders integer DEFAULT 0,
    rto_percentage_target numeric DEFAULT 0,
    confirmed_orders integer DEFAULT 0,
    delivered_orders integer DEFAULT 0,
    rto_orders integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: asset_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    assigned_on date DEFAULT CURRENT_DATE NOT NULL,
    returned_on date,
    condition_on_assign text,
    condition_on_return text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_code text NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'Other'::text NOT NULL,
    description text,
    purchase_date date,
    purchase_cost numeric,
    status text DEFAULT 'Available'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assets_status_check CHECK ((status = ANY (ARRAY['Available'::text, 'Assigned'::text, 'Repair'::text, 'Lost'::text, 'Disposed'::text])))
);


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
    status text DEFAULT 'Present'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_records_status_check CHECK ((status = ANY (ARRAY['Present'::text, 'Absent'::text, 'Half-day'::text, 'Work From Home'::text, 'Leave'::text])))
);


--
-- Name: audit_entry_toggles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_entry_toggles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_table text NOT NULL,
    source_id uuid NOT NULL,
    include_in_audit boolean DEFAULT true,
    toggled_by uuid,
    toggled_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    user_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_manual_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_manual_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text NOT NULL,
    sub_category text,
    description text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    quantity numeric,
    date date NOT NULL,
    fiscal_year text,
    fiscal_quarter text,
    fiscal_month text,
    notes text,
    include_in_audit boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_name text NOT NULL,
    snapshot_date date NOT NULL,
    fiscal_year text,
    fiscal_quarter text,
    data jsonb NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text,
    branch_name text NOT NULL,
    arrival_time text,
    contact_name text,
    contact_phone text,
    district text,
    province text,
    base_charge numeric,
    area_covered text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: branding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branding (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    primary_color text DEFAULT '#008060'::text,
    secondary_color text DEFAULT '#004C3F'::text,
    font_family text DEFAULT 'Inter'::text,
    logo_url text,
    favicon_url text,
    banner_url text,
    announcement_text text,
    whatsapp_number text,
    facebook_pixel text,
    google_analytics text,
    site_under_construction boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: call_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    staff_id uuid,
    called_at timestamp with time zone DEFAULT now(),
    outcome text NOT NULL,
    notes text,
    next_followup_date date
);


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    objective text,
    start_date date,
    end_date date,
    target_orders integer DEFAULT 0,
    target_revenue_npr numeric DEFAULT 0,
    total_budget_npr numeric DEFAULT 0,
    ads_budget_npr numeric DEFAULT 0,
    influencer_budget_npr numeric DEFAULT 0,
    production_budget_npr numeric DEFAULT 0,
    primary_product text,
    status text DEFAULT 'Planning'::text,
    owner text,
    notes text
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    image_url text,
    parent_id uuid,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_room_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_room_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'GLOBAL'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_rooms_type_check CHECK ((type = ANY (ARRAY['GLOBAL'::text, 'DEPARTMENT'::text, 'DIRECT'::text])))
);


--
-- Name: cod_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cod_settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    courier public.courier_provider NOT NULL,
    logistics_order_id uuid,
    order_id uuid,
    cod_amount numeric NOT NULL,
    settled_amount numeric DEFAULT 0,
    pending_amount numeric,
    status public.cod_settlement_status DEFAULT 'PENDING'::public.cod_settlement_status NOT NULL,
    settlement_date date,
    bank_reference text,
    courier_settlement_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: company_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_info (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text NOT NULL,
    registration_no text,
    address text,
    phone text,
    email text,
    website text,
    logo_url text,
    other_details text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: courier_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courier_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    courier text NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    total integer DEFAULT 0,
    delivered integer DEFAULT 0,
    in_transit integer DEFAULT 0,
    pending_pickup integer DEFAULT 0,
    rto integer DEFAULT 0,
    cancelled integer DEFAULT 0,
    cod_collected numeric DEFAULT 0,
    cod_pending numeric DEFAULT 0,
    avg_delivery_hours numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: courier_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courier_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    logistics_order_id uuid,
    courier text NOT NULL,
    status text NOT NULL,
    note text,
    webhook_data jsonb,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: couriers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.couriers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    is_active boolean DEFAULT true,
    is_api_connected boolean DEFAULT false,
    api_config jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    activity_type text NOT NULL,
    description text NOT NULL,
    reference_id uuid,
    reference_type text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    note text NOT NULL,
    note_type text DEFAULT 'GENERAL'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number text NOT NULL,
    customer_name text,
    email text,
    full_address text,
    province text,
    city text,
    landmark text,
    total_orders integer DEFAULT 0,
    total_order_value numeric DEFAULT 0,
    rto_orders integer DEFAULT 0,
    delivered_orders integer DEFAULT 0,
    first_order_date timestamp with time zone,
    last_order_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'ACTIVE'::text,
    tags text[] DEFAULT '{}'::text[],
    alt_phone text,
    store_id uuid
);


--
-- Name: daily_pl; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_pl (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    date date NOT NULL,
    total_units_sold numeric DEFAULT 0 NOT NULL,
    gross_sales_value numeric DEFAULT 0 NOT NULL,
    product_cost numeric DEFAULT 0 NOT NULL,
    delivery_cost numeric DEFAULT 0 NOT NULL,
    rto_units numeric DEFAULT 0 NOT NULL,
    rto_cost numeric DEFAULT 0 NOT NULL,
    ads_spent_usd numeric DEFAULT 0 NOT NULL,
    ads_spent_npr numeric DEFAULT 0 NOT NULL,
    staff_office_cost numeric DEFAULT 0 NOT NULL,
    other_expenses numeric DEFAULT 0 NOT NULL,
    total_expense numeric DEFAULT 0 NOT NULL,
    actual_profit numeric DEFAULT 0 NOT NULL,
    target_profit numeric DEFAULT 0 NOT NULL,
    target_orders numeric DEFAULT 0 NOT NULL,
    rto_rate_percent numeric DEFAULT 0,
    rto_cost_per_order numeric DEFAULT 0,
    rto_orders integer DEFAULT 0,
    delivery_cost_per_order numeric DEFAULT 0,
    usd_rate numeric DEFAULT 150,
    warehouse_id uuid,
    roi_ads numeric DEFAULT 0,
    actual_sales numeric DEFAULT 0
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    otp_code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified boolean DEFAULT false,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: employee_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    doc_type public.employee_doc_type NOT NULL,
    title text,
    file_url text NOT NULL,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    status public.employee_doc_status DEFAULT 'PENDING'::public.employee_doc_status NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    full_name text NOT NULL,
    email text,
    phone text,
    "position" text,
    department_id uuid,
    joining_date date,
    status text DEFAULT 'Active'::text NOT NULL,
    base_salary numeric,
    bank_account_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    photo_url text,
    designation text,
    shift text DEFAULT 'Day'::text,
    daily_target integer DEFAULT 100,
    guardian_name text,
    guardian_relation text,
    guardian_phone text,
    citizenship_number text,
    pan_number text,
    CONSTRAINT employees_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Inactive'::text])))
);


--
-- Name: failed_login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.failed_login_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    ip_address text,
    user_agent text,
    attempted_at timestamp with time zone DEFAULT now()
);


--
-- Name: followup_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.followup_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    updated_by uuid,
    old_status text,
    new_status text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hr_bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bank_name text NOT NULL,
    branch text,
    account_name text NOT NULL,
    account_number text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hr_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    category text,
    content text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hr_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date_display_mode text DEFAULT 'AD'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hr_settings_date_display_mode_check CHECK ((date_display_mode = ANY (ARRAY['AD'::text, 'BS'::text, 'AD+BS'::text])))
);


--
-- Name: influencers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.influencers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    handle text,
    platform text DEFAULT 'TikTok'::text NOT NULL,
    category text,
    followers_count integer DEFAULT 0,
    contact_person text,
    phone text NOT NULL,
    alternate_phone text,
    whatsapp_number text,
    email text,
    city text,
    region text,
    best_call_time text DEFAULT 'Anytime'::text,
    collaboration_type text DEFAULT 'Paid'::text,
    main_product text,
    campaign_name text,
    per_video_charge_npr numeric DEFAULT 0,
    per_story_charge_npr numeric DEFAULT 0,
    currency text DEFAULT 'NPR'::text,
    status text DEFAULT 'New'::text,
    priority text DEFAULT 'Medium'::text,
    last_contacted_date date,
    next_followup_date date,
    assigned_to text,
    notes text,
    tiktok_url text,
    instagram_url text,
    youtube_url text,
    facebook_url text
);


--
-- Name: lead_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    from_staff_id uuid,
    to_staff_id uuid,
    transferred_by uuid,
    action text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lead_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lead_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid,
    from_user_id uuid,
    to_user_id uuid,
    from_team public.team_type,
    to_team public.team_type,
    transferred_by_user_id uuid,
    transferred_at timestamp with time zone DEFAULT now()
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    date date DEFAULT CURRENT_DATE NOT NULL,
    client_name text NOT NULL,
    contact_number text NOT NULL,
    product_id uuid,
    destination_branch text,
    full_address text,
    od_vd text,
    status public.lead_status DEFAULT 'NEW'::public.lead_status,
    remark text,
    source text,
    current_team public.team_type DEFAULT 'LEADS'::public.team_type,
    assigned_to_user_id uuid,
    created_by_user_id uuid,
    order_id uuid,
    alt_phone text,
    order_description text,
    tag text,
    branch_id uuid,
    lead_bucket public.lead_bucket DEFAULT 'NEW'::public.lead_bucket,
    last_called_by uuid,
    last_called_at timestamp with time zone,
    last_transfer_reason text,
    pool_status text DEFAULT 'IN_POOL'::text,
    returned_to_leads_at timestamp with time zone,
    assigned_at timestamp with time zone,
    next_followup_at timestamp with time zone,
    followup_reason text,
    is_followup_reminded boolean DEFAULT false,
    followup_completed boolean DEFAULT false,
    source_id uuid,
    store_id uuid,
    ai_lead_score integer,
    ai_lead_label text,
    ai_followup_text text,
    ai_last_evaluated_at timestamp with time zone,
    created_by_staff_id uuid,
    is_transferred boolean DEFAULT false NOT NULL,
    confirmed_by_user_id uuid,
    confirmed_at timestamp with time zone,
    CONSTRAINT leads_ai_lead_label_valid CHECK (((ai_lead_label IS NULL) OR (ai_lead_label = ANY (ARRAY['Hot'::text, 'Warm'::text, 'Cold'::text])))),
    CONSTRAINT leads_ai_lead_score_range CHECK (((ai_lead_score IS NULL) OR ((ai_lead_score >= 0) AND (ai_lead_score <= 100))))
);

ALTER TABLE ONLY public.leads REPLICA IDENTITY FULL;


--
-- Name: leave_quota; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_quota (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    leave_type_id uuid NOT NULL,
    year integer NOT NULL,
    total_days integer DEFAULT 0 NOT NULL,
    used_days integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    leave_type_id uuid NOT NULL,
    from_date date NOT NULL,
    to_date date NOT NULL,
    total_days integer NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    reason text,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT leave_requests_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Rejected'::text, 'Cancelled'::text])))
);


--
-- Name: leave_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    default_days_per_year integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: logistics_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logistics_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    courier public.courier_provider NOT NULL,
    tracking_id text,
    parcel_code text,
    courier_order_id text,
    delivery_status public.logistics_delivery_status DEFAULT 'PENDING_PICKUP'::public.logistics_delivery_status NOT NULL,
    courier_status text,
    status_updated_at timestamp with time zone,
    pickup_date timestamp with time zone,
    estimated_delivery timestamp with time zone,
    actual_delivery timestamp with time zone,
    cod_amount numeric,
    cod_collected boolean DEFAULT false,
    cod_settled boolean DEFAULT false,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    full_address text NOT NULL,
    product_name text,
    quantity integer DEFAULT 1,
    weight_grams integer DEFAULT 500,
    api_response jsonb,
    last_webhook_data jsonb,
    last_error text,
    retry_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: logistics_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logistics_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    courier public.courier_provider NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    api_base_url text,
    api_token text,
    default_pickup_address text,
    default_sender_name text,
    default_sender_phone text,
    partner_id text,
    account_type text,
    client_id text,
    client_password text,
    secret_key text,
    store_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pickup_city text,
    pickup_branch text
);


--
-- Name: marketing_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_targets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    total_leads_target integer DEFAULT 0,
    confirmed_orders_target integer DEFAULT 0,
    min_avg_order numeric DEFAULT 0,
    max_avg_order numeric DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: message_automation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_automation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_name text NOT NULL,
    trigger_status_from text,
    trigger_status_to text,
    channel_id uuid NOT NULL,
    template_id uuid NOT NULL,
    send_to public.message_recipient_type DEFAULT 'CUSTOMER'::public.message_recipient_type NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: message_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type public.message_channel_type NOT NULL,
    provider public.message_provider DEFAULT 'OTHER'::public.message_provider NOT NULL,
    api_base_url text,
    api_key text,
    api_secret text,
    sender_id text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: message_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id uuid,
    template_id uuid,
    channel_id uuid NOT NULL,
    recipient_phone text NOT NULL,
    payload_preview text NOT NULL,
    status public.message_status DEFAULT 'PENDING'::public.message_status NOT NULL,
    provider_message_id text,
    error_message text,
    related_lead_id uuid,
    related_order_id uuid,
    related_reseller_order_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    channel_type public.message_channel_type NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    content text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    message text,
    target_audience text DEFAULT 'All'::text,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    actor_id uuid,
    actor_name text,
    target_role text,
    target_user_id uuid,
    portal text,
    link_path text,
    read_at timestamp with time zone,
    meta jsonb DEFAULT '{}'::jsonb
);


--
-- Name: office_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.office_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    category text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: office_holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.office_holidays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    title text NOT NULL,
    description text,
    holiday_type text DEFAULT 'Company'::text NOT NULL,
    is_office_closed boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT office_holidays_holiday_type_check CHECK ((holiday_type = ANY (ARRAY['Public'::text, 'Company'::text, 'Event'::text])))
);


--
-- Name: order_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid NOT NULL,
    comment text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_courier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_courier (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    courier_id uuid NOT NULL,
    courier_name text NOT NULL,
    awb_number text,
    tracking_code text,
    status text DEFAULT 'SENT'::text,
    sent_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    event_type text NOT NULL,
    event_by uuid,
    event_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    changed_by uuid,
    event_type text NOT NULL,
    old_value text,
    new_value text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_name text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric NOT NULL,
    total_price numeric NOT NULL,
    variant_details jsonb,
    created_at timestamp with time zone DEFAULT now(),
    discount numeric DEFAULT 0
);


--
-- Name: order_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_number_seq
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    previous_status text,
    new_status text NOT NULL,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_date timestamp with time zone DEFAULT now(),
    lead_id uuid,
    product_id uuid,
    quantity integer DEFAULT 1,
    amount numeric(10,2),
    destination_branch text,
    full_address text,
    order_status public.order_status DEFAULT 'CONFIRMED'::public.order_status,
    payment_status public.payment_status DEFAULT 'COD'::public.payment_status,
    sales_person_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    delivery_location text,
    is_cod boolean DEFAULT true,
    sent_to_logistics boolean DEFAULT false,
    shipping_partner text,
    partner_order_id text,
    partner_status text,
    delivery_notes text,
    branch_id uuid,
    redirected_by_user_id uuid,
    redirected_at timestamp with time zone,
    inside_delivery_status text DEFAULT 'PENDING'::text,
    inside_delivery_remark text,
    inside_delivery_updated_by uuid,
    inside_delivery_updated_at timestamp with time zone,
    logistics_courier text,
    logistics_tracking_id text,
    logistics_parcel_code text,
    logistics_status text,
    logistics_sent_at timestamp with time zone,
    courier_provider text,
    courier_tracking_code text,
    courier_submitted_at timestamp with time zone,
    courier_submitted_by uuid,
    customer_id uuid,
    order_number integer DEFAULT nextval('public.order_number_seq'::regclass),
    store_id uuid,
    customer_email text,
    delivery_charge numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    order_notes text,
    ai_rto_risk_score integer,
    ai_rto_risk_label text,
    ai_notes text,
    ai_last_evaluated_at timestamp with time zone,
    is_counted_in_sales boolean DEFAULT false,
    confirmed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    is_duplicate boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    created_by_staff_id uuid,
    confirmed_by_user_id uuid,
    logistic_tracking_status text,
    logistic_tracking_substatus text,
    logistic_tracking_last_update timestamp with time zone,
    logistic_raw_response jsonb,
    cod_status text DEFAULT 'Pending'::text,
    called_by_user_id uuid,
    called_by_role text,
    assigned_to_user_id uuid,
    CONSTRAINT orders_ai_rto_risk_label_valid CHECK (((ai_rto_risk_label IS NULL) OR (ai_rto_risk_label = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text])))),
    CONSTRAINT orders_ai_rto_risk_score_range CHECK (((ai_rto_risk_score IS NULL) OR ((ai_rto_risk_score >= 0) AND (ai_rto_risk_score <= 100)))),
    CONSTRAINT orders_delivery_location_check CHECK ((delivery_location = ANY (ARRAY['INSIDE_VALLEY'::text, 'OUTSIDE_VALLEY'::text])))
);


--
-- Name: parties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    party_type text NOT NULL,
    phone text,
    email text,
    address text,
    opening_balance numeric DEFAULT 0,
    opening_balance_type text,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT parties_opening_balance_type_check CHECK ((opening_balance_type = ANY (ARRAY['RECEIVABLE'::text, 'PAYABLE'::text]))),
    CONSTRAINT parties_party_type_check CHECK ((party_type = ANY (ARRAY['SUPPLIER'::text, 'WHOLESALER'::text, 'BOTH'::text])))
);


--
-- Name: party_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.party_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    party_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    description text NOT NULL,
    debit numeric DEFAULT 0,
    credit numeric DEFAULT 0,
    balance numeric DEFAULT 0,
    transaction_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: party_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.party_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    party_id uuid NOT NULL,
    date date NOT NULL,
    amount numeric NOT NULL,
    payment_type text NOT NULL,
    method text NOT NULL,
    bank_account_id uuid,
    reference text,
    note text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT party_payments_method_check CHECK ((method = ANY (ARRAY['CASH'::text, 'BANK'::text, 'OTHER'::text]))),
    CONSTRAINT party_payments_payment_type_check CHECK ((payment_type = ANY (ARRAY['RECEIVED'::text, 'PAID'::text])))
);


--
-- Name: party_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.party_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    party_id uuid NOT NULL,
    date date NOT NULL,
    product_id uuid,
    warehouse_id uuid,
    qty numeric,
    rate numeric,
    amount numeric NOT NULL,
    direction text NOT NULL,
    source text NOT NULL,
    reference text,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT party_transactions_direction_check CHECK ((direction = ANY (ARRAY['RECEIVABLE'::text, 'PAYABLE'::text]))),
    CONSTRAINT party_transactions_source_check CHECK ((source = ANY (ARRAY['STOCK_IN'::text, 'WHOLESALE_OUT'::text, 'ADJUSTMENT'::text])))
);


--
-- Name: payroll_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    month date NOT NULL,
    basic_salary numeric DEFAULT 0 NOT NULL,
    allowances numeric DEFAULT 0,
    deductions numeric DEFAULT 0,
    net_salary numeric GENERATED ALWAYS AS (((basic_salary + COALESCE(allowances, (0)::numeric)) - COALESCE(deductions, (0)::numeric))) STORED,
    payment_status text DEFAULT 'Pending'::text NOT NULL,
    paid_on date,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payroll_records_payment_status_check CHECK ((payment_status = ANY (ARRAY['Pending'::text, 'Paid'::text])))
);


--
-- Name: plugins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plugins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    plugin_type text NOT NULL,
    plugin_name text NOT NULL,
    is_active boolean DEFAULT false,
    config jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    product_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    opening_stock numeric DEFAULT 0 NOT NULL,
    current_stock numeric DEFAULT 0 NOT NULL,
    reorder_level numeric DEFAULT 0 NOT NULL,
    reorder_required boolean DEFAULT false NOT NULL,
    drawer_number text
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    target_per_day integer,
    cost_price numeric(10,2),
    sell_price numeric(10,2),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    delivery_cost numeric DEFAULT 0,
    wholesale_price numeric DEFAULT 0,
    store_id uuid,
    category_id uuid,
    slug text,
    is_featured boolean DEFAULT false,
    images text[] DEFAULT '{}'::text[],
    description text
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    role public.app_role DEFAULT 'CALLING'::public.app_role NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    daily_target integer DEFAULT 100,
    email_verified boolean DEFAULT false,
    email_verified_at timestamp with time zone,
    auth_user_id uuid
);


--
-- Name: rbac_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rbac_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    changed_by uuid,
    affected_user_id uuid,
    affected_role_id uuid,
    action_type text NOT NULL,
    change_summary text,
    old_value jsonb,
    new_value jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    product_id uuid NOT NULL,
    customer_id uuid,
    order_id uuid,
    rating integer NOT NULL,
    title text,
    comment text,
    is_verified boolean DEFAULT false,
    is_approved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    module_id uuid NOT NULL,
    can_view boolean DEFAULT false,
    can_create boolean DEFAULT false,
    can_edit boolean DEFAULT false,
    can_delete boolean DEFAULT false,
    can_export boolean DEFAULT false,
    can_manage_settings boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: routing_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    priority integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    delivery_location text,
    districts text[],
    min_weight_grams integer,
    max_weight_grams integer,
    is_cod boolean,
    recommended_courier public.courier_provider NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sales_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    qty integer DEFAULT 1 NOT NULL,
    amount numeric NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    type text NOT NULL,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sales_records_type_check CHECK ((type = ANY (ARRAY['invoice'::text, 'reversal'::text])))
);


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: social_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    platform public.social_platform NOT NULL,
    display_name text NOT NULL,
    handle text,
    access_token text,
    refresh_token text,
    expires_at timestamp with time zone,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    last_synced_at timestamp with time zone
);


--
-- Name: social_post_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_post_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    platform public.social_platform NOT NULL,
    scheduled_at timestamp with time zone,
    status public.channel_post_status DEFAULT 'PENDING'::public.channel_post_status,
    external_post_id text,
    error_message text,
    likes integer DEFAULT 0,
    comments integer DEFAULT 0,
    shares integer DEFAULT 0,
    views integer DEFAULT 0,
    saves integer DEFAULT 0,
    clicks integer DEFAULT 0,
    metrics_fetched_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: social_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    campaign_id uuid,
    video_project_id uuid,
    platform text DEFAULT 'TikTok'::text NOT NULL,
    post_type text DEFAULT 'Reel'::text,
    title text,
    product text,
    scheduled_date date,
    scheduled_time time without time zone,
    status text DEFAULT 'Idea'::text,
    caption text,
    hashtags text,
    post_link text,
    thumbnail_link text,
    owner text
);


--
-- Name: staff_daily_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_daily_summary (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    staff_id uuid NOT NULL,
    role text,
    total_leads integer DEFAULT 0,
    transferred_leads integer DEFAULT 0,
    called_leads integer DEFAULT 0,
    confirmed_orders integer DEFAULT 0,
    not_interested integer DEFAULT 0,
    followups integer DEFAULT 0,
    total_order_amount numeric DEFAULT 0,
    performance_percent numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: staff_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_targets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    daily_target_leads integer,
    daily_target_orders integer,
    daily_target_followups integer,
    active_from date DEFAULT CURRENT_DATE NOT NULL,
    active_to date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    product_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    movement_date date DEFAULT CURRENT_DATE NOT NULL,
    movement_type public.stock_movement_type NOT NULL,
    source text,
    reference_type text,
    reference_id text,
    qty numeric NOT NULL,
    unit_cost numeric DEFAULT 0,
    unit_price numeric DEFAULT 0,
    total_cost numeric GENERATED ALWAYS AS ((qty * unit_cost)) STORED,
    total_value numeric GENERATED ALWAYS AS ((qty * unit_price)) STORED,
    remark text,
    movement_reason text,
    is_sale boolean DEFAULT false,
    sale_category text,
    party_id uuid,
    movement_source text,
    CONSTRAINT stock_movements_movement_source_check CHECK ((movement_source = ANY (ARRAY['SUPPLIER'::text, 'WHOLESALE'::text, 'OTHER'::text]))),
    CONSTRAINT stock_movements_qty_check CHECK ((qty >= (0)::numeric))
);


--
-- Name: store_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    domain text NOT NULL,
    is_primary boolean DEFAULT false,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: store_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    content text,
    meta_title text,
    meta_description text,
    is_published boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    default_subdomain text,
    logo_url text,
    primary_color text DEFAULT '#008060'::text,
    contact_email text,
    contact_phone text,
    address text,
    is_active boolean DEFAULT true,
    timezone text DEFAULT 'Asia/Kathmandu'::text,
    currency text DEFAULT 'NPR'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_branding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_branding (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    logo_url text,
    brand_name text DEFAULT 'Vakari Sales Engine'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    default_theme text DEFAULT 'light'::text NOT NULL,
    favicon_url text,
    primary_color text DEFAULT '221.2 83.2% 53.3%'::text,
    custom_css text
);


--
-- Name: system_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    description text,
    category text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_key text NOT NULL,
    display_name text NOT NULL,
    description text,
    is_system_role boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: training_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    user_id uuid NOT NULL,
    certificate_code text NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    pdf_url text
);


--
-- Name: training_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    category text NOT NULL,
    level public.course_level DEFAULT 'BASIC'::public.course_level NOT NULL,
    description text,
    estimated_minutes integer DEFAULT 30,
    is_active boolean DEFAULT true NOT NULL,
    is_mandatory boolean DEFAULT false NOT NULL,
    target_roles text[] DEFAULT '{}'::text[],
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: training_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status public.enrollment_status DEFAULT 'NOT_STARTED'::public.enrollment_status NOT NULL,
    progress_percent integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: training_lesson_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_lesson_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    user_id uuid NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: training_lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    content_markdown text,
    video_url text,
    attachment_url text,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: training_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid NOT NULL,
    question_text text NOT NULL,
    type public.question_type DEFAULT 'MCQ'::public.question_type NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    correct_option_index integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: training_quiz_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_quiz_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid NOT NULL,
    user_id uuid NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    passed boolean DEFAULT false NOT NULL,
    answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: training_quizzes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_quizzes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    total_marks integer DEFAULT 100 NOT NULL,
    pass_marks integer DEFAULT 60 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transaction_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transaction_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    nature text NOT NULL,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT transaction_categories_nature_check CHECK ((nature = ANY (ARRAY['income'::text, 'expense'::text])))
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    type text NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'NPR'::text,
    from_account_id uuid,
    to_account_id uuid,
    account_id uuid,
    category_id uuid,
    party_id uuid,
    order_id uuid,
    reference_no text,
    note text,
    is_cleared boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    description text,
    CONSTRAINT transactions_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text, 'transfer'::text, 'invoice_receipt'::text, 'bill_payment'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);


--
-- Name: user_view_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_view_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    section text NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: video_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title text NOT NULL,
    project_type text DEFAULT 'Ad'::text,
    main_product text,
    campaign_id uuid,
    platforms text,
    status text DEFAULT 'Idea'::text,
    script_ready boolean DEFAULT false,
    shoot_date date,
    edit_deadline date,
    publish_date date,
    assigned_team text,
    editor_name text,
    script_link text,
    raw_footage_link text,
    final_video_link text,
    reference_link text,
    notes text
);


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    location text,
    is_active boolean DEFAULT true NOT NULL,
    remarks text
);


--
-- Name: accounting_banks accounting_banks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_banks
    ADD CONSTRAINT accounting_banks_pkey PRIMARY KEY (id);


--
-- Name: accounting_bills accounting_bills_bill_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_bills
    ADD CONSTRAINT accounting_bills_bill_number_key UNIQUE (bill_number);


--
-- Name: accounting_bills accounting_bills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_bills
    ADD CONSTRAINT accounting_bills_pkey PRIMARY KEY (id);


--
-- Name: accounting_cash_ledger accounting_cash_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_cash_ledger
    ADD CONSTRAINT accounting_cash_ledger_pkey PRIMARY KEY (id);


--
-- Name: accounting_expense_categories accounting_expense_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_expense_categories
    ADD CONSTRAINT accounting_expense_categories_name_key UNIQUE (name);


--
-- Name: accounting_expense_categories accounting_expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_expense_categories
    ADD CONSTRAINT accounting_expense_categories_pkey PRIMARY KEY (id);


--
-- Name: accounting_invoice_items accounting_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_invoice_items
    ADD CONSTRAINT accounting_invoice_items_pkey PRIMARY KEY (id);


--
-- Name: accounting_invoices accounting_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_invoices
    ADD CONSTRAINT accounting_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: accounting_invoices accounting_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_invoices
    ADD CONSTRAINT accounting_invoices_pkey PRIMARY KEY (id);


--
-- Name: accounting_payments accounting_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_payments
    ADD CONSTRAINT accounting_payments_pkey PRIMARY KEY (id);


--
-- Name: accounting_suppliers accounting_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_suppliers
    ADD CONSTRAINT accounting_suppliers_pkey PRIMARY KEY (id);


--
-- Name: accounting_transaction_lines accounting_transaction_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_transaction_lines
    ADD CONSTRAINT accounting_transaction_lines_pkey PRIMARY KEY (id);


--
-- Name: accounting_transactions accounting_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_transactions
    ADD CONSTRAINT accounting_transactions_pkey PRIMARY KEY (id);


--
-- Name: accounting_wholesalers accounting_wholesalers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_wholesalers
    ADD CONSTRAINT accounting_wholesalers_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: ads ads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ads
    ADD CONSTRAINT ads_pkey PRIMARY KEY (id);


--
-- Name: ads_spend ads_spend_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ads_spend
    ADD CONSTRAINT ads_spend_pkey PRIMARY KEY (id);


--
-- Name: asset_assignments asset_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_assignments
    ADD CONSTRAINT asset_assignments_pkey PRIMARY KEY (id);


--
-- Name: assets assets_asset_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_asset_code_key UNIQUE (asset_code);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_employee_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_date_key UNIQUE (employee_id, date);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: audit_entry_toggles audit_entry_toggles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_entry_toggles
    ADD CONSTRAINT audit_entry_toggles_pkey PRIMARY KEY (id);


--
-- Name: audit_entry_toggles audit_entry_toggles_source_table_source_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_entry_toggles
    ADD CONSTRAINT audit_entry_toggles_source_table_source_id_key UNIQUE (source_table, source_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_manual_entries audit_manual_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_manual_entries
    ADD CONSTRAINT audit_manual_entries_pkey PRIMARY KEY (id);


--
-- Name: audit_snapshots audit_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_snapshots
    ADD CONSTRAINT audit_snapshots_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: branding branding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding
    ADD CONSTRAINT branding_pkey PRIMARY KEY (id);


--
-- Name: branding branding_store_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding
    ADD CONSTRAINT branding_store_id_key UNIQUE (store_id);


--
-- Name: call_logs call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_store_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_store_id_slug_key UNIQUE (store_id, slug);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_room_members chat_room_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_room_members
    ADD CONSTRAINT chat_room_members_pkey PRIMARY KEY (id);


--
-- Name: chat_room_members chat_room_members_room_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_room_members
    ADD CONSTRAINT chat_room_members_room_id_user_id_key UNIQUE (room_id, user_id);


--
-- Name: chat_rooms chat_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_pkey PRIMARY KEY (id);


--
-- Name: cod_settlements cod_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cod_settlements
    ADD CONSTRAINT cod_settlements_pkey PRIMARY KEY (id);


--
-- Name: company_info company_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_info
    ADD CONSTRAINT company_info_pkey PRIMARY KEY (id);


--
-- Name: courier_stats courier_stats_courier_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_stats
    ADD CONSTRAINT courier_stats_courier_date_key UNIQUE (courier, date);


--
-- Name: courier_stats courier_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_stats
    ADD CONSTRAINT courier_stats_pkey PRIMARY KEY (id);


--
-- Name: courier_updates courier_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_updates
    ADD CONSTRAINT courier_updates_pkey PRIMARY KEY (id);


--
-- Name: couriers couriers_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couriers
    ADD CONSTRAINT couriers_name_key UNIQUE (name);


--
-- Name: couriers couriers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couriers
    ADD CONSTRAINT couriers_pkey PRIMARY KEY (id);


--
-- Name: customer_activity_log customer_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_activity_log
    ADD CONSTRAINT customer_activity_log_pkey PRIMARY KEY (id);


--
-- Name: customer_notes customer_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_pkey PRIMARY KEY (id);


--
-- Name: customers customers_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_phone_number_key UNIQUE (phone_number);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: daily_pl daily_pl_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_pl
    ADD CONSTRAINT daily_pl_date_key UNIQUE (date);


--
-- Name: daily_pl daily_pl_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_pl
    ADD CONSTRAINT daily_pl_pkey PRIMARY KEY (id);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: email_verifications email_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT email_verifications_pkey PRIMARY KEY (id);


--
-- Name: email_verifications email_verifications_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT email_verifications_user_id_key UNIQUE (user_id);


--
-- Name: employee_documents employee_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: failed_login_attempts failed_login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_login_attempts
    ADD CONSTRAINT failed_login_attempts_pkey PRIMARY KEY (id);


--
-- Name: followup_logs followup_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.followup_logs
    ADD CONSTRAINT followup_logs_pkey PRIMARY KEY (id);


--
-- Name: hr_bank_accounts hr_bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_bank_accounts
    ADD CONSTRAINT hr_bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: hr_policies hr_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_policies
    ADD CONSTRAINT hr_policies_pkey PRIMARY KEY (id);


--
-- Name: hr_settings hr_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_settings
    ADD CONSTRAINT hr_settings_pkey PRIMARY KEY (id);


--
-- Name: influencers influencers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.influencers
    ADD CONSTRAINT influencers_pkey PRIMARY KEY (id);


--
-- Name: lead_history lead_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_history
    ADD CONSTRAINT lead_history_pkey PRIMARY KEY (id);


--
-- Name: lead_sources lead_sources_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_sources
    ADD CONSTRAINT lead_sources_name_key UNIQUE (name);


--
-- Name: lead_sources lead_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_sources
    ADD CONSTRAINT lead_sources_pkey PRIMARY KEY (id);


--
-- Name: lead_transfers lead_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_transfers
    ADD CONSTRAINT lead_transfers_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: leave_quota leave_quota_employee_id_leave_type_id_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_quota
    ADD CONSTRAINT leave_quota_employee_id_leave_type_id_year_key UNIQUE (employee_id, leave_type_id, year);


--
-- Name: leave_quota leave_quota_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_quota
    ADD CONSTRAINT leave_quota_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: leave_types leave_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_name_key UNIQUE (name);


--
-- Name: leave_types leave_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_pkey PRIMARY KEY (id);


--
-- Name: logistics_orders logistics_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logistics_orders
    ADD CONSTRAINT logistics_orders_pkey PRIMARY KEY (id);


--
-- Name: logistics_settings logistics_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logistics_settings
    ADD CONSTRAINT logistics_settings_pkey PRIMARY KEY (id);


--
-- Name: marketing_targets marketing_targets_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_targets
    ADD CONSTRAINT marketing_targets_date_key UNIQUE (date);


--
-- Name: marketing_targets marketing_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_targets
    ADD CONSTRAINT marketing_targets_pkey PRIMARY KEY (id);


--
-- Name: message_automation_rules message_automation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_automation_rules
    ADD CONSTRAINT message_automation_rules_pkey PRIMARY KEY (id);


--
-- Name: message_channels message_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_channels
    ADD CONSTRAINT message_channels_pkey PRIMARY KEY (id);


--
-- Name: message_logs message_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_pkey PRIMARY KEY (id);


--
-- Name: message_templates message_templates_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_code_key UNIQUE (code);


--
-- Name: message_templates message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_pkey PRIMARY KEY (id);


--
-- Name: notices notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: office_expenses office_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.office_expenses
    ADD CONSTRAINT office_expenses_pkey PRIMARY KEY (id);


--
-- Name: office_holidays office_holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.office_holidays
    ADD CONSTRAINT office_holidays_pkey PRIMARY KEY (id);


--
-- Name: order_comments order_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_comments
    ADD CONSTRAINT order_comments_pkey PRIMARY KEY (id);


--
-- Name: order_courier order_courier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_courier
    ADD CONSTRAINT order_courier_pkey PRIMARY KEY (id);


--
-- Name: order_events order_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_events
    ADD CONSTRAINT order_events_pkey PRIMARY KEY (id);


--
-- Name: order_history order_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_history
    ADD CONSTRAINT order_history_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: parties parties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT parties_pkey PRIMARY KEY (id);


--
-- Name: party_ledger party_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_ledger
    ADD CONSTRAINT party_ledger_pkey PRIMARY KEY (id);


--
-- Name: party_payments party_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_payments
    ADD CONSTRAINT party_payments_pkey PRIMARY KEY (id);


--
-- Name: party_transactions party_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_transactions
    ADD CONSTRAINT party_transactions_pkey PRIMARY KEY (id);


--
-- Name: payroll_records payroll_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_pkey PRIMARY KEY (id);


--
-- Name: plugins plugins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plugins
    ADD CONSTRAINT plugins_pkey PRIMARY KEY (id);


--
-- Name: plugins plugins_store_id_plugin_type_plugin_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plugins
    ADD CONSTRAINT plugins_store_id_plugin_type_plugin_name_key UNIQUE (store_id, plugin_type, plugin_name);


--
-- Name: product_inventory product_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_inventory
    ADD CONSTRAINT product_inventory_pkey PRIMARY KEY (id);


--
-- Name: product_inventory product_inventory_product_id_warehouse_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_inventory
    ADD CONSTRAINT product_inventory_product_id_warehouse_id_key UNIQUE (product_id, warehouse_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: rbac_audit_logs rbac_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_audit_logs
    ADD CONSTRAINT rbac_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_module_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_module_id_key UNIQUE (role_id, module_id);


--
-- Name: routing_rules routing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routing_rules
    ADD CONSTRAINT routing_rules_pkey PRIMARY KEY (id);


--
-- Name: sales_records sales_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_records
    ADD CONSTRAINT sales_records_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: social_channels social_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_channels
    ADD CONSTRAINT social_channels_pkey PRIMARY KEY (id);


--
-- Name: social_post_channels social_post_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_post_channels
    ADD CONSTRAINT social_post_channels_pkey PRIMARY KEY (id);


--
-- Name: social_posts social_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_pkey PRIMARY KEY (id);


--
-- Name: staff_daily_summary staff_daily_summary_date_staff_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_daily_summary
    ADD CONSTRAINT staff_daily_summary_date_staff_id_key UNIQUE (date, staff_id);


--
-- Name: staff_daily_summary staff_daily_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_daily_summary
    ADD CONSTRAINT staff_daily_summary_pkey PRIMARY KEY (id);


--
-- Name: staff_targets staff_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_targets
    ADD CONSTRAINT staff_targets_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: store_domains store_domains_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_domains
    ADD CONSTRAINT store_domains_domain_key UNIQUE (domain);


--
-- Name: store_domains store_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_domains
    ADD CONSTRAINT store_domains_pkey PRIMARY KEY (id);


--
-- Name: store_pages store_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_pages
    ADD CONSTRAINT store_pages_pkey PRIMARY KEY (id);


--
-- Name: store_pages store_pages_store_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_pages
    ADD CONSTRAINT store_pages_store_id_slug_key UNIQUE (store_id, slug);


--
-- Name: stores stores_default_subdomain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_default_subdomain_key UNIQUE (default_subdomain);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: stores stores_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_slug_key UNIQUE (slug);


--
-- Name: system_branding system_branding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_branding
    ADD CONSTRAINT system_branding_pkey PRIMARY KEY (id);


--
-- Name: system_modules system_modules_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_modules
    ADD CONSTRAINT system_modules_name_key UNIQUE (name);


--
-- Name: system_modules system_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_modules
    ADD CONSTRAINT system_modules_pkey PRIMARY KEY (id);


--
-- Name: system_roles system_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_roles
    ADD CONSTRAINT system_roles_pkey PRIMARY KEY (id);


--
-- Name: system_roles system_roles_role_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_roles
    ADD CONSTRAINT system_roles_role_key_key UNIQUE (role_key);


--
-- Name: training_certificates training_certificates_certificate_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_certificates
    ADD CONSTRAINT training_certificates_certificate_code_key UNIQUE (certificate_code);


--
-- Name: training_certificates training_certificates_course_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_certificates
    ADD CONSTRAINT training_certificates_course_id_user_id_key UNIQUE (course_id, user_id);


--
-- Name: training_certificates training_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_certificates
    ADD CONSTRAINT training_certificates_pkey PRIMARY KEY (id);


--
-- Name: training_courses training_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_courses
    ADD CONSTRAINT training_courses_pkey PRIMARY KEY (id);


--
-- Name: training_courses training_courses_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_courses
    ADD CONSTRAINT training_courses_slug_key UNIQUE (slug);


--
-- Name: training_enrollments training_enrollments_course_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_enrollments
    ADD CONSTRAINT training_enrollments_course_id_user_id_key UNIQUE (course_id, user_id);


--
-- Name: training_enrollments training_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_enrollments
    ADD CONSTRAINT training_enrollments_pkey PRIMARY KEY (id);


--
-- Name: training_lesson_completions training_lesson_completions_lesson_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_lesson_completions
    ADD CONSTRAINT training_lesson_completions_lesson_id_user_id_key UNIQUE (lesson_id, user_id);


--
-- Name: training_lesson_completions training_lesson_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_lesson_completions
    ADD CONSTRAINT training_lesson_completions_pkey PRIMARY KEY (id);


--
-- Name: training_lessons training_lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_lessons
    ADD CONSTRAINT training_lessons_pkey PRIMARY KEY (id);


--
-- Name: training_questions training_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_questions
    ADD CONSTRAINT training_questions_pkey PRIMARY KEY (id);


--
-- Name: training_quiz_attempts training_quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_quiz_attempts
    ADD CONSTRAINT training_quiz_attempts_pkey PRIMARY KEY (id);


--
-- Name: training_quizzes training_quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_quizzes
    ADD CONSTRAINT training_quizzes_pkey PRIMARY KEY (id);


--
-- Name: transaction_categories transaction_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_categories
    ADD CONSTRAINT transaction_categories_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: logistics_settings unique_courier; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logistics_settings
    ADD CONSTRAINT unique_courier UNIQUE (courier);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_roles user_roles_user_id_role_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role);


--
-- Name: user_view_state user_view_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_view_state
    ADD CONSTRAINT user_view_state_pkey PRIMARY KEY (id);


--
-- Name: user_view_state user_view_state_user_id_section_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_view_state
    ADD CONSTRAINT user_view_state_user_id_section_key UNIQUE (user_id, section);


--
-- Name: video_projects video_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_projects
    ADD CONSTRAINT video_projects_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_code_key UNIQUE (code);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: idx_ads_spend_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ads_spend_date ON public.ads_spend USING btree (date);


--
-- Name: idx_ads_spend_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ads_spend_platform ON public.ads_spend USING btree (platform);


--
-- Name: idx_ads_spend_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ads_spend_product_id ON public.ads_spend USING btree (product_id);


--
-- Name: idx_bills_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_date ON public.accounting_bills USING btree (bill_date);


--
-- Name: idx_bills_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_status ON public.accounting_bills USING btree (status);


--
-- Name: idx_bills_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bills_supplier ON public.accounting_bills USING btree (supplier_id);


--
-- Name: idx_cash_ledger_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_ledger_date ON public.accounting_cash_ledger USING btree (transaction_date);


--
-- Name: idx_categories_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_store_id ON public.categories USING btree (store_id);


--
-- Name: idx_cod_settlements_courier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cod_settlements_courier ON public.cod_settlements USING btree (courier);


--
-- Name: idx_cod_settlements_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cod_settlements_status ON public.cod_settlements USING btree (status);


--
-- Name: idx_courier_stats_courier_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_stats_courier_date ON public.courier_stats USING btree (courier, date DESC);


--
-- Name: idx_courier_updates_courier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_updates_courier ON public.courier_updates USING btree (courier);


--
-- Name: idx_courier_updates_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_updates_created_at ON public.courier_updates USING btree (created_at DESC);


--
-- Name: idx_courier_updates_logistics_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_updates_logistics_order_id ON public.courier_updates USING btree (logistics_order_id);


--
-- Name: idx_courier_updates_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_updates_order_id ON public.courier_updates USING btree (order_id);


--
-- Name: idx_customer_activity_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_activity_customer_id ON public.customer_activity_log USING btree (customer_id);


--
-- Name: idx_customer_notes_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_notes_customer_id ON public.customer_notes USING btree (customer_id);


--
-- Name: idx_customers_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_phone ON public.customers USING btree (phone_number);


--
-- Name: idx_customers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_status ON public.customers USING btree (status);


--
-- Name: idx_customers_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_store_id ON public.customers USING btree (store_id);


--
-- Name: idx_email_verifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_verifications_user_id ON public.email_verifications USING btree (user_id);


--
-- Name: idx_employee_documents_doc_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_documents_doc_type ON public.employee_documents USING btree (doc_type);


--
-- Name: idx_employee_documents_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_documents_employee_id ON public.employee_documents USING btree (employee_id);


--
-- Name: idx_employee_documents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_documents_status ON public.employee_documents USING btree (status);


--
-- Name: idx_followup_logs_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_followup_logs_lead_id ON public.followup_logs USING btree (lead_id);


--
-- Name: idx_invoices_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_date ON public.accounting_invoices USING btree (invoice_date);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_status ON public.accounting_invoices USING btree (status);


--
-- Name: idx_invoices_wholesaler; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_wholesaler ON public.accounting_invoices USING btree (wholesaler_id);


--
-- Name: idx_lead_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_history_created_at ON public.lead_history USING btree (created_at DESC);


--
-- Name: idx_lead_history_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_history_lead_id ON public.lead_history USING btree (lead_id);


--
-- Name: idx_leads_alt_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_alt_phone ON public.leads USING btree (alt_phone);


--
-- Name: idx_leads_confirmed_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_confirmed_by_user_id ON public.leads USING btree (confirmed_by_user_id);


--
-- Name: idx_leads_created_by_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_created_by_staff_id ON public.leads USING btree (created_by_staff_id);


--
-- Name: idx_leads_followup_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_followup_at ON public.leads USING btree (next_followup_at) WHERE (next_followup_at IS NOT NULL);


--
-- Name: idx_leads_followup_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_followup_status ON public.leads USING btree (status, next_followup_at, followup_completed) WHERE (status = 'FOLLOW_UP'::public.lead_status);


--
-- Name: idx_leads_is_transferred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_is_transferred ON public.leads USING btree (is_transferred) WHERE (is_transferred = false);


--
-- Name: idx_leads_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_source_id ON public.leads USING btree (source_id);


--
-- Name: idx_logistics_orders_courier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logistics_orders_courier ON public.logistics_orders USING btree (courier);


--
-- Name: idx_logistics_orders_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logistics_orders_order_id ON public.logistics_orders USING btree (order_id);


--
-- Name: idx_logistics_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logistics_orders_status ON public.logistics_orders USING btree (delivery_status);


--
-- Name: idx_logistics_orders_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logistics_orders_tracking ON public.logistics_orders USING btree (tracking_id);


--
-- Name: idx_message_automation_rules_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_automation_rules_event ON public.message_automation_rules USING btree (event_name);


--
-- Name: idx_message_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_logs_created_at ON public.message_logs USING btree (created_at DESC);


--
-- Name: idx_message_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_logs_status ON public.message_logs USING btree (status);


--
-- Name: idx_message_templates_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_templates_code ON public.message_templates USING btree (code);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_meta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_meta ON public.notifications USING gin (meta);


--
-- Name: idx_notifications_read_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read_at ON public.notifications USING btree (read_at);


--
-- Name: idx_notifications_target_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_target_role ON public.notifications USING btree (target_role);


--
-- Name: idx_notifications_target_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_target_user_id ON public.notifications USING btree (target_user_id);


--
-- Name: idx_order_comments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_comments_created_at ON public.order_comments USING btree (created_at DESC);


--
-- Name: idx_order_comments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_comments_order_id ON public.order_comments USING btree (order_id);


--
-- Name: idx_order_courier_courier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_courier_courier_id ON public.order_courier USING btree (courier_id);


--
-- Name: idx_order_courier_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_courier_order_id ON public.order_courier USING btree (order_id);


--
-- Name: idx_order_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_events_event_type ON public.order_events USING btree (event_type);


--
-- Name: idx_order_events_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_events_order_id ON public.order_events USING btree (order_id);


--
-- Name: idx_order_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_history_created_at ON public.order_history USING btree (created_at DESC);


--
-- Name: idx_order_history_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_history_order_id ON public.order_history USING btree (order_id);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_order_status_history_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history USING btree (order_id);


--
-- Name: idx_orders_assigned_to_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_assigned_to_user_id ON public.orders USING btree (assigned_to_user_id);


--
-- Name: idx_orders_called_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_called_by_user_id ON public.orders USING btree (called_by_user_id);


--
-- Name: idx_orders_confirmed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_confirmed_at ON public.orders USING btree (confirmed_at);


--
-- Name: idx_orders_confirmed_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_confirmed_by_user_id ON public.orders USING btree (confirmed_by_user_id);


--
-- Name: idx_orders_created_by_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_by_staff_id ON public.orders USING btree (created_by_staff_id);


--
-- Name: idx_orders_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer_id ON public.orders USING btree (customer_id);


--
-- Name: idx_orders_delivery_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_delivery_location ON public.orders USING btree (delivery_location);


--
-- Name: idx_orders_inside_delivery_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_inside_delivery_status ON public.orders USING btree (inside_delivery_status) WHERE (delivery_location = 'INSIDE_VALLEY'::text);


--
-- Name: idx_orders_is_counted_in_sales; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_is_counted_in_sales ON public.orders USING btree (is_counted_in_sales);


--
-- Name: idx_orders_is_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_is_deleted ON public.orders USING btree (is_deleted) WHERE (is_deleted = false);


--
-- Name: idx_orders_sent_to_logistics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_sent_to_logistics ON public.orders USING btree (sent_to_logistics);


--
-- Name: idx_orders_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_store_id ON public.orders USING btree (store_id);


--
-- Name: idx_orders_unique_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_orders_unique_lead_id ON public.orders USING btree (lead_id) WHERE ((lead_id IS NOT NULL) AND (is_duplicate = false));


--
-- Name: idx_parties_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parties_type ON public.parties USING btree (party_type);


--
-- Name: idx_party_ledger_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_party_ledger_date ON public.party_ledger USING btree (date);


--
-- Name: idx_party_ledger_party; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_party_ledger_party ON public.party_ledger USING btree (party_id);


--
-- Name: idx_party_payments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_party_payments_date ON public.party_payments USING btree (date);


--
-- Name: idx_party_payments_party; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_party_payments_party ON public.party_payments USING btree (party_id);


--
-- Name: idx_party_transactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_party_transactions_date ON public.party_transactions USING btree (date);


--
-- Name: idx_party_transactions_party; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_party_transactions_party ON public.party_transactions USING btree (party_id);


--
-- Name: idx_payments_bill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_bill ON public.accounting_payments USING btree (bill_id);


--
-- Name: idx_payments_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_invoice ON public.accounting_payments USING btree (invoice_id);


--
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: idx_products_store_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_store_featured ON public.products USING btree (store_id, is_featured);


--
-- Name: idx_products_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_store_id ON public.products USING btree (store_id);


--
-- Name: idx_profiles_auth_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_auth_user_id ON public.profiles USING btree (auth_user_id);


--
-- Name: idx_rbac_audit_logs_affected_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rbac_audit_logs_affected_user ON public.rbac_audit_logs USING btree (affected_user_id);


--
-- Name: idx_rbac_audit_logs_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rbac_audit_logs_changed_by ON public.rbac_audit_logs USING btree (changed_by);


--
-- Name: idx_reviews_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_product_id ON public.reviews USING btree (product_id);


--
-- Name: idx_reviews_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_store_id ON public.reviews USING btree (store_id);


--
-- Name: idx_role_permissions_module_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_module_id ON public.role_permissions USING btree (module_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- Name: idx_sales_records_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_records_order_id ON public.sales_records USING btree (order_id);


--
-- Name: idx_sales_records_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_records_recorded_at ON public.sales_records USING btree (recorded_at);


--
-- Name: idx_sales_records_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_records_type ON public.sales_records USING btree (type);


--
-- Name: idx_social_channels_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_channels_is_active ON public.social_channels USING btree (is_active);


--
-- Name: idx_social_channels_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_channels_platform ON public.social_channels USING btree (platform);


--
-- Name: idx_social_post_channels_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_post_channels_channel_id ON public.social_post_channels USING btree (channel_id);


--
-- Name: idx_social_post_channels_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_post_channels_post_id ON public.social_post_channels USING btree (post_id);


--
-- Name: idx_social_post_channels_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_post_channels_status ON public.social_post_channels USING btree (status);


--
-- Name: idx_stock_movements_movement_reason; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_movement_reason ON public.stock_movements USING btree (movement_reason) WHERE (movement_reason IS NOT NULL);


--
-- Name: idx_stock_movements_party; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_party ON public.stock_movements USING btree (party_id);


--
-- Name: idx_stock_movements_sale_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_sale_category ON public.stock_movements USING btree (sale_category) WHERE (sale_category IS NOT NULL);


--
-- Name: idx_store_domains_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_domains_domain ON public.store_domains USING btree (domain);


--
-- Name: idx_store_domains_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_domains_store_id ON public.store_domains USING btree (store_id);


--
-- Name: idx_store_pages_store_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_pages_store_slug ON public.store_pages USING btree (store_id, slug);


--
-- Name: idx_stores_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stores_is_active ON public.stores USING btree (is_active);


--
-- Name: idx_stores_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stores_slug ON public.stores USING btree (slug);


--
-- Name: idx_training_certificates_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_certificates_user ON public.training_certificates USING btree (user_id);


--
-- Name: idx_training_enrollments_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_enrollments_course ON public.training_enrollments USING btree (course_id);


--
-- Name: idx_training_enrollments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_enrollments_user ON public.training_enrollments USING btree (user_id);


--
-- Name: idx_training_lessons_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_lessons_course ON public.training_lessons USING btree (course_id);


--
-- Name: idx_training_questions_quiz; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_questions_quiz ON public.training_questions USING btree (quiz_id);


--
-- Name: idx_training_quiz_attempts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_quiz_attempts_user ON public.training_quiz_attempts USING btree (user_id);


--
-- Name: idx_training_quizzes_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_quizzes_course ON public.training_quizzes USING btree (course_id);


--
-- Name: idx_transactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_date ON public.accounting_transactions USING btree (transaction_date);


--
-- Name: idx_transactions_party; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_party ON public.transactions USING btree (party_id);


--
-- Name: idx_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_type ON public.accounting_transactions USING btree (transaction_type);


--
-- Name: idx_user_view_state_user_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_view_state_user_section ON public.user_view_state USING btree (user_id, section);


--
-- Name: leads_assigned_to_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_assigned_to_idx ON public.leads USING btree (assigned_to_user_id);


--
-- Name: leads_bucket_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_bucket_idx ON public.leads USING btree (lead_bucket);


--
-- Name: leads_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_created_idx ON public.leads USING btree (created_at);


--
-- Name: leads_current_team_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_current_team_idx ON public.leads USING btree (current_team);


--
-- Name: leads_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_date_idx ON public.leads USING btree (date);


--
-- Name: leads_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_status_idx ON public.leads USING btree (status);


--
-- Name: order_history_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_history_created_at_idx ON public.order_history USING btree (created_at DESC);


--
-- Name: order_history_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_history_order_id_idx ON public.order_history USING btree (order_id);


--
-- Name: orders_order_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_order_date_idx ON public.orders USING btree (order_date);


--
-- Name: orders_order_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX orders_order_number_key ON public.orders USING btree (order_number);


--
-- Name: orders_order_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_order_status_idx ON public.orders USING btree (order_status);


--
-- Name: orders_sales_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_sales_person_idx ON public.orders USING btree (sales_person_id);


--
-- Name: leads audit_leads_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_leads_trigger AFTER INSERT OR DELETE OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


--
-- Name: orders audit_orders_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_orders_trigger AFTER INSERT OR DELETE OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


--
-- Name: profiles audit_profiles_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_profiles_trigger AFTER DELETE OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


--
-- Name: user_roles audit_user_roles_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_user_roles_trigger AFTER INSERT OR DELETE OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


--
-- Name: stock_movements create_party_tx_from_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_party_tx_from_stock AFTER INSERT ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.create_party_transaction_from_stock_movement();


--
-- Name: customer_notes customer_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER customer_notes_updated_at BEFORE UPDATE ON public.customer_notes FOR EACH ROW EXECUTE FUNCTION public.update_customer_notes_updated_at();


--
-- Name: profiles on_first_admin_setup; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_first_admin_setup AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.setup_first_admin();


--
-- Name: orders order_status_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER order_status_change_trigger AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();


--
-- Name: parties parties_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER parties_updated_at BEFORE UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION public.update_parties_updated_at();


--
-- Name: party_payments party_payment_create_transaction; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER party_payment_create_transaction AFTER INSERT ON public.party_payments FOR EACH ROW EXECUTE FUNCTION public.create_accounting_transaction_on_payment();


--
-- Name: party_payments party_payment_update_account; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER party_payment_update_account AFTER INSERT ON public.party_payments FOR EACH ROW EXECUTE FUNCTION public.update_account_balance_on_payment();


--
-- Name: leads prevent_confirmed_lead_assignment_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_confirmed_lead_assignment_trigger BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.prevent_confirmed_lead_assignment();


--
-- Name: stock_movements recalculate_inventory_on_movement; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER recalculate_inventory_on_movement AFTER INSERT OR DELETE OR UPDATE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.recalculate_inventory();


--
-- Name: orders sync_customer_on_order_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_customer_on_order_change BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW WHEN ((new.lead_id IS NOT NULL)) EXECUTE FUNCTION public.sync_customer_from_order();


--
-- Name: orders track_order_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER track_order_changes AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_order_changes();


--
-- Name: stock_movements trigger_create_party_transaction; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_party_transaction AFTER INSERT ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.create_party_transaction_from_stock_movement();


--
-- Name: accounts trigger_update_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_accounts_updated_at();


--
-- Name: transactions trigger_update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_transactions_updated_at();


--
-- Name: accounting_banks update_accounting_banks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_accounting_banks_updated_at BEFORE UPDATE ON public.accounting_banks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accounting_bills update_accounting_bills_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_accounting_bills_updated_at BEFORE UPDATE ON public.accounting_bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accounting_invoices update_accounting_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_accounting_invoices_updated_at BEFORE UPDATE ON public.accounting_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accounting_suppliers update_accounting_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_accounting_suppliers_updated_at BEFORE UPDATE ON public.accounting_suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accounting_wholesalers update_accounting_wholesalers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_accounting_wholesalers_updated_at BEFORE UPDATE ON public.accounting_wholesalers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ads_spend update_ads_spend_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ads_spend_updated_at BEFORE UPDATE ON public.ads_spend FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: assets update_assets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audit_manual_entries update_audit_manual_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_audit_manual_entries_updated_at BEFORE UPDATE ON public.audit_manual_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: branches update_branches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: branding update_branding_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_branding_updated_at BEFORE UPDATE ON public.branding FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: campaigns update_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cod_settlements update_cod_settlements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cod_settlements_updated_at BEFORE UPDATE ON public.cod_settlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: courier_stats update_courier_stats_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_courier_stats_updated_at_trigger BEFORE UPDATE ON public.courier_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: daily_pl update_daily_pl_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_daily_pl_updated_at BEFORE UPDATE ON public.daily_pl FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hr_settings update_hr_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_hr_settings_updated_at BEFORE UPDATE ON public.hr_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: influencers update_influencers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_influencers_updated_at BEFORE UPDATE ON public.influencers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: logistics_orders update_logistics_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_logistics_orders_updated_at BEFORE UPDATE ON public.logistics_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: logistics_settings update_logistics_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_logistics_settings_updated_at BEFORE UPDATE ON public.logistics_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: message_automation_rules update_message_automation_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_message_automation_rules_updated_at BEFORE UPDATE ON public.message_automation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: message_channels update_message_channels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_message_channels_updated_at BEFORE UPDATE ON public.message_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: message_templates update_message_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON public.message_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: order_comments update_order_comments_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_order_comments_updated_at_trigger BEFORE UPDATE ON public.order_comments FOR EACH ROW EXECUTE FUNCTION public.update_order_comments_updated_at();


--
-- Name: plugins update_plugins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_plugins_updated_at BEFORE UPDATE ON public.plugins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_inventory update_product_inventory_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_inventory_updated_at BEFORE UPDATE ON public.product_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reviews update_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: routing_rules update_routing_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_routing_rules_updated_at BEFORE UPDATE ON public.routing_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: social_channels update_social_channels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_social_channels_updated_at BEFORE UPDATE ON public.social_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: social_post_channels update_social_post_channels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_social_post_channels_updated_at BEFORE UPDATE ON public.social_post_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: social_posts update_social_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stock_movements update_stock_movements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stock_movements_updated_at BEFORE UPDATE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: store_pages update_store_pages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_store_pages_updated_at BEFORE UPDATE ON public.store_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stores update_stores_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stores_updated_at_trigger BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_stores_updated_at();


--
-- Name: training_courses update_training_courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_training_courses_updated_at BEFORE UPDATE ON public.training_courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: training_enrollments update_training_enrollments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_training_enrollments_updated_at BEFORE UPDATE ON public.training_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: training_lessons update_training_lessons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_training_lessons_updated_at BEFORE UPDATE ON public.training_lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: training_quizzes update_training_quizzes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_training_quizzes_updated_at BEFORE UPDATE ON public.training_quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: video_projects update_video_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_video_projects_updated_at BEFORE UPDATE ON public.video_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: warehouses update_warehouses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accounting_bills accounting_bills_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_bills
    ADD CONSTRAINT accounting_bills_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.accounting_expense_categories(id);


--
-- Name: accounting_bills accounting_bills_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_bills
    ADD CONSTRAINT accounting_bills_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: accounting_bills accounting_bills_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_bills
    ADD CONSTRAINT accounting_bills_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.accounting_suppliers(id) ON DELETE CASCADE;


--
-- Name: accounting_cash_ledger accounting_cash_ledger_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_cash_ledger
    ADD CONSTRAINT accounting_cash_ledger_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: accounting_invoice_items accounting_invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_invoice_items
    ADD CONSTRAINT accounting_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.accounting_invoices(id) ON DELETE CASCADE;


--
-- Name: accounting_invoice_items accounting_invoice_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_invoice_items
    ADD CONSTRAINT accounting_invoice_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: accounting_invoices accounting_invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_invoices
    ADD CONSTRAINT accounting_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: accounting_invoices accounting_invoices_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_invoices
    ADD CONSTRAINT accounting_invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: accounting_invoices accounting_invoices_wholesaler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_invoices
    ADD CONSTRAINT accounting_invoices_wholesaler_id_fkey FOREIGN KEY (wholesaler_id) REFERENCES public.accounting_wholesalers(id) ON DELETE CASCADE;


--
-- Name: accounting_payments accounting_payments_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_payments
    ADD CONSTRAINT accounting_payments_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.accounting_banks(id);


--
-- Name: accounting_payments accounting_payments_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_payments
    ADD CONSTRAINT accounting_payments_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.accounting_bills(id) ON DELETE CASCADE;


--
-- Name: accounting_payments accounting_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_payments
    ADD CONSTRAINT accounting_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: accounting_payments accounting_payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_payments
    ADD CONSTRAINT accounting_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.accounting_invoices(id) ON DELETE CASCADE;


--
-- Name: accounting_transaction_lines accounting_transaction_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_transaction_lines
    ADD CONSTRAINT accounting_transaction_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: accounting_transaction_lines accounting_transaction_lines_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_transaction_lines
    ADD CONSTRAINT accounting_transaction_lines_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id);


--
-- Name: accounting_transaction_lines accounting_transaction_lines_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_transaction_lines
    ADD CONSTRAINT accounting_transaction_lines_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: accounting_transactions accounting_transactions_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_transactions
    ADD CONSTRAINT accounting_transactions_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.accounting_banks(id);


--
-- Name: accounting_transactions accounting_transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_transactions
    ADD CONSTRAINT accounting_transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.accounting_expense_categories(id);


--
-- Name: accounting_transactions accounting_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_transactions
    ADD CONSTRAINT accounting_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: ads ads_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ads
    ADD CONSTRAINT ads_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: ads_spend ads_spend_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ads_spend
    ADD CONSTRAINT ads_spend_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: asset_assignments asset_assignments_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_assignments
    ADD CONSTRAINT asset_assignments_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: asset_assignments asset_assignments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_assignments
    ADD CONSTRAINT asset_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: audit_entry_toggles audit_entry_toggles_toggled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_entry_toggles
    ADD CONSTRAINT audit_entry_toggles_toggled_by_fkey FOREIGN KEY (toggled_by) REFERENCES auth.users(id);


--
-- Name: audit_manual_entries audit_manual_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_manual_entries
    ADD CONSTRAINT audit_manual_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: audit_snapshots audit_snapshots_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_snapshots
    ADD CONSTRAINT audit_snapshots_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: branding branding_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding
    ADD CONSTRAINT branding_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: call_logs call_logs_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: call_logs call_logs_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id);


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: categories categories_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id);


--
-- Name: chat_room_members chat_room_members_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_room_members
    ADD CONSTRAINT chat_room_members_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;


--
-- Name: chat_room_members chat_room_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_room_members
    ADD CONSTRAINT chat_room_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_rooms chat_rooms_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: cod_settlements cod_settlements_logistics_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cod_settlements
    ADD CONSTRAINT cod_settlements_logistics_order_id_fkey FOREIGN KEY (logistics_order_id) REFERENCES public.logistics_orders(id);


--
-- Name: cod_settlements cod_settlements_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cod_settlements
    ADD CONSTRAINT cod_settlements_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: courier_updates courier_updates_logistics_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_updates
    ADD CONSTRAINT courier_updates_logistics_order_id_fkey FOREIGN KEY (logistics_order_id) REFERENCES public.logistics_orders(id) ON DELETE CASCADE;


--
-- Name: courier_updates courier_updates_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_updates
    ADD CONSTRAINT courier_updates_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: customer_activity_log customer_activity_log_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_activity_log
    ADD CONSTRAINT customer_activity_log_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: customer_activity_log customer_activity_log_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_activity_log
    ADD CONSTRAINT customer_activity_log_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_notes customer_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: customer_notes customer_notes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customers customers_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: daily_pl daily_pl_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_pl
    ADD CONSTRAINT daily_pl_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: email_verifications email_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT email_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: employee_documents employee_documents_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_documents employee_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id);


--
-- Name: employee_documents employee_documents_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id);


--
-- Name: employees employees_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.hr_bank_accounts(id);


--
-- Name: employees employees_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: employees employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: followup_logs followup_logs_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.followup_logs
    ADD CONSTRAINT followup_logs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: followup_logs followup_logs_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.followup_logs
    ADD CONSTRAINT followup_logs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);


--
-- Name: lead_history lead_history_from_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_history
    ADD CONSTRAINT lead_history_from_staff_id_fkey FOREIGN KEY (from_staff_id) REFERENCES auth.users(id);


--
-- Name: lead_history lead_history_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_history
    ADD CONSTRAINT lead_history_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_history lead_history_to_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_history
    ADD CONSTRAINT lead_history_to_staff_id_fkey FOREIGN KEY (to_staff_id) REFERENCES auth.users(id);


--
-- Name: lead_history lead_history_transferred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_history
    ADD CONSTRAINT lead_history_transferred_by_fkey FOREIGN KEY (transferred_by) REFERENCES auth.users(id);


--
-- Name: lead_transfers lead_transfers_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_transfers
    ADD CONSTRAINT lead_transfers_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.profiles(id);


--
-- Name: lead_transfers lead_transfers_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_transfers
    ADD CONSTRAINT lead_transfers_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_transfers lead_transfers_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_transfers
    ADD CONSTRAINT lead_transfers_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.profiles(id);


--
-- Name: lead_transfers lead_transfers_transferred_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_transfers
    ADD CONSTRAINT lead_transfers_transferred_by_user_id_fkey FOREIGN KEY (transferred_by_user_id) REFERENCES public.profiles(id);


--
-- Name: leads leads_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.profiles(id);


--
-- Name: leads leads_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: leads leads_confirmed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_confirmed_by_user_id_fkey FOREIGN KEY (confirmed_by_user_id) REFERENCES auth.users(id);


--
-- Name: leads leads_created_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_created_by_staff_id_fkey FOREIGN KEY (created_by_staff_id) REFERENCES public.profiles(id);


--
-- Name: leads leads_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.profiles(id);


--
-- Name: leads leads_last_called_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_last_called_by_fkey FOREIGN KEY (last_called_by) REFERENCES public.profiles(id);


--
-- Name: leads leads_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: leads leads_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: leads leads_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.lead_sources(id);


--
-- Name: leads leads_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: leave_quota leave_quota_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_quota
    ADD CONSTRAINT leave_quota_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: leave_quota leave_quota_leave_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_quota
    ADD CONSTRAINT leave_quota_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.employees(id);


--
-- Name: leave_requests leave_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_leave_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id);


--
-- Name: logistics_orders logistics_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logistics_orders
    ADD CONSTRAINT logistics_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: logistics_orders logistics_orders_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logistics_orders
    ADD CONSTRAINT logistics_orders_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: marketing_targets marketing_targets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_targets
    ADD CONSTRAINT marketing_targets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: message_automation_rules message_automation_rules_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_automation_rules
    ADD CONSTRAINT message_automation_rules_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.message_channels(id) ON DELETE CASCADE;


--
-- Name: message_automation_rules message_automation_rules_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_automation_rules
    ADD CONSTRAINT message_automation_rules_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.message_templates(id) ON DELETE CASCADE;


--
-- Name: message_logs message_logs_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.message_channels(id) ON DELETE CASCADE;


--
-- Name: message_logs message_logs_related_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_related_lead_id_fkey FOREIGN KEY (related_lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: message_logs message_logs_related_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_related_order_id_fkey FOREIGN KEY (related_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: message_logs message_logs_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.message_automation_rules(id) ON DELETE SET NULL;


--
-- Name: message_logs message_logs_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.message_templates(id) ON DELETE SET NULL;


--
-- Name: order_comments order_comments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_comments
    ADD CONSTRAINT order_comments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_comments order_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_comments
    ADD CONSTRAINT order_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: order_courier order_courier_courier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_courier
    ADD CONSTRAINT order_courier_courier_id_fkey FOREIGN KEY (courier_id) REFERENCES public.couriers(id);


--
-- Name: order_courier order_courier_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_courier
    ADD CONSTRAINT order_courier_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_events order_events_event_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_events
    ADD CONSTRAINT order_events_event_by_fkey FOREIGN KEY (event_by) REFERENCES auth.users(id);


--
-- Name: order_events order_events_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_events
    ADD CONSTRAINT order_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_history order_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_history
    ADD CONSTRAINT order_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: order_history order_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_history
    ADD CONSTRAINT order_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: order_status_history order_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES auth.users(id);


--
-- Name: orders orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: orders orders_called_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_called_by_user_id_fkey FOREIGN KEY (called_by_user_id) REFERENCES auth.users(id);


--
-- Name: orders orders_confirmed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_confirmed_by_user_id_fkey FOREIGN KEY (confirmed_by_user_id) REFERENCES public.profiles(id);


--
-- Name: orders orders_courier_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_courier_submitted_by_fkey FOREIGN KEY (courier_submitted_by) REFERENCES auth.users(id);


--
-- Name: orders orders_created_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_staff_id_fkey FOREIGN KEY (created_by_staff_id) REFERENCES public.profiles(id);


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: orders orders_inside_delivery_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_inside_delivery_updated_by_fkey FOREIGN KEY (inside_delivery_updated_by) REFERENCES auth.users(id);


--
-- Name: orders orders_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);


--
-- Name: orders orders_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_redirected_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_redirected_by_user_id_fkey FOREIGN KEY (redirected_by_user_id) REFERENCES public.profiles(id);


--
-- Name: orders orders_sales_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_sales_person_id_fkey FOREIGN KEY (sales_person_id) REFERENCES public.profiles(id);


--
-- Name: orders orders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: party_ledger party_ledger_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_ledger
    ADD CONSTRAINT party_ledger_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id);


--
-- Name: party_ledger party_ledger_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_ledger
    ADD CONSTRAINT party_ledger_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id);


--
-- Name: party_payments party_payments_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_payments
    ADD CONSTRAINT party_payments_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: party_payments party_payments_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_payments
    ADD CONSTRAINT party_payments_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;


--
-- Name: party_transactions party_transactions_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_transactions
    ADD CONSTRAINT party_transactions_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;


--
-- Name: party_transactions party_transactions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_transactions
    ADD CONSTRAINT party_transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: party_transactions party_transactions_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.party_transactions
    ADD CONSTRAINT party_transactions_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: payroll_records payroll_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: plugins plugins_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plugins
    ADD CONSTRAINT plugins_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: product_inventory product_inventory_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_inventory
    ADD CONSTRAINT product_inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_inventory product_inventory_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_inventory
    ADD CONSTRAINT product_inventory_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: products products_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: profiles profiles_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: rbac_audit_logs rbac_audit_logs_affected_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_audit_logs
    ADD CONSTRAINT rbac_audit_logs_affected_role_id_fkey FOREIGN KEY (affected_role_id) REFERENCES public.system_roles(id);


--
-- Name: rbac_audit_logs rbac_audit_logs_affected_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_audit_logs
    ADD CONSTRAINT rbac_audit_logs_affected_user_id_fkey FOREIGN KEY (affected_user_id) REFERENCES auth.users(id);


--
-- Name: rbac_audit_logs rbac_audit_logs_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac_audit_logs
    ADD CONSTRAINT rbac_audit_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: reviews reviews_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.system_modules(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.system_roles(id) ON DELETE CASCADE;


--
-- Name: sales_records sales_records_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_records
    ADD CONSTRAINT sales_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: sales_records sales_records_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_records
    ADD CONSTRAINT sales_records_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: sales_records sales_records_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_records
    ADD CONSTRAINT sales_records_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: social_post_channels social_post_channels_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_post_channels
    ADD CONSTRAINT social_post_channels_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.social_channels(id) ON DELETE CASCADE;


--
-- Name: social_post_channels social_post_channels_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_post_channels
    ADD CONSTRAINT social_post_channels_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.social_posts(id) ON DELETE CASCADE;


--
-- Name: social_posts social_posts_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: social_posts social_posts_video_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_video_project_id_fkey FOREIGN KEY (video_project_id) REFERENCES public.video_projects(id) ON DELETE SET NULL;


--
-- Name: staff_daily_summary staff_daily_summary_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_daily_summary
    ADD CONSTRAINT staff_daily_summary_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id);


--
-- Name: staff_targets staff_targets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_targets
    ADD CONSTRAINT staff_targets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id);


--
-- Name: stock_movements stock_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- Name: store_domains store_domains_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_domains
    ADD CONSTRAINT store_domains_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: store_pages store_pages_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_pages
    ADD CONSTRAINT store_pages_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: training_certificates training_certificates_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_certificates
    ADD CONSTRAINT training_certificates_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.training_courses(id) ON DELETE CASCADE;


--
-- Name: training_certificates training_certificates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_certificates
    ADD CONSTRAINT training_certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: training_courses training_courses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_courses
    ADD CONSTRAINT training_courses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: training_enrollments training_enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_enrollments
    ADD CONSTRAINT training_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.training_courses(id) ON DELETE CASCADE;


--
-- Name: training_enrollments training_enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_enrollments
    ADD CONSTRAINT training_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: training_lesson_completions training_lesson_completions_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_lesson_completions
    ADD CONSTRAINT training_lesson_completions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.training_lessons(id) ON DELETE CASCADE;


--
-- Name: training_lesson_completions training_lesson_completions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_lesson_completions
    ADD CONSTRAINT training_lesson_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: training_lessons training_lessons_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_lessons
    ADD CONSTRAINT training_lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.training_courses(id) ON DELETE CASCADE;


--
-- Name: training_questions training_questions_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_questions
    ADD CONSTRAINT training_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.training_quizzes(id) ON DELETE CASCADE;


--
-- Name: training_quiz_attempts training_quiz_attempts_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_quiz_attempts
    ADD CONSTRAINT training_quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.training_quizzes(id) ON DELETE CASCADE;


--
-- Name: training_quiz_attempts training_quiz_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_quiz_attempts
    ADD CONSTRAINT training_quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: training_quizzes training_quizzes_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_quizzes
    ADD CONSTRAINT training_quizzes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.training_courses(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: transactions transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.transaction_categories(id);


--
-- Name: transactions transactions_from_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_from_account_id_fkey FOREIGN KEY (from_account_id) REFERENCES public.accounts(id);


--
-- Name: transactions transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: transactions transactions_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id);


--
-- Name: transactions transactions_to_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.accounts(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: video_projects video_projects_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_projects
    ADD CONSTRAINT video_projects_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: audit_manual_entries Admin can manage audit entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage audit entries" ON public.audit_manual_entries USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['ADMIN'::public.app_role, 'MANAGER'::public.app_role]))))));


--
-- Name: audit_snapshots Admin can manage audit snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage audit snapshots" ON public.audit_snapshots USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['ADMIN'::public.app_role, 'MANAGER'::public.app_role]))))));


--
-- Name: audit_entry_toggles Admin can manage audit toggles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage audit toggles" ON public.audit_entry_toggles USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['ADMIN'::public.app_role, 'MANAGER'::public.app_role]))))));


--
-- Name: leave_requests Admins HR and Manager can manage leave requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins HR and Manager can manage leave requests" ON public.leave_requests USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'HR'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: employee_documents Admins and HR can manage all documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and HR can manage all documents" ON public.employee_documents USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'HR'::public.app_role)));


--
-- Name: attendance_records Admins and HR can manage attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and HR can manage attendance" ON public.attendance_records USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'HR'::public.app_role)));


--
-- Name: employees Admins and HR can manage employees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and HR can manage employees" ON public.employees USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'HR'::public.app_role)));


--
-- Name: leave_quota Admins and HR can manage leave quota; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and HR can manage leave quota" ON public.leave_quota USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'HR'::public.app_role)));


--
-- Name: notices Admins and HR can manage notices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and HR can manage notices" ON public.notices USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'HR'::public.app_role)));


--
-- Name: payroll_records Admins and HR can manage payroll; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and HR can manage payroll" ON public.payroll_records USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'HR'::public.app_role)));


--
-- Name: shifts Admins and HR can manage shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and HR can manage shifts" ON public.shifts USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'HR'::public.app_role)));


--
-- Name: courier_stats Admins and Logistics can manage courier stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Logistics can manage courier stats" ON public.courier_stats USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'LOGISTICS'::public.app_role)));


--
-- Name: courier_updates Admins and Logistics can view courier updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Logistics can view courier updates" ON public.courier_updates FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'LOGISTICS'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: training_certificates Admins and Managers can manage certificates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Managers can manage certificates" ON public.training_certificates USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: training_courses Admins and Managers can manage courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Managers can manage courses" ON public.training_courses USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: training_enrollments Admins and Managers can manage enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Managers can manage enrollments" ON public.training_enrollments USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: training_lessons Admins and Managers can manage lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Managers can manage lessons" ON public.training_lessons USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: training_questions Admins and Managers can manage questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Managers can manage questions" ON public.training_questions USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: training_quizzes Admins and Managers can manage quizzes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Managers can manage quizzes" ON public.training_quizzes USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: accounting_transaction_lines Admins and Managers can manage transaction lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Managers can manage transaction lines" ON public.accounting_transaction_lines USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: training_quiz_attempts Admins and Managers can view all attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Managers can view all attempts" ON public.training_quiz_attempts FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: training_lesson_completions Admins and Managers can view all completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Managers can view all completions" ON public.training_lesson_completions FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: ads Admins and Marketing can manage ads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Marketing can manage ads" ON public.ads USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MARKETING'::public.app_role)));


--
-- Name: ads_spend Admins and Marketing can manage ads spend; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Marketing can manage ads spend" ON public.ads_spend USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MARKETING'::public.app_role)));


--
-- Name: campaigns Admins and Marketing can manage campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Marketing can manage campaigns" ON public.campaigns USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MARKETING'::public.app_role)));


--
-- Name: social_channels Admins and Marketing can manage channels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Marketing can manage channels" ON public.social_channels USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MARKETING'::public.app_role)));


--
-- Name: influencers Admins and Marketing can manage influencers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Marketing can manage influencers" ON public.influencers USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MARKETING'::public.app_role)));


--
-- Name: social_post_channels Admins and Marketing can manage post channels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Marketing can manage post channels" ON public.social_post_channels USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MARKETING'::public.app_role)));


--
-- Name: social_posts Admins and Marketing can manage social_posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Marketing can manage social_posts" ON public.social_posts USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MARKETING'::public.app_role)));


--
-- Name: video_projects Admins and Marketing can manage video_projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Marketing can manage video_projects" ON public.video_projects USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MARKETING'::public.app_role)));


--
-- Name: audit_manual_entries Admins and managers can delete audit entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can delete audit entries" ON public.audit_manual_entries FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: audit_snapshots Admins and managers can delete audit snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can delete audit snapshots" ON public.audit_snapshots FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: audit_manual_entries Admins and managers can insert audit entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can insert audit entries" ON public.audit_manual_entries FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: audit_snapshots Admins and managers can insert audit snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can insert audit snapshots" ON public.audit_snapshots FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: audit_entry_toggles Admins and managers can manage audit toggles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage audit toggles" ON public.audit_entry_toggles TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: audit_manual_entries Admins and managers can update audit entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can update audit entries" ON public.audit_manual_entries FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: audit_snapshots Admins and managers can update audit snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can update audit snapshots" ON public.audit_snapshots FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: audit_manual_entries Admins and managers can view audit entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can view audit entries" ON public.audit_manual_entries FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: audit_snapshots Admins and managers can view audit snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can view audit snapshots" ON public.audit_snapshots FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: audit_entry_toggles Admins and managers can view audit toggles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can view audit toggles" ON public.audit_entry_toggles FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: order_history Admins and managers can view order history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can view order history" ON public.order_history FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role) OR public.has_role(auth.uid(), 'CALLING'::public.app_role) OR public.has_role(auth.uid(), 'LOGISTICS'::public.app_role)));


--
-- Name: customer_notes Admins and staff can create customer notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and staff can create customer notes" ON public.customer_notes FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'CALLING'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: customer_activity_log Admins and staff can view customer activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and staff can view customer activity" ON public.customer_activity_log FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'CALLING'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: customer_notes Admins and staff can view customer notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and staff can view customer notes" ON public.customer_notes FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'CALLING'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: branches Admins can delete branches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete branches" ON public.branches FOR DELETE USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: order_comments Admins can delete comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete comments" ON public.order_comments FOR DELETE USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: customer_notes Admins can delete customer notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete customer notes" ON public.customer_notes FOR DELETE USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: followup_logs Admins can delete followup logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete followup logs" ON public.followup_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: notifications Admins can delete notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete notifications" ON public.notifications FOR DELETE USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: branches Admins can insert branches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert branches" ON public.branches FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: cod_settlements Admins can manage COD settlements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage COD settlements" ON public.cod_settlements USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: hr_settings Admins can manage HR settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage HR settings" ON public.hr_settings USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: accounts Admins can manage accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage accounts" ON public.accounts USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: orders Admins can manage all orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all orders" ON public.orders USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: profiles Admins can manage all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all profiles" ON public.profiles USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: store_domains Admins can manage all store domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all store domains" ON public.store_domains USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: stores Admins can manage all stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all stores" ON public.stores USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: asset_assignments Admins can manage asset assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage asset assignments" ON public.asset_assignments USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: assets Admins can manage assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage assets" ON public.assets USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: message_automation_rules Admins can manage automation rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage automation rules" ON public.message_automation_rules USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: hr_bank_accounts Admins can manage bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage bank accounts" ON public.hr_bank_accounts USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: accounting_banks Admins can manage banks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage banks" ON public.accounting_banks USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: accounting_bills Admins can manage bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage bills" ON public.accounting_bills USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: branding Admins can manage branding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage branding" ON public.branding USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: system_branding Admins can manage branding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage branding" ON public.system_branding USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: call_logs Admins can manage call logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage call logs" ON public.call_logs USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: accounting_cash_ledger Admins can manage cash ledger; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage cash ledger" ON public.accounting_cash_ledger USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: categories Admins can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage categories" ON public.categories USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: transaction_categories Admins can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage categories" ON public.transaction_categories USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: chat_rooms Admins can manage chat rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage chat rooms" ON public.chat_rooms USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: company_info Admins can manage company info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage company info" ON public.company_info USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: customers Admins can manage customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage customers" ON public.customers USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: daily_pl Admins can manage daily PL; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage daily PL" ON public.daily_pl USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: departments Admins can manage departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage departments" ON public.departments USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: accounting_expense_categories Admins can manage expense categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage expense categories" ON public.accounting_expense_categories USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: office_holidays Admins can manage holidays; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage holidays" ON public.office_holidays USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: product_inventory Admins can manage inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage inventory" ON public.product_inventory USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: accounting_invoice_items Admins can manage invoice items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage invoice items" ON public.accounting_invoice_items USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: accounting_invoices Admins can manage invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage invoices" ON public.accounting_invoices USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: lead_sources Admins can manage lead sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage lead sources" ON public.lead_sources TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: leave_types Admins can manage leave types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage leave types" ON public.leave_types USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: logistics_orders Admins can manage logistics orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage logistics orders" ON public.logistics_orders USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: logistics_settings Admins can manage logistics settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage logistics settings" ON public.logistics_settings USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: marketing_targets Admins can manage marketing targets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage marketing targets" ON public.marketing_targets USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: chat_room_members Admins can manage memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage memberships" ON public.chat_room_members USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: message_channels Admins can manage message channels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage message channels" ON public.message_channels USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: message_logs Admins can manage message logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage message logs" ON public.message_logs USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: message_templates Admins can manage message templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage message templates" ON public.message_templates USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: chat_messages Admins can manage messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage messages" ON public.chat_messages USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: office_expenses Admins can manage office expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage office expenses" ON public.office_expenses USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: order_events Admins can manage order events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage order events" ON public.order_events USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: parties Admins can manage parties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage parties" ON public.parties USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: party_ledger Admins can manage party ledger; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage party ledger" ON public.party_ledger USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: party_payments Admins can manage party payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage party payments" ON public.party_payments USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: party_transactions Admins can manage party transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage party transactions" ON public.party_transactions USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: accounting_payments Admins can manage payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage payments" ON public.accounting_payments USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: plugins Admins can manage plugins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage plugins" ON public.plugins USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: hr_policies Admins can manage policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage policies" ON public.hr_policies USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: products Admins can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage products" ON public.products USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: reviews Admins can manage reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage reviews" ON public.reviews USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: role_permissions Admins can manage role permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage role permissions" ON public.role_permissions TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: routing_rules Admins can manage routing rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage routing rules" ON public.routing_rules USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: sales_records Admins can manage sales records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sales records" ON public.sales_records USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: staff_daily_summary Admins can manage staff daily summary; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage staff daily summary" ON public.staff_daily_summary USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: staff_targets Admins can manage staff targets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage staff targets" ON public.staff_targets USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: stock_movements Admins can manage stock movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage stock movements" ON public.stock_movements USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: store_pages Admins can manage store pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage store pages" ON public.store_pages USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: accounting_suppliers Admins can manage suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage suppliers" ON public.accounting_suppliers USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: system_modules Admins can manage system modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage system modules" ON public.system_modules TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: system_roles Admins can manage system roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage system roles" ON public.system_roles TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: accounting_transactions Admins can manage transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage transactions" ON public.accounting_transactions USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: transactions Admins can manage transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage transactions" ON public.transactions USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: lead_transfers Admins can manage transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage transfers" ON public.lead_transfers USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: email_verifications Admins can manage verifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage verifications" ON public.email_verifications USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: warehouses Admins can manage warehouses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage warehouses" ON public.warehouses USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: accounting_wholesalers Admins can manage wholesalers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage wholesalers" ON public.accounting_wholesalers USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: branches Admins can update branches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update branches" ON public.branches FOR UPDATE USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: customer_notes Admins can update customer notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update customer notes" ON public.customer_notes FOR UPDATE USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: lead_history Admins can view all lead history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all lead history" ON public.lead_history FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: office_expenses Admins can view office expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view office expenses" ON public.office_expenses FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: system_modules All authenticated users can view modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can view modules" ON public.system_modules FOR SELECT USING ((is_active = true));


--
-- Name: role_permissions All authenticated users can view permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can view permissions" ON public.role_permissions FOR SELECT USING (true);


--
-- Name: system_roles All authenticated users can view roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can view roles" ON public.system_roles FOR SELECT USING ((is_active = true));


--
-- Name: store_domains Anyone can view verified domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view verified domains" ON public.store_domains FOR SELECT USING (((verified_at IS NOT NULL) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: reviews Approved reviews viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved reviews viewable by everyone" ON public.reviews FOR SELECT USING (((is_approved = true) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: notifications Authenticated users can create notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create notifications" ON public.notifications FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: message_logs Authenticated users can insert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert logs" ON public.message_logs FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: hr_settings Authenticated users can view HR settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view HR settings" ON public.hr_settings FOR SELECT TO authenticated USING (true);


--
-- Name: branches Authenticated users can view active branches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active branches" ON public.branches FOR SELECT TO authenticated USING (((is_active = true) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: message_channels Authenticated users can view active channels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active channels" ON public.message_channels FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: social_channels Authenticated users can view active channels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active channels" ON public.social_channels FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: training_courses Authenticated users can view active courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active courses" ON public.training_courses FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: message_automation_rules Authenticated users can view active rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active rules" ON public.message_automation_rules FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: stores Authenticated users can view active stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active stores" ON public.stores FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: message_templates Authenticated users can view active templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active templates" ON public.message_templates FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: ads Authenticated users can view ads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view ads" ON public.ads FOR SELECT TO authenticated USING (true);


--
-- Name: ads_spend Authenticated users can view ads spend; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view ads spend" ON public.ads_spend FOR SELECT USING (true);


--
-- Name: campaigns Authenticated users can view campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view campaigns" ON public.campaigns FOR SELECT USING (true);


--
-- Name: company_info Authenticated users can view company info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view company info" ON public.company_info FOR SELECT TO authenticated USING (true);


--
-- Name: daily_pl Authenticated users can view daily PL; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view daily PL" ON public.daily_pl FOR SELECT USING (true);


--
-- Name: departments Authenticated users can view departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view departments" ON public.departments FOR SELECT TO authenticated USING (true);


--
-- Name: office_holidays Authenticated users can view holidays; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view holidays" ON public.office_holidays FOR SELECT TO authenticated USING (true);


--
-- Name: influencers Authenticated users can view influencers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view influencers" ON public.influencers FOR SELECT USING (true);


--
-- Name: product_inventory Authenticated users can view inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view inventory" ON public.product_inventory FOR SELECT USING (true);


--
-- Name: lead_sources Authenticated users can view lead sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view lead sources" ON public.lead_sources FOR SELECT TO authenticated USING (((is_active = true) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: leave_types Authenticated users can view leave types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view leave types" ON public.leave_types FOR SELECT TO authenticated USING (true);


--
-- Name: marketing_targets Authenticated users can view marketing targets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view marketing targets" ON public.marketing_targets FOR SELECT USING (true);


--
-- Name: social_post_channels Authenticated users can view post channels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view post channels" ON public.social_post_channels FOR SELECT USING (true);


--
-- Name: products Authenticated users can view products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);


--
-- Name: role_permissions Authenticated users can view role permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: routing_rules Authenticated users can view routing rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view routing rules" ON public.routing_rules FOR SELECT USING ((is_active = true));


--
-- Name: shifts Authenticated users can view shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view shifts" ON public.shifts FOR SELECT USING (true);


--
-- Name: social_posts Authenticated users can view social_posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view social_posts" ON public.social_posts FOR SELECT USING (true);


--
-- Name: stock_movements Authenticated users can view stock movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view stock movements" ON public.stock_movements FOR SELECT USING (true);


--
-- Name: system_modules Authenticated users can view system modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view system modules" ON public.system_modules FOR SELECT TO authenticated USING (true);


--
-- Name: system_roles Authenticated users can view system roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view system roles" ON public.system_roles FOR SELECT TO authenticated USING (true);


--
-- Name: video_projects Authenticated users can view video_projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view video_projects" ON public.video_projects FOR SELECT USING (true);


--
-- Name: warehouses Authenticated users can view warehouses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view warehouses" ON public.warehouses FOR SELECT USING (true);


--
-- Name: branding Branding is viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Branding is viewable by everyone" ON public.branding FOR SELECT USING (true);


--
-- Name: logistics_orders Calling and Followup can create logistics orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Calling and Followup can create logistics orders" ON public.logistics_orders FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'CALLING'::public.app_role) OR public.has_role(auth.uid(), 'FOLLOWUP'::public.app_role) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: categories Categories are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: couriers Couriers are manageable by admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Couriers are manageable by admin" ON public.couriers TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['ADMIN'::public.app_role, 'MANAGER'::public.app_role]))))));


--
-- Name: couriers Couriers are viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Couriers are viewable by authenticated users" ON public.couriers FOR SELECT TO authenticated USING (true);


--
-- Name: reviews Customers can create reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers can create reviews" ON public.reviews FOR INSERT WITH CHECK (true);


--
-- Name: attendance_records Employees can check in/out; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can check in/out" ON public.attendance_records FOR INSERT WITH CHECK ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: leave_requests Employees can create their own leave requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can create their own leave requests" ON public.leave_requests FOR INSERT WITH CHECK ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: attendance_records Employees can update their own attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can update their own attendance" ON public.attendance_records FOR UPDATE USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: employee_documents Employees can update title of their own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can update title of their own documents" ON public.employee_documents FOR UPDATE USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: employee_documents Employees can upload their own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can upload their own documents" ON public.employee_documents FOR INSERT WITH CHECK (((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))) AND (uploaded_by = auth.uid())));


--
-- Name: asset_assignments Employees can view their own assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view their own assignments" ON public.asset_assignments FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: attendance_records Employees can view their own attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view their own attendance" ON public.attendance_records FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: hr_bank_accounts Employees can view their own bank account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view their own bank account" ON public.hr_bank_accounts FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR (id IN ( SELECT employees.bank_account_id
   FROM public.employees
  WHERE (employees.user_id = auth.uid())))));


--
-- Name: employee_documents Employees can view their own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view their own documents" ON public.employee_documents FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: leave_requests Employees can view their own leave requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view their own leave requests" ON public.leave_requests FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: payroll_records Employees can view their own payroll; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view their own payroll" ON public.payroll_records FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: leave_quota Employees can view their own quota; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view their own quota" ON public.leave_quota FOR SELECT USING ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));


--
-- Name: employees Employees can view their own record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employees can view their own record" ON public.employees FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: notices Everyone can view active notices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active notices" ON public.notices FOR SELECT USING (((is_active = true) AND (start_date <= CURRENT_DATE) AND ((end_date IS NULL) OR (end_date >= CURRENT_DATE))));


--
-- Name: hr_policies Everyone can view active policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active policies" ON public.hr_policies FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: system_branding Everyone can view branding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view branding" ON public.system_branding FOR SELECT USING (true);


--
-- Name: orders FOLLOWUP can redirect outside valley orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "FOLLOWUP can redirect outside valley orders" ON public.orders FOR UPDATE USING ((public.has_role(auth.uid(), 'FOLLOWUP'::public.app_role) AND (delivery_location = 'OUTSIDE_VALLEY'::text))) WITH CHECK ((public.has_role(auth.uid(), 'FOLLOWUP'::public.app_role) AND (delivery_location = 'OUTSIDE_VALLEY'::text)));


--
-- Name: orders LOGISTICS can update orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "LOGISTICS can update orders" ON public.orders FOR UPDATE USING ((public.has_role(auth.uid(), 'LOGISTICS'::public.app_role) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: logistics_settings Logistics and Admin can view settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Logistics and Admin can view settings" ON public.logistics_settings FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'LOGISTICS'::public.app_role)));


--
-- Name: cod_settlements Logistics and Manager can view COD settlements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Logistics and Manager can view COD settlements" ON public.cod_settlements FOR SELECT USING ((public.has_role(auth.uid(), 'LOGISTICS'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: logistics_orders Logistics can manage logistics orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Logistics can manage logistics orders" ON public.logistics_orders USING (public.has_role(auth.uid(), 'LOGISTICS'::public.app_role));


--
-- Name: accounts Managers can view accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view accounts" ON public.accounts FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: accounting_banks Managers can view banks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view banks" ON public.accounting_banks FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: accounting_bills Managers can view bills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view bills" ON public.accounting_bills FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: accounting_cash_ledger Managers can view cash ledger; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view cash ledger" ON public.accounting_cash_ledger FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: accounting_expense_categories Managers can view expense categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view expense categories" ON public.accounting_expense_categories FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: accounting_invoice_items Managers can view invoice items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view invoice items" ON public.accounting_invoice_items FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: accounting_invoices Managers can view invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view invoices" ON public.accounting_invoices FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: parties Managers can view parties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view parties" ON public.parties FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: party_ledger Managers can view party ledger; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view party ledger" ON public.party_ledger FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: party_payments Managers can view party payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view party payments" ON public.party_payments FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: party_transactions Managers can view party transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view party transactions" ON public.party_transactions FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: accounting_payments Managers can view payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view payments" ON public.accounting_payments FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: sales_records Managers can view sales records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view sales records" ON public.sales_records FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: accounting_suppliers Managers can view suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view suppliers" ON public.accounting_suppliers FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: accounting_transactions Managers can view transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view transactions" ON public.accounting_transactions FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: transactions Managers can view transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view transactions" ON public.transactions FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: accounting_wholesalers Managers can view wholesalers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view wholesalers" ON public.accounting_wholesalers FOR SELECT USING (public.has_role(auth.uid(), 'MANAGER'::public.app_role));


--
-- Name: system_modules Only admins can manage modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage modules" ON public.system_modules USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: role_permissions Only admins can manage permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage permissions" ON public.role_permissions USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: system_roles Only admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage roles" ON public.system_roles USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: audit_logs Only admins can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: rbac_audit_logs Only admins can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view audit logs" ON public.rbac_audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: failed_login_attempts Only admins can view failed logins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view failed logins" ON public.failed_login_attempts FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: order_courier Order courier records manageable by admin/logistics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Order courier records manageable by admin/logistics" ON public.order_courier TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['ADMIN'::public.app_role, 'MANAGER'::public.app_role, 'LOGISTICS'::public.app_role]))))));


--
-- Name: order_courier Order courier records viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Order courier records viewable by authenticated users" ON public.order_courier FOR SELECT TO authenticated USING (true);


--
-- Name: order_items Order items deletable by staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Order items deletable by staff" ON public.order_items FOR DELETE USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'CALLING'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role) OR public.has_role(auth.uid(), 'FOLLOWUP'::public.app_role)));


--
-- Name: order_items Order items insertable by system; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Order items insertable by system" ON public.order_items FOR INSERT WITH CHECK (true);


--
-- Name: order_items Order items updatable by staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Order items updatable by staff" ON public.order_items FOR UPDATE USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'CALLING'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role) OR public.has_role(auth.uid(), 'FOLLOWUP'::public.app_role)));


--
-- Name: order_items Order items viewable by admins and staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Order items viewable by admins and staff" ON public.order_items FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'CALLING'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: store_pages Published pages viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Published pages viewable by everyone" ON public.store_pages FOR SELECT USING (((is_published = true) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: staff_targets Staff and Managers can view targets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff and Managers can view targets" ON public.staff_targets FOR SELECT USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: call_logs Staff can create call logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create call logs" ON public.call_logs FOR INSERT WITH CHECK ((staff_id = auth.uid()));


--
-- Name: order_comments Staff can create comments on their orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create comments on their orders" ON public.order_comments FOR INSERT WITH CHECK (((user_id = auth.uid()) AND (public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role) OR (order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.sales_person_id = auth.uid()))))));


--
-- Name: order_events Staff can create order events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create order events" ON public.order_events FOR INSERT WITH CHECK ((event_by = auth.uid()));


--
-- Name: orders Staff can create orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create orders" ON public.orders FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'CALLING'::public.app_role) OR public.has_role(auth.uid(), 'FOLLOWUP'::public.app_role) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: lead_transfers Staff can create transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create transfers" ON public.lead_transfers FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: transaction_categories Staff can view categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view categories" ON public.transaction_categories FOR SELECT USING (true);


--
-- Name: order_comments Staff can view comments on their orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view comments on their orders" ON public.order_comments FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role) OR (order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.sales_person_id = auth.uid())))));


--
-- Name: courier_stats Staff can view courier stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view courier stats" ON public.courier_stats FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'LOGISTICS'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role) OR public.has_role(auth.uid(), 'CALLING'::public.app_role)));


--
-- Name: customers Staff can view customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view customers" ON public.customers FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'CALLING'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: order_history Staff can view history of their orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view history of their orders" ON public.order_history FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role) OR (order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.sales_person_id = auth.uid())))));


--
-- Name: order_events Staff can view order events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view order events" ON public.order_events FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role) OR public.has_role(auth.uid(), 'CALLING'::public.app_role) OR public.has_role(auth.uid(), 'LOGISTICS'::public.app_role)));


--
-- Name: sales_records Staff can view own sales records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view own sales records" ON public.sales_records FOR SELECT USING ((created_by = auth.uid()));


--
-- Name: message_logs Staff can view related logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view related logs" ON public.message_logs FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: assets Staff can view relevant assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view relevant assets" ON public.assets FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR (id IN ( SELECT asset_assignments.asset_id
   FROM public.asset_assignments
  WHERE (asset_assignments.employee_id IN ( SELECT employees.id
           FROM public.employees
          WHERE (employees.user_id = auth.uid())))))));


--
-- Name: call_logs Staff can view relevant call logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view relevant call logs" ON public.call_logs FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR (staff_id = auth.uid()) OR (lead_id IN ( SELECT leads.id
   FROM public.leads
  WHERE (leads.assigned_to_user_id = auth.uid())))));


--
-- Name: order_status_history Staff can view relevant order history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view relevant order history" ON public.order_status_history FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'LOGISTICS'::public.app_role) OR (order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.sales_person_id = auth.uid())))));


--
-- Name: lead_transfers Staff can view relevant transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view relevant transfers" ON public.lead_transfers FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR (from_user_id = auth.uid()) OR (to_user_id = auth.uid()) OR (transferred_by_user_id = auth.uid())));


--
-- Name: logistics_orders Staff can view their logistics orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view their logistics orders" ON public.logistics_orders FOR SELECT USING ((public.has_role(auth.uid(), 'CALLING'::public.app_role) OR public.has_role(auth.uid(), 'FOLLOWUP'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: orders Staff can view their orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view their orders" ON public.orders FOR SELECT USING (((sales_person_id = auth.uid()) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'LOGISTICS'::public.app_role) OR public.has_role(auth.uid(), 'FOLLOWUP'::public.app_role)));


--
-- Name: staff_daily_summary Staff can view their own summary; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view their own summary" ON public.staff_daily_summary FOR SELECT USING (((staff_id = auth.uid()) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role)));


--
-- Name: customer_activity_log System can create customer activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create customer activity" ON public.customer_activity_log FOR INSERT WITH CHECK (true);


--
-- Name: courier_updates System can insert courier updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert courier updates" ON public.courier_updates FOR INSERT WITH CHECK (true);


--
-- Name: lead_history System can insert lead history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert lead history" ON public.lead_history FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: order_history System can insert order history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert order history" ON public.order_history FOR INSERT WITH CHECK (true);


--
-- Name: followup_logs Users can create followup logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create followup logs" ON public.followup_logs FOR INSERT TO authenticated WITH CHECK ((updated_by = auth.uid()));


--
-- Name: training_certificates Users can insert own certificates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own certificates" ON public.training_certificates FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: user_view_state Users can insert their own view state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own view state" ON public.user_view_state FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: training_quiz_attempts Users can manage own attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own attempts" ON public.training_quiz_attempts USING ((user_id = auth.uid()));


--
-- Name: training_lesson_completions Users can manage own completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own completions" ON public.training_lesson_completions USING ((user_id = auth.uid()));


--
-- Name: chat_messages Users can send messages to their rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages to their rooms" ON public.chat_messages FOR INSERT WITH CHECK (((sender_id = auth.uid()) AND ((room_id IN ( SELECT chat_rooms.id
   FROM public.chat_rooms
  WHERE (chat_rooms.type = 'GLOBAL'::text))) OR (room_id IN ( SELECT chat_room_members.room_id
   FROM public.chat_room_members
  WHERE (chat_room_members.user_id = auth.uid()))))));


--
-- Name: training_enrollments Users can update own enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own enrollments" ON public.training_enrollments FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: followup_logs Users can update own followup logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own followup logs" ON public.followup_logs FOR UPDATE TO authenticated USING (((updated_by = auth.uid()) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (((target_user_id = auth.uid()) OR (target_role = ( SELECT (profiles.role)::text AS role
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))))) WITH CHECK (((target_user_id = auth.uid()) OR (target_role = ( SELECT (profiles.role)::text AS role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: user_view_state Users can update their own view state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own view state" ON public.user_view_state FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: followup_logs Users can view followup logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view followup logs" ON public.followup_logs FOR SELECT TO authenticated USING (((updated_by = auth.uid()) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role) OR public.has_role(auth.uid(), 'HR'::public.app_role)));


--
-- Name: training_lessons Users can view lessons of enrolled courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view lessons of enrolled courses" ON public.training_lessons FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role) OR (course_id IN ( SELECT training_enrollments.course_id
   FROM public.training_enrollments
  WHERE (training_enrollments.user_id = auth.uid()))) OR (course_id IN ( SELECT training_courses.id
   FROM public.training_courses
  WHERE (training_courses.is_active = true)))));


--
-- Name: chat_messages Users can view messages in their rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR (room_id IN ( SELECT chat_rooms.id
   FROM public.chat_rooms
  WHERE (chat_rooms.type = 'GLOBAL'::text))) OR (room_id IN ( SELECT chat_room_members.room_id
   FROM public.chat_room_members
  WHERE (chat_room_members.user_id = auth.uid())))));


--
-- Name: training_certificates Users can view own certificates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own certificates" ON public.training_certificates FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: training_enrollments Users can view own enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own enrollments" ON public.training_enrollments FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: profiles Users can view profiles based on role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view profiles based on role" ON public.profiles FOR SELECT USING (((id = auth.uid()) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role) OR public.has_role(auth.uid(), 'HR'::public.app_role) OR public.has_role(auth.uid(), 'FOLLOWUP'::public.app_role) OR public.has_role(auth.uid(), 'CALLING'::public.app_role) OR public.has_role(auth.uid(), 'LOGISTICS'::public.app_role)));


--
-- Name: training_questions Users can view questions during quiz; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view questions during quiz" ON public.training_questions FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role) OR (quiz_id IN ( SELECT training_quizzes.id
   FROM public.training_quizzes
  WHERE (training_quizzes.course_id IN ( SELECT training_enrollments.course_id
           FROM public.training_enrollments
          WHERE (training_enrollments.user_id = auth.uid())))))));


--
-- Name: training_quizzes Users can view quizzes of enrolled courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view quizzes of enrolled courses" ON public.training_quizzes FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'MANAGER'::public.app_role) OR (course_id IN ( SELECT training_enrollments.course_id
   FROM public.training_enrollments
  WHERE (training_enrollments.user_id = auth.uid())))));


--
-- Name: chat_rooms Users can view rooms they belong to; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view rooms they belong to" ON public.chat_rooms FOR SELECT USING (((type = 'GLOBAL'::text) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR (id IN ( SELECT chat_room_members.room_id
   FROM public.chat_room_members
  WHERE (chat_room_members.user_id = auth.uid())))));


--
-- Name: chat_room_members Users can view their memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their memberships" ON public.chat_room_members FOR SELECT USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (((target_user_id = auth.uid()) OR (target_role = ( SELECT (profiles.role)::text AS role
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) OR public.has_role(auth.uid(), 'ADMIN'::public.app_role)));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: email_verifications Users can view their own verification; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own verification" ON public.email_verifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_view_state Users can view their own view state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own view state" ON public.user_view_state FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: accounting_banks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_banks ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_bills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_bills ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_cash_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_cash_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_expense_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_expense_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_invoice_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_invoice_items ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_transaction_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_transaction_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_wholesalers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_wholesalers ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: ads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

--
-- Name: ads_spend; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ads_spend ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_entry_toggles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_entry_toggles ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_manual_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_manual_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: branches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

--
-- Name: branding; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.branding ENABLE ROW LEVEL SECURITY;

--
-- Name: call_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: leads calling_can_insert_leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calling_can_insert_leads ON public.leads FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'CALLING'::public.app_role) AND (created_by_user_id = auth.uid())));


--
-- Name: orders calling_can_update_own_orders_delivery; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY calling_can_update_own_orders_delivery ON public.orders FOR UPDATE USING ((public.has_role(auth.uid(), 'CALLING'::public.app_role) AND (sales_person_id = auth.uid()))) WITH CHECK ((public.has_role(auth.uid(), 'CALLING'::public.app_role) AND (sales_person_id = auth.uid())));


--
-- Name: campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_room_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: cod_settlements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cod_settlements ENABLE ROW LEVEL SECURITY;

--
-- Name: company_info; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

--
-- Name: courier_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courier_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: courier_updates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courier_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: couriers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_pl; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_pl ENABLE ROW LEVEL SECURITY;

--
-- Name: leads delete_leads_by_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delete_leads_by_role ON public.leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: email_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: employees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: failed_login_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: followup_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.followup_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: hr_bank_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hr_bank_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: hr_policies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hr_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: hr_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hr_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: influencers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;

--
-- Name: leads insert_leads_by_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_leads_by_role ON public.leads FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR (public.has_role(auth.uid(), 'LEADS'::public.app_role) AND (created_by_user_id = auth.uid()))));


--
-- Name: lead_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_quota; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leave_quota ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

--
-- Name: logistics_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.logistics_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: logistics_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.logistics_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_targets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketing_targets ENABLE ROW LEVEL SECURITY;

--
-- Name: message_automation_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_automation_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: message_channels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_channels ENABLE ROW LEVEL SECURITY;

--
-- Name: message_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: message_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: notices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: office_expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.office_expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: office_holidays; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.office_holidays ENABLE ROW LEVEL SECURITY;

--
-- Name: order_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: order_courier; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_courier ENABLE ROW LEVEL SECURITY;

--
-- Name: order_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

--
-- Name: order_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: order_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: parties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

--
-- Name: party_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.party_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: party_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.party_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: party_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.party_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: payroll_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

--
-- Name: plugins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plugins ENABLE ROW LEVEL SECURITY;

--
-- Name: product_inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: rbac_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rbac_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: routing_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: sales_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;

--
-- Name: leads select_leads_by_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_leads_by_role ON public.leads FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR (public.has_role(auth.uid(), 'LEADS'::public.app_role) AND ((current_team = 'LEADS'::public.team_type) OR (created_by_user_id = auth.uid()))) OR (public.has_role(auth.uid(), 'CALLING'::public.app_role) AND (assigned_to_user_id = auth.uid())) OR (public.has_role(auth.uid(), 'FOLLOWUP'::public.app_role) AND ((current_team = 'FOLLOWUP'::public.team_type) OR (assigned_to_user_id = auth.uid()))) OR (public.has_role(auth.uid(), 'LOGISTICS'::public.app_role) AND (status = 'CONFIRMED'::public.lead_status))));


--
-- Name: shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: social_channels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.social_channels ENABLE ROW LEVEL SECURITY;

--
-- Name: social_post_channels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.social_post_channels ENABLE ROW LEVEL SECURITY;

--
-- Name: social_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_daily_summary; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_daily_summary ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_targets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_targets ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: store_domains; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: store_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: stores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

--
-- Name: system_branding; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_branding ENABLE ROW LEVEL SECURITY;

--
-- Name: system_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: system_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: training_certificates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_certificates ENABLE ROW LEVEL SECURITY;

--
-- Name: training_courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;

--
-- Name: training_enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: training_lesson_completions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_lesson_completions ENABLE ROW LEVEL SECURITY;

--
-- Name: training_lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: training_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: training_quiz_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_quiz_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: training_quizzes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_quizzes ENABLE ROW LEVEL SECURITY;

--
-- Name: transaction_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: leads update_leads_by_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY update_leads_by_role ON public.leads FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR (public.has_role(auth.uid(), 'LEADS'::public.app_role) AND (created_by_user_id = auth.uid())) OR (public.has_role(auth.uid(), 'CALLING'::public.app_role) AND (assigned_to_user_id = auth.uid())) OR (public.has_role(auth.uid(), 'FOLLOWUP'::public.app_role) AND (current_team = 'FOLLOWUP'::public.team_type) AND ((assigned_to_user_id = auth.uid()) OR (assigned_to_user_id IS NULL))))) WITH CHECK (true);


--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_view_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_view_state ENABLE ROW LEVEL SECURITY;

--
-- Name: video_projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_projects ENABLE ROW LEVEL SECURITY;

--
-- Name: warehouses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


