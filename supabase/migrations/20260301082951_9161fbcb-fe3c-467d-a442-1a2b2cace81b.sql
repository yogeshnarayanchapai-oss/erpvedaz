
-- ============================================================
-- PERFORMANCE: COMPOSITE INDEXES + SERVER-SIDE RPCs
-- ============================================================

-- ===================== INDEXES =====================

CREATE INDEX IF NOT EXISTS idx_leads_store_date ON leads(store_id, date);
CREATE INDEX IF NOT EXISTS idx_leads_store_status ON leads(store_id, status, current_team);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to_user_id, store_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by_user_id, store_id);

CREATE INDEX IF NOT EXISTS idx_orders_store_date ON orders(store_id, order_date);
CREATE INDEX IF NOT EXISTS idx_orders_store_status ON orders(store_id, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_store_deleted ON orders(store_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_transactions_store_date ON transactions(store_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_party ON transactions(party_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id, transaction_type);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_warehouse ON stock_movements(product_id, warehouse_id, movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);

CREATE INDEX IF NOT EXISTS idx_notifications_target_unread ON notifications(target_user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_store ON notifications(store_id, target_user_id);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_store_date ON attendance_records(store_id, date);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_store ON tasks(store_id, status);

CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status, store_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at);

CREATE INDEX IF NOT EXISTS idx_party_transactions_party ON party_transactions(party_id, direction);
CREATE INDEX IF NOT EXISTS idx_party_transactions_store ON party_transactions(store_id, date);

CREATE INDEX IF NOT EXISTS idx_lead_transfers_to_user ON lead_transfers(to_user_id, transferred_at);

CREATE INDEX IF NOT EXISTS idx_product_inventory_reorder ON product_inventory(reorder_required, reorder_level);

-- ===================== RPC: get_dashboard_stats =====================

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_store_id UUID,
  p_date_from TEXT,
  p_date_to TEXT
) RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT user_has_store_access(auth.uid(), p_store_id) THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT json_build_object(
    'leads', (
      SELECT json_build_object(
        'total', COUNT(*)::int,
        'confirmed', COUNT(*) FILTER (WHERE status = 'CONFIRMED' OR order_id IS NOT NULL)::int,
        'cnr', COUNT(*) FILTER (WHERE status = 'CALL_NOT_RECEIVED')::int,
        'followup', COUNT(*) FILTER (WHERE status = 'FOLLOW_UP')::int,
        'cancelled', COUNT(*) FILTER (WHERE status = 'CANCELLED')::int,
        'redirect', COUNT(*) FILTER (WHERE status = 'REDIRECT')::int,
        'new', COUNT(*) FILTER (WHERE status = 'NEW')::int,
        'assigned', COUNT(*) FILTER (WHERE status = 'ASSIGNED')::int,
        'pending_transfer', COUNT(*) FILTER (WHERE assigned_to_user_id IS NULL AND status != 'CONFIRMED' AND order_id IS NULL)::int
      ) FROM leads WHERE store_id = p_store_id AND date >= p_date_from AND date <= p_date_to
    ),
    'orders', (
      SELECT json_build_object(
        'total', COUNT(*)::int,
        'confirmed', COUNT(*) FILTER (WHERE order_status = 'CONFIRMED')::int,
        'dispatched', COUNT(*) FILTER (WHERE order_status = 'DISPATCHED')::int,
        'delivered', COUNT(*) FILTER (WHERE order_status = 'DELIVERED')::int,
        'returned', COUNT(*) FILTER (WHERE order_status = 'RETURNED')::int,
        'cancelled', COUNT(*) FILTER (WHERE order_status = 'CANCELLED')::int,
        'redirect', COUNT(*) FILTER (WHERE order_status = 'REDIRECT')::int,
        'inside_valley', COUNT(*) FILTER (WHERE delivery_location = 'INSIDE_VALLEY' AND order_status IN ('CONFIRMED','DISPATCHED','DELIVERED','PACKED'))::int,
        'outside_valley', COUNT(*) FILTER (WHERE delivery_location = 'OUTSIDE_VALLEY' AND order_status IN ('CONFIRMED','DISPATCHED','DELIVERED','PACKED'))::int,
        'total_sales', COALESCE(SUM(amount) FILTER (WHERE order_status IN ('CONFIRMED','DISPATCHED','DELIVERED','PACKED')), 0)::numeric
      ) FROM orders WHERE store_id = p_store_id AND is_deleted = false
        AND order_date >= (p_date_from || 'T00:00:00+05:45')::timestamptz
        AND order_date <= (p_date_to || 'T23:59:59+05:45')::timestamptz
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- ===================== RPC: get_sidebar_badges =====================

CREATE OR REPLACE FUNCTION public.get_sidebar_badges(
  p_user_id UUID,
  p_store_id UUID,
  p_role TEXT
) RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_notifications INT := 0;
  v_tasks INT := 0;
  v_leads INT := 0;
  v_orders INT := 0;
  v_leave_requests INT := 0;
  v_low_stock INT := 0;
  v_pending_docs INT := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT COUNT(*)::int INTO v_notifications FROM notifications WHERE target_user_id = p_user_id AND read_at IS NULL;
  SELECT COUNT(*)::int INTO v_tasks FROM tasks WHERE assigned_to_user_id = p_user_id AND status IN ('PENDING', 'IN_PROGRESS');

  IF p_role IN ('ADMIN', 'MANAGER', 'OWNER') THEN
    SELECT COUNT(*)::int INTO v_leave_requests FROM leave_requests WHERE status = 'Pending' AND (p_store_id IS NULL OR store_id = p_store_id);
    SELECT COUNT(*)::int INTO v_low_stock FROM product_inventory WHERE reorder_required = true AND reorder_level > 0;
  ELSIF p_role = 'LEADS' AND p_store_id IS NOT NULL THEN
    SELECT COUNT(*)::int INTO v_leads FROM leads WHERE store_id = p_store_id AND current_team = 'LEADS' AND status = 'NEW';
  ELSIF p_role = 'CALLING' AND p_store_id IS NOT NULL THEN
    SELECT COUNT(*)::int INTO v_leads FROM leads WHERE store_id = p_store_id AND assigned_to_user_id = p_user_id AND status IN ('ASSIGNED', 'NEW');
  ELSIF p_role = 'FOLLOWUP' AND p_store_id IS NOT NULL THEN
    SELECT COUNT(*)::int INTO v_orders FROM orders WHERE store_id = p_store_id AND delivery_location = 'OUTSIDE_VALLEY' AND order_status IN ('CONFIRMED', 'PACKED');
  ELSIF p_role = 'HR' THEN
    SELECT COUNT(*)::int INTO v_leave_requests FROM leave_requests WHERE status = 'Pending' AND (p_store_id IS NULL OR store_id = p_store_id);
    SELECT COUNT(*)::int INTO v_pending_docs FROM employee_documents WHERE status = 'PENDING';
  END IF;

  RETURN json_build_object(
    'notifications', v_notifications, 'tasks', v_tasks, 'leads', v_leads,
    'orders', v_orders, 'leave_requests', v_leave_requests,
    'low_stock', v_low_stock, 'pending_docs', v_pending_docs
  );
END;
$$;

-- ===================== RPC: get_party_balances =====================

CREATE OR REPLACE FUNCTION public.get_party_balances(p_store_id UUID)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT user_has_store_access(auth.uid(), p_store_id) THEN RAISE EXCEPTION 'Access denied'; END IF;

  RETURN COALESCE((
    SELECT json_agg(row_data) FROM (
      SELECT p.id, p.name, p.type, p.phone, p.email,
        COALESCE(SUM(pt.amount) FILTER (WHERE pt.direction = 'RECEIVABLE' AND pt.is_settled = false), 0) as receivable,
        COALESCE(SUM(pt.amount) FILTER (WHERE pt.direction = 'PAYABLE' AND pt.is_settled = false), 0) as payable,
        COALESCE(SUM(pt.amount) FILTER (WHERE pt.direction = 'RECEIVABLE' AND pt.is_settled = false), 0)
          - COALESCE(SUM(pt.amount) FILTER (WHERE pt.direction = 'PAYABLE' AND pt.is_settled = false), 0) as net_balance
      FROM parties p LEFT JOIN party_transactions pt ON pt.party_id = p.id
      WHERE p.store_id = p_store_id GROUP BY p.id, p.name, p.type, p.phone, p.email ORDER BY p.name
    ) row_data
  ), '[]'::json);
END;
$$;

-- ===================== RPC: get_accounting_summary =====================

CREATE OR REPLACE FUNCTION public.get_accounting_summary(
  p_store_id UUID, p_date_from TEXT DEFAULT NULL, p_date_to TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT user_has_store_access(auth.uid(), p_store_id) THEN RAISE EXCEPTION 'Access denied'; END IF;

  RETURN json_build_object(
    'total_income', COALESCE((SELECT SUM(amount) FROM transactions WHERE store_id = p_store_id AND transaction_type IN ('INCOME','SALES_OUT','PAYMENT_IN') AND (p_date_from IS NULL OR date >= p_date_from) AND (p_date_to IS NULL OR date <= p_date_to)), 0),
    'total_expense', COALESCE((SELECT SUM(amount) FROM transactions WHERE store_id = p_store_id AND transaction_type IN ('EXPENSE','SALES_IN','PAYMENT_OUT') AND (p_date_from IS NULL OR date >= p_date_from) AND (p_date_to IS NULL OR date <= p_date_to)), 0),
    'total_receivable', COALESCE((SELECT SUM(amount) FROM party_transactions WHERE store_id = p_store_id AND direction = 'RECEIVABLE' AND is_settled = false), 0),
    'total_payable', COALESCE((SELECT SUM(amount) FROM party_transactions WHERE store_id = p_store_id AND direction = 'PAYABLE' AND is_settled = false), 0),
    'account_balances', COALESCE((SELECT SUM(current_balance) FROM accounts WHERE store_id = p_store_id AND is_active = true), 0)
  );
END;
$$;

-- ===================== RPC: get_inventory_summary =====================

CREATE OR REPLACE FUNCTION public.get_inventory_summary(p_store_id UUID)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT user_has_store_access(auth.uid(), p_store_id) THEN RAISE EXCEPTION 'Access denied'; END IF;

  RETURN json_build_object(
    'total_products', (SELECT COUNT(*)::int FROM products WHERE store_id = p_store_id AND is_active = true),
    'total_warehouses', (SELECT COUNT(*)::int FROM warehouses WHERE store_id = p_store_id AND is_active = true),
    'low_stock_count', (SELECT COUNT(*)::int FROM product_inventory pi JOIN products p ON p.id = pi.product_id WHERE p.store_id = p_store_id AND pi.reorder_required = true AND pi.reorder_level > 0),
    'total_stock_value', COALESCE((SELECT SUM(pi.current_stock * COALESCE(p.cost_price, 0)) FROM product_inventory pi JOIN products p ON p.id = pi.product_id WHERE p.store_id = p_store_id AND p.is_active = true), 0)
  );
END;
$$;
