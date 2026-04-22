import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─────────────────────────────────────────────────────────────────────────────
// Staff Performance — on-demand audit module
// Owner Portal → Sales → Staff Performance
// Loads ONLY when "Generate Report" is clicked. Isolated from existing hooks.
// All times use Nepal Time (Asia/Kathmandu, UTC+5:45).
// ─────────────────────────────────────────────────────────────────────────────

export type TeamFilter = 'ALL' | 'CALLING' | 'LOGISTICS';

export interface StaffPerformanceFilters {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  staffIds?: string[];
  teamType: TeamFilter;
  storeId?: string | null;
}

export interface LateOrderDetail {
  order_id: string;
  order_number: number | string | null;
  created_at: string;
  npt_time: string;
}

export interface FollowupIssueDetail {
  lead_id: string;
  client_name: string | null;
  contact_number: string | null;
  next_followup_at: string | null;
  reason: 'NO_TIME' | 'OVERDUE';
}

export interface StatusManipulationDetail {
  order_id: string;
  order_number: number | string | null;
  confirmed_by_name: string | null;
  changed_by_name: string | null;
  final_status: string | null;
  changed_at: string;
}

export interface StaffMetric {
  staff_id: string;
  staff_name: string;

  // A. Late orders (after 4 PM NPT)
  late_orders: number;
  late_orders_detail: LateOrderDetail[];

  // B. Followup issues
  followup_no_time: number;
  followup_overdue: number;
  followup_detail: FollowupIssueDetail[];

  // C. Redirect reasons (parsed from delivery_notes)
  redirect_not_ordered: number;
  redirect_received: number;
  redirect_cancelled: number;
  redirect_other: number;
  redirect_total: number;

  // D. Status manipulation
  confirm_then_changed: number;          // staff confirmed, someone later changed
  status_changes_by_staff: number;       // staff changed someone else's confirmed order
  status_change_detail: StatusManipulationDetail[];
  duplicate_phone_confirms: number;      // same phone confirmed >1 time by this staff
  invalid_phone_confirms: number;        // confirmed orders with invalid phone

  // Positives
  verified_confirms: number;             // confirmed orders that ended DELIVERED
  cancel_after_confirm: number;          // confirmed → CANCELLED/REDIRECT/RTO

  // Score & ranking
  score: number;
  excluded: boolean;
  exclusion_reasons: string[];
}

export interface StaffPerformanceReport {
  generatedAt: string;
  filters: StaffPerformanceFilters;
  staff: StaffMetric[];
  bonusTop3: StaffMetric[];
  excluded: StaffMetric[];
  summary: {
    total_staff: number;
    total_late_orders: number;
    total_followup_issues: number;
    total_redirects: number;
    total_status_manipulations: number;
    total_invalid_phones: number;
    total_duplicate_confirms: number;
  };
}

// Nepal time helpers ─────────────────────────────────────────────────────────
const NPT_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

/** Convert a UTC ISO timestamp to a Nepal Time Date object (shifted). */
function toNpt(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getTime() + NPT_OFFSET_MS);
}

function isAfter4pmNpt(iso: string): boolean {
  const npt = toNpt(iso);
  return npt.getUTCHours() >= 16; // 16:00 NPT or later
}

