// Shared PDF rendering + data-fetching logic for Employee Monthly Performance Report.
// Used by both:
//   - Bulk export ("By Employee (All Staff)")
//   - Individual employee export from HRMEmployeeDetail
// Both paths MUST use the exact same code so output matches 1:1.

import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type Rating = 'Excellent' | 'Good' | 'Medium' | 'Low' | 'No Rating';

export interface EmployeeMonthData {
  employeeId: string;
  fullName: string;
  position: string;
  department: string;
  attendanceRating: Rating;
  attendanceScore: number;
  salesRating: Rating;
  salesScore: number;
  taskRating: Rating;
  taskScore: number;
  totalScore: number;
  maxScore: number;
  overallRating: Rating;
  present: number;
  late: number;
  absent: number;
  leave: number;
  workingDays: number;
  totalLateMinutes: number;
  attendanceRate: number;
  totalLeads: number;
  confirmedOrders: number;
  vdNotDeliver: number;
  effectiveOrders: number;
  conversionRate: number;
  totalSales: number;
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  overdueTasks: number;
  duePercent: number;
  dailyTotal: number;
  dailyDone: number;
  dailyNotDone: number;
  dailyNotSubmitted: number;
  dailyRemarks: string[];
  dailyRating: Rating;
  scoredTaskTotal: number;
  scoredTaskIssues: number;
  scoredTaskDuePercent: number;
  promotionSuggestion: string;
}

export function getOverallRating(totalScore: number, maxScore: number): Rating {
  if (maxScore === 0) return 'No Rating';
  const pct = (totalScore / maxScore) * 100;
  if (pct >= 85) return 'Excellent';
  if (pct >= 65) return 'Good';
  if (pct >= 45) return 'Medium';
  return 'Low';
}

function getAttendanceRating(present: number, late: number, absent: number, workingDays: number): { rating: Rating; score: number } {
  if (workingDays === 0 || (present === 0 && late === 0 && absent === 0)) return { rating: 'No Rating', score: 0 };
  const rate = (present / workingDays) * 100;
  if (rate >= 95) return { rating: 'Excellent', score: 30 };
  if (rate >= 90) return { rating: 'Good', score: 20 };
  return { rating: 'Low', score: 10 };
}

function getSalesRating(conversionRate: number, hasData: boolean): { rating: Rating; score: number } {
  if (!hasData) return { rating: 'No Rating', score: 0 };
  if (conversionRate >= 60) return { rating: 'Excellent', score: 40 };
  if (conversionRate >= 50) return { rating: 'Good', score: 30 };
  if (conversionRate >= 40) return { rating: 'Medium', score: 20 };
  return { rating: 'Low', score: 10 };
}

function getTaskRating(overdueTasks: number, totalTasks: number): { rating: Rating; score: number } {
  if (totalTasks === 0) return { rating: 'No Rating', score: 0 };
  if (overdueTasks === 0) return { rating: 'Excellent', score: 30 };
  const duePct = (overdueTasks / totalTasks) * 100;
  if (duePct <= 10) return { rating: 'Medium', score: 20 };
  return { rating: 'Low', score: 10 };
}

function getDailyRating(done: number, total: number): Rating {
  if (total === 0) return 'No Rating';
  const pct = (done / total) * 100;
  if (pct >= 95) return 'Excellent';
  if (pct >= 80) return 'Good';
  if (pct >= 60) return 'Medium';
  return 'Low';
}

export async function fetchMonthDataForAllEmployees(
  employees: { id: string; user_id: string | null; full_name: string; position: string | null; department: string; department_id?: string | null }[],
  dateFrom: string,
  dateTo: string
): Promise<EmployeeMonthData[]> {
  const empIds = employees.map(e => e.id);
  const userIds = employees.map(e => e.user_id).filter(Boolean) as string[];

  const fetchPaged = async <T,>(build: (from: number, to: number) => any): Promise<T[]> => {
    const all: T[] = [];
    const PAGE = 1000;
    let page = 0;
    while (true) {
      const { data, error } = await build(page * PAGE, (page + 1) * PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...(data as T[]));
      if (data.length < PAGE) break;
      page++;
    }
    return all;
  };

  const [attResult, taskData, transferData, orderData, dailyTasksRes, dailySubsRes, profilesRes] = await Promise.all([
    supabase
      .from('attendance_records')
      .select('employee_id, status, late_minutes')
      .in('employee_id', empIds)
      .gte('date', dateFrom)
      .lte('date', dateTo),
    fetchPaged<any>((from, to) => supabase
      .from('tasks')
      .select('assigned_to_user_id, status, due_date, completed_date')
      .in('assigned_to_user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('due_date', dateFrom)
      .lte('due_date', dateTo)
      .range(from, to)),
    fetchPaged<any>((from, to) => supabase
      .from('lead_transfers')
      .select('to_user_id, id')
      .in('to_user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('transferred_at', `${dateFrom}T00:00:00+05:45`)
      .lte('transferred_at', `${dateTo}T23:59:59+05:45`)
      .range(from, to)),
    fetchPaged<any>((from, to) => supabase
      .from('orders')
      .select('sales_person_id, amount, order_status, delivery_location, inside_delivery_status')
      .eq('is_deleted', false)
      .in('sales_person_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('order_date', `${dateFrom}T00:00:00`)
      .lte('order_date', `${dateTo}T23:59:59`)
      .range(from, to)),
    supabase.from('daily_checkout_tasks' as any).select('*').eq('is_active', true),
    fetchPaged<any>((from, to) => supabase
      .from('daily_task_submissions' as any)
      .select('daily_task_id, staff_id, submission_date, task_date, is_done, remark')
      .in('staff_id', empIds)
      .gte('submission_date', dateFrom)
      .lte('submission_date', dateTo)
      .range(from, to)),
    userIds.length ? supabase.from('profiles').select('id, role').in('id', userIds) : Promise.resolve({ data: [] as any[] }),
  ]);

  const attData = attResult.data || [];
  const dailyTasksAll = (dailyTasksRes.data || []) as any[];
  const dailySubs = (dailySubsRes || []) as any[];
  const profiles = ((profilesRes as any).data || []) as any[];
  const roleByUserId: Record<string, string> = {};
  profiles.forEach(p => { roleByUserId[p.id] = p.role; });

  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = format(new Date(), 'yyyy-MM-dd');
  const effectiveTo = dateTo > today ? today : dateTo;
  let days: Date[] = [];
  try { days = eachDayOfInterval({ start: parseISO(dateFrom), end: parseISO(effectiveTo) }); } catch { days = []; }
  const subKey = new Map<string, { is_done: boolean; remark: string | null }>();
  dailySubs.forEach(s => {
    const dateKey = s.task_date || s.submission_date;
    if (!dateKey) return;
    subKey.set(`${dateKey}|${s.daily_task_id}|${s.staff_id}`, { is_done: !!s.is_done, remark: s.remark || null });
  });

  const dailyByEmp = new Map<string, { done: number; notDone: number; notSubmitted: number; remarks: string[] }>();
  const activeEmps = employees;
  days.forEach(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const dow = DOW[d.getDay()];
    dailyTasksAll.forEach(task => {
      const createdDate = task.created_at ? String(task.created_at).slice(0, 10) : null;
      if (createdDate && dateStr < createdDate) return;
      if (task.frequency === 'daily') { /* ok */ }
      else if (task.frequency === 'specific_date') { if (task.specific_date !== dateStr) return; }
      else if (task.frequency === 'weekdays') {
        const selected = task.selected_weekdays || [];
        const dayNum = d.getDay();
        const matchWeekday = selected.some((v: any) => String(v) === dow || Number(v) === dayNum || String(v) === String(dayNum));
        if (!matchWeekday) return;
      } else return;

      let targets: typeof activeEmps = [];
      if (task.assigned_staff_id) {
        const emp = activeEmps.find(e => e.id === task.assigned_staff_id);
        if (emp) targets = [emp];
      } else if (task.target_role && task.department_id) {
        targets = activeEmps.filter(e =>
          e.department_id === task.department_id &&
          e.user_id && roleByUserId[e.user_id] === task.target_role
        );
      } else if (task.target_role) {
        targets = activeEmps.filter(e => e.user_id && roleByUserId[e.user_id] === task.target_role);
      } else if (task.department_id) {
        targets = activeEmps.filter(e => e.department_id === task.department_id);
      }
      targets.forEach(emp => {
        const cur = dailyByEmp.get(emp.id) || { done: 0, notDone: 0, notSubmitted: 0, remarks: [] };
        const sub = subKey.get(`${dateStr}|${task.id}|${emp.id}`);
        if (!sub) cur.notSubmitted++;
        else if (sub.is_done) cur.done++;
        else {
          cur.notDone++;
          if (sub.remark?.trim()) cur.remarks.push(`${task.title}: ${sub.remark.trim()}`);
        }
        dailyByEmp.set(emp.id, cur);
      });
    });
  });

  const attByEmp = new Map<string, typeof attData>();
  attData.forEach(r => {
    const arr = attByEmp.get(r.employee_id) || [];
    arr.push(r);
    attByEmp.set(r.employee_id, arr);
  });

  const tasksByUser = new Map<string, typeof taskData>();
  taskData.forEach(t => {
    if (!t.assigned_to_user_id) return;
    const arr = tasksByUser.get(t.assigned_to_user_id) || [];
    arr.push(t);
    tasksByUser.set(t.assigned_to_user_id, arr);
  });

  const transfersByUser = new Map<string, number>();
  transferData.forEach(t => {
    transfersByUser.set(t.to_user_id, (transfersByUser.get(t.to_user_id) || 0) + 1);
  });

  const ordersByUser = new Map<string, typeof orderData>();
  orderData.forEach(o => {
    if (!o.sales_person_id) return;
    const arr = ordersByUser.get(o.sales_person_id) || [];
    arr.push(o);
    ordersByUser.set(o.sales_person_id, arr);
  });

  // Working days = all days in the report period EXCLUDING Saturdays (weekly off).
  // Holidays are still counted as working days per policy request.
  let periodDays: Date[] = [];
  try { periodDays = eachDayOfInterval({ start: parseISO(dateFrom), end: parseISO(dateTo) }); } catch { periodDays = []; }
  const workingDaysInPeriod = periodDays.filter(d => d.getDay() !== 6).length;

  return employees.map(emp => {
    const att = attByEmp.get(emp.id) || [];
    const present = att.filter(r => ['Present', 'Work From Home', 'Late'].includes(r.status)).length;
    const late = att.filter(r => r.status === 'Late').length;
    const absent = att.filter(r => r.status === 'Absent').length;
    const leave = att.filter(r => r.status === 'Leave').length;
    const totalLateMinutes = att.reduce((s, r) => s + ((r as any).late_minutes || 0), 0);
    const workingDays = workingDaysInPeriod;
    const attendanceRate = workingDays > 0 ? (present / workingDays) * 100 : 0;
    const { rating: attendanceRating, score: attendanceScore } = getAttendanceRating(present, late, absent, workingDays);

    const totalLeads = emp.user_id ? (transfersByUser.get(emp.user_id) || 0) : 0;
    const orders = emp.user_id ? (ordersByUser.get(emp.user_id) || []) : [];
    let confirmedOrders = 0;
    let vdNotDeliver = 0;
    let totalSales = 0;
    orders.forEach(order => {
      if (['DELIVERED', 'DISPATCHED', 'CONFIRMED'].includes(order.order_status)) {
        confirmedOrders++;
        totalSales += order.amount || 0;
        const isValley = order.delivery_location === 'INSIDE_VALLEY';
        const isNotDelivered = order.inside_delivery_status !== 'DELIVERED';
        if (isValley && isNotDelivered) vdNotDeliver++;
      }
    });
    const effectiveOrders = confirmedOrders - vdNotDeliver;
    const conversionRate = totalLeads > 0 ? (effectiveOrders / totalLeads) * 100 : 0;
    const hasSalesData = totalLeads > 0 && conversionRate > 0;
    const { rating: salesRating, score: salesScore } = getSalesRating(conversionRate, hasSalesData);

    const tasks = emp.user_id ? (tasksByUser.get(emp.user_id) || []) : [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const onTimeTasks = tasks.filter(t => {
      if (t.status !== 'COMPLETED' || !t.completed_date) return false;
      return new Date(t.completed_date) <= new Date(t.due_date);
    }).length;
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'COMPLETED' && t.completed_date) {
        return new Date(t.completed_date) > new Date(t.due_date);
      }
      return t.status !== 'COMPLETED' && new Date(t.due_date) < new Date();
    }).length;
    const regularDuePercent = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;

    const daily = dailyByEmp.get(emp.id) || { done: 0, notDone: 0, notSubmitted: 0, remarks: [] };
    const dailyTotal = daily.done + daily.notDone + daily.notSubmitted;
    const scoredTaskTotal = totalTasks + dailyTotal;
    const scoredTaskIssues = overdueTasks + daily.notDone + daily.notSubmitted;
    const scoredTaskDuePercent = scoredTaskTotal > 0 ? (scoredTaskIssues / scoredTaskTotal) * 100 : 0;
    const { rating: taskRating, score: taskScore } = getTaskRating(scoredTaskIssues, scoredTaskTotal);
    const dailyRating = getDailyRating(daily.done, dailyTotal);

    const maxScore = (attendanceRating !== 'No Rating' ? 30 : 0) + (salesRating !== 'No Rating' ? 40 : 0) + (taskRating !== 'No Rating' ? 30 : 0);
    const totalScore = attendanceScore + salesScore + taskScore;
    const overallRating = getOverallRating(totalScore, maxScore);

    const ratedCats = [
      ...(attendanceRating !== 'No Rating' ? [attendanceRating] : []),
      ...(salesRating !== 'No Rating' ? [salesRating] : []),
      ...(taskRating !== 'No Rating' ? [taskRating] : []),
    ];
    const goodCount = ratedCats.filter(r => r === 'Excellent' || r === 'Good').length;
    const hasLow = ratedCats.includes('Low');
    let promotionSuggestion: string;
    if (ratedCats.length === 0) promotionSuggestion = 'Insufficient Data';
    else if (goodCount === ratedCats.length) promotionSuggestion = 'Highly Recommended';
    else if (goodCount >= 2 && !hasLow) promotionSuggestion = 'Recommended';
    else promotionSuggestion = 'Not Recommended';

    return {
      employeeId: emp.id,
      fullName: emp.full_name,
      position: emp.position || '-',
      department: emp.department,
      attendanceRating, attendanceScore,
      salesRating, salesScore,
      taskRating, taskScore,
      totalScore, maxScore, overallRating,
      present, late, absent, leave, workingDays, totalLateMinutes, attendanceRate,
      totalLeads, confirmedOrders, vdNotDeliver, effectiveOrders, conversionRate, totalSales,
      totalTasks, completedTasks, onTimeTasks, overdueTasks, duePercent: regularDuePercent,
      dailyTotal, dailyDone: daily.done, dailyNotDone: daily.notDone, dailyNotSubmitted: daily.notSubmitted,
      dailyRemarks: daily.remarks, dailyRating,
      scoredTaskTotal, scoredTaskIssues, scoredTaskDuePercent,
      promotionSuggestion,
    };
  });
}