function formatNptTime(iso: string): string {
  const npt = toNpt(iso);
  const hh = String(npt.getUTCHours()).padStart(2, '0');
  const mm = String(npt.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm} NPT`;
}

const VALID_PHONE_RE = /^(?:\+?977[- ]?)?9[678]\d{8}$/;
function isValidNepalPhone(p: string | null | undefined): boolean {
  if (!p) return false;
  const cleaned = p.replace(/[\s-]/g, '');
  return VALID_PHONE_RE.test(cleaned);
}

function classifyRedirectReason(remark: string | null | undefined):
  'NOT_ORDERED' | 'RECEIVED' | 'CANCELLED' | 'OTHER' {
  if (!remark) return 'OTHER';
  const t = remark.toLowerCase();
  if (t.includes('already received')) return 'RECEIVED';
  if (t.includes('not ordered')) return 'NOT_ORDERED';
  if (t.includes('cancelled') || t.includes('canceled')) return 'CANCELLED';
  return 'OTHER';
}

// Main fetcher ───────────────────────────────────────────────────────────────
async function fetchPerformance(filters: StaffPerformanceFilters): Promise<StaffPerformanceReport> {
  const { startDate, endDate, staffIds, teamType, storeId } = filters;
  const startIso = `${startDate}T00:00:00+05:45`;
  const endIso = `${endDate}T23:59:59+05:45`;

  // 1. Active staff list (profiles)
  let staffQuery = supabase
    .from('profiles')
    .select('id, name, role')
    .eq('is_active', true);
  if (staffIds && staffIds.length > 0) staffQuery = staffQuery.in('id', staffIds);
  const { data: profiles } = await staffQuery;
  const profileMap = new Map<string, { name: string; role: string }>();
  (profiles || []).forEach(p => profileMap.set(p.id, { name: p.name || 'Unknown', role: p.role || '' }));

  // 2. Orders in range (paginated to bypass 1000-row limit)
  async function fetchAllOrders() {
    const PAGE = 1000;
    let from = 0;
    const all: any[] = [];
    while (true) {
      let q = supabase
        .from('orders')
        .select('id, order_number, order_date, created_at, order_status, customer_phone, delivery_notes, created_by_staff_id, store_id, leads:lead_id(contact_number, client_name)')
        .gte('order_date', startIso)
        .lte('order_date', endIso)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE - 1);
      if (storeId) q = q.eq('store_id', storeId);
      const { data, error } = await q;
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return all;
  }
  const orders = await fetchAllOrders();

  // 3. Order status history for orders in range
  const orderIds = orders.map(o => o.id);
  const statusHistory: any[] = [];
  if (orderIds.length > 0) {
    // Chunk to avoid URL length issues
    for (let i = 0; i < orderIds.length; i += 200) {
      const chunk = orderIds.slice(i, i + 200);
      const { data } = await supabase
        .from('order_status_history')
        .select('order_id, previous_status, new_status, changed_by, changed_at')
        .in('order_id', chunk)
        .order('changed_at', { ascending: true });
      if (data) statusHistory.push(...data);
    }
  }

  // 4. Leads in range (for followup issues) - only if CALLING or ALL
  let leads: any[] = [];
  if (teamType === 'ALL' || teamType === 'CALLING') {
    let lq = supabase
      .from('leads')
      .select('id, client_name, contact_number, status, next_followup_at, followup_completed, assigned_to_user_id, first_assigned_to_user_id, store_id')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('status', 'FOLLOW_UP');
    if (storeId) lq = lq.eq('store_id', storeId);
    const { data } = await lq;
    leads = data || [];
  }

  // ─── Build per-staff metrics ───────────────────────────────────────────
  const metrics = new Map<string, StaffMetric>();
  function getOrInit(staffId: string): StaffMetric {
    if (metrics.has(staffId)) return metrics.get(staffId)!;
    const profile = profileMap.get(staffId);
    if (!profile) return null as any;
    const m: StaffMetric = {
      staff_id: staffId,
      staff_name: profile.name,
      late_orders: 0, late_orders_detail: [],
      followup_no_time: 0, followup_overdue: 0, followup_detail: [],
      redirect_not_ordered: 0, redirect_received: 0, redirect_cancelled: 0,
      redirect_other: 0, redirect_total: 0,
      confirm_then_changed: 0, status_changes_by_staff: 0, status_change_detail: [],
      duplicate_phone_confirms: 0, invalid_phone_confirms: 0,
      verified_confirms: 0, cancel_after_confirm: 0,
      score: 0, excluded: false, exclusion_reasons: [],
    };
    metrics.set(staffId, m);
    return m;
  }

  // ── A. Late order creation (after 4 PM NPT) ────────────────────────────
  for (const o of orders) {
    if (!o.created_by_staff_id || !o.created_at) continue;
    if (!profileMap.has(o.created_by_staff_id)) continue;
    if (isAfter4pmNpt(o.created_at)) {
      const m = getOrInit(o.created_by_staff_id);
      if (m) {
        m.late_orders++;
        m.late_orders_detail.push({
          order_id: o.id,
          order_number: o.order_number,
          created_at: o.created_at,
          npt_time: formatNptTime(o.created_at),
        });
      }
    }
  }

  // ── B. Followup issues ─────────────────────────────────────────────────
  const nowMs = Date.now();
  for (const l of leads) {
    const owner = l.assigned_to_user_id || l.first_assigned_to_user_id;
    if (!owner || !profileMap.has(owner)) continue;
    const m = getOrInit(owner);
    if (!m) continue;
    if (!l.next_followup_at) {
      m.followup_no_time++;
      m.followup_detail.push({
        lead_id: l.id, client_name: l.client_name, contact_number: l.contact_number,
        next_followup_at: null, reason: 'NO_TIME',
      });
    } else if (!l.followup_completed && new Date(l.next_followup_at).getTime() < nowMs) {
      m.followup_overdue++;
      m.followup_detail.push({
        lead_id: l.id, client_name: l.client_name, contact_number: l.contact_number,
        next_followup_at: l.next_followup_at, reason: 'OVERDUE',
      });
    }
  }

  // ── C. Redirect reasons (delivery_notes parsing on REDIRECT orders) ────
  for (const o of orders) {
    if (o.order_status !== 'REDIRECT' && o.order_status !== 'REDIRECTED') continue;
    if (!o.created_by_staff_id || !profileMap.has(o.created_by_staff_id)) continue;
    const m = getOrInit(o.created_by_staff_id);
    if (!m) continue;
    const cls = classifyRedirectReason(o.delivery_notes);
    m.redirect_total++;
    if (cls === 'NOT_ORDERED') m.redirect_not_ordered++;
    else if (cls === 'RECEIVED') m.redirect_received++;
    else if (cls === 'CANCELLED') m.redirect_cancelled++;
    else m.redirect_other++;
  }

  // ── D. Status manipulation, duplicates, invalid phones ─────────────────
  const phoneConfirmsByStaff = new Map<string, Map<string, number>>();
  for (const o of orders) {
    const staff = o.created_by_staff_id;
    const phone = o.customer_phone || (o.leads as any)?.contact_number || null;
    const isConfirmedish = ['CONFIRMED', 'DELIVERED', 'DISPATCHED', 'PACKED'].includes(o.order_status || '');

    // Verified confirms (delivered) & cancel-after-confirm
    if (staff && profileMap.has(staff)) {
      const m = getOrInit(staff);
      if (m) {
        if (o.order_status === 'DELIVERED') m.verified_confirms++;
        if (['CANCELLED', 'RETURNED', 'REDIRECT', 'REDIRECTED'].includes(o.order_status || '')) {
          // Only count if it was previously CONFIRMED
          const wasConfirmed = statusHistory.some(h => h.order_id === o.id && h.new_status === 'CONFIRMED');
          if (wasConfirmed) m.cancel_after_confirm++;
        }
        // Invalid phone on confirmed orders
        if (isConfirmedish && !isValidNepalPhone(phone)) {
          m.invalid_phone_confirms++;
        }
        // Track phone-confirm counts
        if (isConfirmedish && phone) {
          if (!phoneConfirmsByStaff.has(staff)) phoneConfirmsByStaff.set(staff, new Map());
          const pmap = phoneConfirmsByStaff.get(staff)!;
          pmap.set(phone, (pmap.get(phone) || 0) + 1);
        }
      }
    }
  }

  // Duplicate phone confirms
  phoneConfirmsByStaff.forEach((pmap, staffId) => {
    const m = metrics.get(staffId);
    if (!m) return;
    pmap.forEach(count => { if (count > 1) m.duplicate_phone_confirms += (count - 1); });
  });

  // Status manipulation: orders confirmed by X, then status changed by Y
  // Walk history: find earliest CONFIRMED (with changed_by = confirmer), then any later change by different user.
  const historyByOrder = new Map<string, any[]>();
  statusHistory.forEach(h => {
    if (!historyByOrder.has(h.order_id)) historyByOrder.set(h.order_id, []);
    historyByOrder.get(h.order_id)!.push(h);
  });

  historyByOrder.forEach((events, orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const confirmEvent = events.find(e => e.new_status === 'CONFIRMED');
    if (!confirmEvent || !confirmEvent.changed_by) return;
    const confirmer = confirmEvent.changed_by;
    const laterChanges = events.filter(e =>
      new Date(e.changed_at) > new Date(confirmEvent.changed_at)
      && e.changed_by
      && e.changed_by !== confirmer
      && e.new_status !== 'CONFIRMED'
    );
    if (laterChanges.length === 0) return;
    const final = laterChanges[laterChanges.length - 1];

    if (profileMap.has(confirmer)) {
      const mC = getOrInit(confirmer);
      if (mC) {
        mC.confirm_then_changed++;
        mC.status_change_detail.push({
          order_id: orderId,
          order_number: order.order_number,
          confirmed_by_name: profileMap.get(confirmer)?.name || 'Unknown',
          changed_by_name: profileMap.get(final.changed_by)?.name || 'Unknown',
          final_status: final.new_status,
          changed_at: final.changed_at,
        });
      }
    }
    if (profileMap.has(final.changed_by)) {
      const mF = getOrInit(final.changed_by);
      if (mF) mF.status_changes_by_staff++;
    }
  });

  // ─── Scoring ──────────────────────────────────────────────────────────
  const allStaff = Array.from(metrics.values());
  for (const m of allStaff) {
    m.score =
      m.verified_confirms * 1
      + m.cancel_after_confirm * -0.5
      + m.duplicate_phone_confirms * -1
      + m.invalid_phone_confirms * -1
      + (m.followup_no_time + m.followup_overdue) * -0.3
      + m.late_orders * -0.2;

    // Exclusion thresholds
    const reasons: string[] = [];
    if (m.duplicate_phone_confirms >= 3) reasons.push(`${m.duplicate_phone_confirms} duplicate phone confirms`);
    if (m.invalid_phone_confirms >= 3) reasons.push(`${m.invalid_phone_confirms} invalid phone entries`);
    if (m.cancel_after_confirm >= 5) reasons.push(`${m.cancel_after_confirm} orders cancelled after confirm`);
    if (m.followup_no_time + m.followup_overdue >= 8) reasons.push(`${m.followup_no_time + m.followup_overdue} followup issues`);
    if (m.late_orders >= 10) reasons.push(`${m.late_orders} late orders (after 4 PM)`);
    m.exclusion_reasons = reasons;
    m.excluded = reasons.length > 0;
  }

  // Sort by score desc
  allStaff.sort((a, b) => b.score - a.score);

  // Bonus: top 3 from top 5, excluding flagged
  const top5 = allStaff.slice(0, 5);
  const bonusTop3 = top5.filter(s => !s.excluded).slice(0, 3);
  const excluded = allStaff.filter(s => s.excluded);

  // Summary
  const summary = {
    total_staff: allStaff.length,
    total_late_orders: allStaff.reduce((s, m) => s + m.late_orders, 0),
    total_followup_issues: allStaff.reduce((s, m) => s + m.followup_no_time + m.followup_overdue, 0),
    total_redirects: allStaff.reduce((s, m) => s + m.redirect_total, 0),
    total_status_manipulations: allStaff.reduce((s, m) => s + m.confirm_then_changed, 0),
    total_invalid_phones: allStaff.reduce((s, m) => s + m.invalid_phone_confirms, 0),
    total_duplicate_confirms: allStaff.reduce((s, m) => s + m.duplicate_phone_confirms, 0),
  };

  return {
    generatedAt: new Date().toISOString(),
    filters,
    staff: allStaff,
    bonusTop3,
    excluded,
    summary,
  };
}

export function useStaffPerformance() {
  return useMutation({ mutationFn: (filters: StaffPerformanceFilters) => fetchPerformance(filters) });
}