export const RATING_COLOR = (r: string): [number, number, number] => {
  if (r === 'Excellent') return [22, 163, 74];
  if (r === 'Good') return [37, 99, 235];
  if (r === 'Medium') return [234, 179, 8];
  if (r === 'No Rating') return [148, 163, 184];
  return [220, 38, 38];
};

export function renderCompanyHeader(doc: jsPDF, companyInfo: any, title: string, subtitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 10;
  doc.setFillColor(245, 247, 250);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text(companyInfo?.company_name || 'Company', pageWidth / 2, y + 4, { align: 'center' });
  y += 9;
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  const parts = [companyInfo?.address, companyInfo?.phone, companyInfo?.email, companyInfo?.registration_no ? `Reg: ${companyInfo.registration_no}` : ''].filter(Boolean);
  doc.text(parts.join('  |  '), pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y + 1, pageWidth - 14, y + 1);
  y += 6;
  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  doc.text(subtitle, pageWidth / 2, y, { align: 'center' });
  y += 6;
  return y;
}

// Render one employee's full-page report. Tuned to fit ONE A4 page.
export function renderEmployeePage(doc: jsPDF, emp: EmployeeMonthData, monthLabel: string, trend: EmployeeMonthData[], trendLabels: string[], companyInfo: any) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = { left: 14, right: 14 };
  const lightHead = { fillColor: [241, 245, 249] as [number, number, number], textColor: [30, 41, 59] as [number, number, number], fontStyle: 'bold' as const, fontSize: 8, cellPadding: 1.5 };
  const lightBody = { fontSize: 8, textColor: [51, 65, 85] as [number, number, number], cellPadding: 1.5 };
  const gap = 4;

  let y = renderCompanyHeader(doc, companyInfo, 'Employee Monthly Performance Report', `Report Period: ${monthLabel}`);

  // Staff info
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text(`Staff: ${emp.fullName}`, margin.left, y);
  doc.text(`Position: ${emp.position}`, pageWidth / 2, y);
  y += 6;

  // Overall Score
  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold');
  doc.text('Overall Performance Score', margin.left, y); y += 1.5;
  const promoColor: [number, number, number] =
    emp.promotionSuggestion === 'Highly Recommended' ? [22, 163, 74] :
    emp.promotionSuggestion === 'Recommended' ? [37, 99, 235] :
    emp.promotionSuggestion === 'Insufficient Data' ? [148, 163, 184] : [220, 38, 38];

  autoTable(doc, {
    startY: y, theme: 'grid', headStyles: lightHead, styles: lightBody,
    head: [['Category', 'Rating', 'Score', `Total (/${emp.maxScore || 'N/A'})`, 'Promotion']],
    body: [
      [emp.attendanceRating === 'No Rating' ? 'Attendance (N/A)' : 'Attendance (30)', emp.attendanceRating, emp.attendanceRating === 'No Rating' ? '-' : `${emp.attendanceScore}/30`, '', ''],
      [emp.salesRating === 'No Rating' ? 'Sales (N/A)' : 'Sales (40)', emp.salesRating, emp.salesRating === 'No Rating' ? '-' : `${emp.salesScore}/40`, '', ''],
      [emp.taskRating === 'No Rating' ? 'Tasks incl. Daily (N/A)' : 'Tasks incl. Daily (30)', emp.taskRating, emp.taskRating === 'No Rating' ? '-' : `${emp.taskScore}/30`, '', ''],
    ],
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 1) { data.cell.styles.textColor = RATING_COLOR(data.cell.raw); data.cell.styles.fontStyle = 'bold'; }
      if (data.section === 'body' && data.row.index === 0 && data.column.index === 3) { data.cell.text = [`${emp.totalScore}/${emp.maxScore}`]; data.cell.styles.fontStyle = 'bold'; }
      if (data.section === 'body' && data.row.index === 0 && data.column.index === 4) { data.cell.text = [emp.promotionSuggestion]; data.cell.styles.textColor = promoColor; data.cell.styles.fontStyle = 'bold'; }
    },
    margin,
  });
  y = (doc as any).lastAutoTable.finalY + gap;

  // Attendance
  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text('Attendance Summary', margin.left, y); y += 1.5;
  const lateHours = Math.floor(emp.totalLateMinutes / 60);
  const lateMins = emp.totalLateMinutes % 60;
  autoTable(doc, {
    startY: y, theme: 'grid', headStyles: lightHead, styles: lightBody,
    head: [['Working Days', 'Present', 'Late', 'Absent', 'Leave', 'Att %', 'Total Late', 'Rating']],
    body: [[emp.workingDays, emp.present, emp.late, emp.absent, emp.leave, `${emp.attendanceRate.toFixed(1)}%`, `${lateHours}h ${lateMins}m`, emp.attendanceRating]],
    didParseCell: (data: any) => { if (data.section === 'body' && data.column.index === 7) { data.cell.styles.textColor = RATING_COLOR(data.cell.raw); data.cell.styles.fontStyle = 'bold'; } },
    margin,
  });
  y = (doc as any).lastAutoTable.finalY + gap;

  // Sales
  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text('Sales Performance', margin.left, y); y += 1.5;
  autoTable(doc, {
    startY: y, theme: 'grid', headStyles: lightHead, styles: lightBody,
    head: [['Total Leads', 'Confirmed', 'VD Not Dlvr', 'Effective', 'Conv %', 'Sales (Rs.)', 'Rating']],
    body: [[emp.totalLeads, emp.confirmedOrders, emp.vdNotDeliver, emp.effectiveOrders, `${emp.conversionRate.toFixed(1)}%`, `Rs.${emp.totalSales.toLocaleString()}`, emp.salesRating]],
    didParseCell: (data: any) => { if (data.section === 'body' && data.column.index === 6) { data.cell.styles.textColor = RATING_COLOR(data.cell.raw); data.cell.styles.fontStyle = 'bold'; } },
    margin,
  });
  y = (doc as any).lastAutoTable.finalY + gap;

  // Tasks
  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text('Task Summary', margin.left, y); y += 1.5;
  autoTable(doc, {
    startY: y, theme: 'grid', headStyles: lightHead, styles: lightBody,
    head: [['Regular Tasks', 'Completed', 'On Time', 'Overdue', 'Regular Due %', 'Scored Total', 'Scored Issues', 'Rating']],
    body: [[emp.totalTasks, emp.completedTasks, emp.onTimeTasks, emp.overdueTasks, `${emp.duePercent.toFixed(1)}%`, emp.scoredTaskTotal, emp.scoredTaskIssues, emp.taskRating]],
    didParseCell: (data: any) => { if (data.section === 'body' && data.column.index === 7) { data.cell.styles.textColor = RATING_COLOR(data.cell.raw); data.cell.styles.fontStyle = 'bold'; } },
    margin,
  });
  y = (doc as any).lastAutoTable.finalY + gap;

  // Daily Task Summary (with Rating column)
  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text('Daily Task Summary', margin.left, y); y += 1.5;
  const dailyCompletionPct = emp.dailyTotal > 0 ? ((emp.dailyDone / emp.dailyTotal) * 100).toFixed(1) : '0.0';
  autoTable(doc, {
    startY: y, theme: 'grid', headStyles: lightHead, styles: lightBody,
    head: [['Total', 'Done', 'Not Done', 'Not Submitted', 'Completion %', 'Rating']],
    body: [[emp.dailyTotal, emp.dailyDone, emp.dailyNotDone, emp.dailyNotSubmitted, `${dailyCompletionPct}%`, emp.dailyRating]],
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        if (data.column.index === 1) data.cell.styles.textColor = [22, 163, 74];
        if (data.column.index === 2) data.cell.styles.textColor = [234, 88, 12];
        if (data.column.index === 3) data.cell.styles.textColor = [220, 38, 38];
        if (data.column.index === 5) { data.cell.styles.textColor = RATING_COLOR(data.cell.raw); data.cell.styles.fontStyle = 'bold'; }
      }
    },
    margin,
  });
  y = (doc as any).lastAutoTable.finalY + gap;

  // 3-month trend
  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text('3-Month Performance Trend', margin.left, y); y += 1.5;
  const ratingOrder: Record<string, number> = { 'Low': 1, 'Medium': 2, 'Good': 3, 'Excellent': 4, 'No Rating': 0 };
  const rated = trend.filter(m => m.overallRating !== 'No Rating');
  let trendWord = '—';
  if (rated.length >= 2) {
    const vals = rated.map(m => ratingOrder[m.overallRating] || 0);
    const first = vals[0]; const last = vals[vals.length - 1];
    if (last > first) trendWord = '↑ Up';
    else if (last < first) trendWord = '↓ Down';
    else trendWord = '→ Stable';
  }
  let trendRemark = 'No rating data available for trend analysis.';
  if (rated.length >= 2) {
    const vals = rated.map(m => ratingOrder[m.overallRating] || 0);
    const first = vals[0]; const last = vals[vals.length - 1];
    const allSame = vals.every(v => v === first);
    const allHigh = rated.every(m => m.overallRating === 'Excellent' || m.overallRating === 'Good');
    const allLow = rated.every(m => m.overallRating === 'Low');
    if (allSame && allHigh) trendRemark = 'Consistently Excellent/Good — Maintain this standard.';
    else if (allSame && allLow) trendRemark = 'Consistently Low — Urgent improvement plan needed.';
    else if (allSame) trendRemark = `Consistently ${rated[0].overallRating} — Stable performance.`;
    else if (last > first) trendRemark = 'Upgrading — Performance is improving. Keep it up!';
    else if (last < first) trendRemark = 'Downgrading — Performance is declining. Needs attention.';
    else trendRemark = 'Fluctuating — Inconsistent performance. Needs stability.';
  } else if (rated.length === 1) {
    trendRemark = 'Insufficient trend data (only 1 month with ratings).';
  }
  const pct = (m: EmployeeMonthData) => m.maxScore > 0 ? Math.round((m.totalScore / m.maxScore) * 100) : 0;
  autoTable(doc, {
    startY: y, theme: 'grid',
    headStyles: { ...lightHead, halign: 'center' as const, fontSize: 8.5 },
    styles: { ...lightBody, halign: 'center' as const, fontSize: 8.5 },
    head: [['', trendLabels[0], trendLabels[1], trendLabels[2], 'Trend']],
    body: [['Score', `${trend[0].overallRating}(${pct(trend[0])}%)`, `${trend[1].overallRating}(${pct(trend[1])}%)`, `${trend[2].overallRating}(${pct(trend[2])}%)`, trendWord]],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 22 }, 4: { cellWidth: 24 } },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index >= 1 && data.column.index <= 3) {
        const rating = trend[data.column.index - 1].overallRating;
        data.cell.styles.textColor = RATING_COLOR(rating); data.cell.styles.fontStyle = 'bold';
      }
      if (data.section === 'body' && data.column.index === 4) {
        if (trendWord.includes('Up')) data.cell.styles.textColor = [22, 163, 74];
        else if (trendWord.includes('Down')) data.cell.styles.textColor = [220, 38, 38];
        else data.cell.styles.textColor = [37, 99, 235];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin,
  });
  y = (doc as any).lastAutoTable.finalY + 1.5;

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text('Trend — ', margin.left, y);
  const trendLabelW = doc.getTextWidth('Trend — ');
  doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  doc.text(trendRemark, margin.left + trendLabelW, y);
  y += 5;

  // Remarks
  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
  doc.text('Remarks & Observations', margin.left, y); y += 3;
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
  const remarks: string[] = [];
  if (emp.attendanceRating === 'No Rating') remarks.push('- Attendance: No data. Excluded from score.');
  else if (emp.attendanceRating === 'Excellent') remarks.push('- Attendance: Excellent presence. Keep it up!');
  else if (emp.attendanceRating === 'Good') remarks.push(`- Attendance: Good (${emp.attendanceRate.toFixed(1)}%), ${lateHours}h ${lateMins}m late.`);
  else remarks.push(`- Attendance: Low (${emp.attendanceRate.toFixed(1)}%). Counseling recommended.`);
  if (emp.salesRating === 'No Rating') remarks.push('- Sales: No data. Excluded from score.');
  else if (emp.salesRating === 'Excellent') remarks.push(`- Sales: Outstanding ${emp.conversionRate.toFixed(1)}% conversion.`);
  else if (emp.salesRating === 'Good') remarks.push(`- Sales: Good ${emp.conversionRate.toFixed(1)}%. Push to 60%+.`);
  else if (emp.salesRating === 'Medium') remarks.push(`- Sales: Average ${emp.conversionRate.toFixed(1)}%. Needs improvement.`);
  else remarks.push(`- Sales: Low ${emp.conversionRate.toFixed(1)}%. Coaching required.`);
  if (emp.taskRating === 'No Rating') remarks.push('- Tasks: No regular/daily task data. Excluded from score.');
  else if (emp.taskRating === 'Excellent') remarks.push('- Tasks: Regular and daily tasks are on track. Excellent management.');
  else if (emp.taskRating === 'Medium') remarks.push(`- Tasks: ${emp.scoredTaskDuePercent.toFixed(0)}% scored task issues including daily task not done/not submitted. Improve time mgmt.`);
  else remarks.push(`- Tasks: ${emp.scoredTaskIssues}/${emp.scoredTaskTotal} scored task issues including daily task pending/not done. Major improvement needed.`);
  if (emp.dailyTotal > 0) {
    const dailyPct = ((emp.dailyDone / emp.dailyTotal) * 100).toFixed(1);
    remarks.push(`- Daily Tasks: Total ${emp.dailyTotal}, Done ${emp.dailyDone}, Not Done ${emp.dailyNotDone}, Not Submitted ${emp.dailyNotSubmitted}, Completion ${dailyPct}%. Counted in Tasks score.`);
    emp.dailyRemarks.slice(0, 3).forEach(r => remarks.push(`  • ${r}`));
    if (emp.dailyRemarks.length > 3) remarks.push(`  • ${emp.dailyRemarks.length - 3} more Not Done remark(s).`);
  } else {
    remarks.push('- Daily Tasks: No daily task assignment found for this month.');
  }
  remarks.push(`- Trend: ${trendRemark}`);
  if (emp.promotionSuggestion === 'Highly Recommended') remarks.push('PROMOTION: Highly recommended based on outstanding performance.');
  else if (emp.promotionSuggestion === 'Recommended') remarks.push('PROMOTION: Recommended for consideration.');
  else if (emp.promotionSuggestion === 'Insufficient Data') remarks.push('PROMOTION: Insufficient data to evaluate.');
  else remarks.push('PROMOTION: Not recommended. Improvement needed.');

  const maxTextWidth = pageWidth - (margin.left * 2) - 4;
  const sigReserve = 22; // space needed for signature + footer
  remarks.forEach(r => {
    if (y > pageHeight - sigReserve - 4) return; // stop drawing to keep 1 page
    const lines = doc.splitTextToSize(r, maxTextWidth);
    doc.text(lines, margin.left + 2, y);
    y += lines.length * 3.2;
  });

  // Signature — always on same page
  const sigY = pageHeight - 16;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin.left, sigY, 74, sigY);
  doc.line(pageWidth - 74, sigY, pageWidth - margin.left, sigY);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  doc.text('Employee Signature', margin.left, sigY + 4);
  doc.text('Manager Signature', pageWidth - 74, sigY + 4);

  // Footer
  doc.setFontSize(6.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(148, 163, 184);
  doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy hh:mm a')} | ${companyInfo?.company_name || ''}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
}
