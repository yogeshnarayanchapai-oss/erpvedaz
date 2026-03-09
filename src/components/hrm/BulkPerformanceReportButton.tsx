import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

type Rating = 'Excellent' | 'Good' | 'Medium' | 'Low' | 'No Rating';

interface EmployeeMonthData {
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
}

function getOverallRating(totalScore: number, maxScore: number): Rating {
  if (maxScore === 0) return 'No Rating';
  const pct = (totalScore / maxScore) * 100;
  if (pct >= 90) return 'Excellent';
  if (pct >= 70) return 'Good';
  if (pct >= 50) return 'Medium';
  return 'Low';
}

function getAttendanceRating(present: number, workingDays: number, hasData: boolean): { rating: Rating; score: number } {
  if (!hasData || workingDays === 0) return { rating: 'No Rating', score: 0 };
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

async function fetchMonthDataForAllEmployees(
  employees: { id: string; user_id: string | null; full_name: string; position: string | null; department: string }[],
  dateFrom: string,
  dateTo: string
): Promise<EmployeeMonthData[]> {
  // Fetch all attendance records for the month
  const empIds = employees.map(e => e.id);
  const userIds = employees.map(e => e.user_id).filter(Boolean) as string[];

  const [attResult, taskResult, transferResult, orderResult] = await Promise.all([
    supabase
      .from('attendance_records')
      .select('employee_id, status, late_minutes')
      .in('employee_id', empIds)
      .gte('date', dateFrom)
      .lte('date', dateTo),
    supabase
      .from('tasks')
      .select('assigned_to_user_id, status, due_date, completed_date')
      .in('assigned_to_user_id', userIds)
      .gte('due_date', dateFrom)
      .lte('due_date', dateTo),
    supabase
      .from('lead_transfers')
      .select('to_user_id, id')
      .in('to_user_id', userIds)
      .gte('transferred_at', `${dateFrom}T00:00:00+05:45`)
      .lte('transferred_at', `${dateTo}T23:59:59+05:45`),
    supabase
      .from('orders')
      .select('sales_person_id, amount, order_status, delivery_location, inside_delivery_status')
      .eq('is_deleted', false)
      .in('sales_person_id', userIds)
      .gte('order_date', `${dateFrom}T00:00:00`)
      .lte('order_date', `${dateTo}T23:59:59`),
  ]);

  const attData = attResult.data || [];
  const taskData = taskResult.data || [];
  const transferData = transferResult.data || [];
  const orderData = orderResult.data || [];

  // Group by employee
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

  return employees.map(emp => {
    // Attendance
    const att = attByEmp.get(emp.id) || [];
    const present = att.filter(r => ['Present', 'Work From Home', 'Late'].includes(r.status)).length;
    const workingDays = att.filter(r => !['Saturday', 'Holiday'].includes(r.status)).length;
    const hasAttData = workingDays > 0 && att.some(r => ['Present', 'Late', 'Absent'].includes(r.status));
    const { rating: attendanceRating, score: attendanceScore } = getAttendanceRating(present, workingDays, hasAttData);

    // Sales
    const totalLeads = emp.user_id ? (transfersByUser.get(emp.user_id) || 0) : 0;
    const orders = emp.user_id ? (ordersByUser.get(emp.user_id) || []) : [];
    let confirmedOrders = 0;
    let vdNotDeliver = 0;
    orders.forEach(order => {
      if (['DELIVERED', 'DISPATCHED', 'CONFIRMED'].includes(order.order_status)) {
        confirmedOrders++;
        const isValley = order.delivery_location === 'INSIDE_VALLEY';
        const isNotDelivered = order.inside_delivery_status !== 'DELIVERED';
        if (isValley && isNotDelivered) vdNotDeliver++;
      }
    });
    const effectiveOrders = confirmedOrders - vdNotDeliver;
    const conversionRate = totalLeads > 0 ? (effectiveOrders / totalLeads) * 100 : 0;
    const hasSalesData = totalLeads > 0 && conversionRate > 0;
    const { rating: salesRating, score: salesScore } = getSalesRating(conversionRate, hasSalesData);

    // Tasks
    const tasks = emp.user_id ? (tasksByUser.get(emp.user_id) || []) : [];
    const totalTasks = tasks.length;
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'COMPLETED' && t.completed_date) {
        return new Date(t.completed_date) > new Date(t.due_date);
      }
      return t.status !== 'COMPLETED' && new Date(t.due_date) < new Date();
    }).length;
    const { rating: taskRating, score: taskScore } = getTaskRating(overdueTasks, totalTasks);

    const maxScore = (attendanceRating !== 'No Rating' ? 30 : 0) + (salesRating !== 'No Rating' ? 40 : 0) + (taskRating !== 'No Rating' ? 30 : 0);
    const totalScore = attendanceScore + salesScore + taskScore;
    const overallRating = getOverallRating(totalScore, maxScore);

    return {
      employeeId: emp.id,
      fullName: emp.full_name,
      position: emp.position || '-',
      department: emp.department,
      attendanceRating, attendanceScore,
      salesRating, salesScore,
      taskRating, taskScore,
      totalScore, maxScore,
      overallRating,
    };
  });
}

type TrendCategory = 'Consistently Excellent/Good' | 'Consistently Low' | 'Improving' | 'Declining' | 'Mixed' | 'Insufficient Data';

function analyzeTrend(months: EmployeeMonthData[]): TrendCategory {
  const rated = months.filter(m => m.overallRating !== 'No Rating');
  if (rated.length < 2) return 'Insufficient Data';

  const allHigh = rated.every(m => m.overallRating === 'Excellent' || m.overallRating === 'Good');
  const allLow = rated.every(m => m.overallRating === 'Low');
  
  if (allHigh) return 'Consistently Excellent/Good';
  if (allLow) return 'Consistently Low';

  // Check trend direction
  const ratingValues: Record<Rating, number> = { 'Excellent': 4, 'Good': 3, 'Medium': 2, 'Low': 1, 'No Rating': 0 };
  const values = rated.map(m => ratingValues[m.overallRating]);
  const isImproving = values.every((v, i) => i === 0 || v >= values[i - 1]) && values[values.length - 1] > values[0];
  const isDeclining = values.every((v, i) => i === 0 || v <= values[i - 1]) && values[values.length - 1] < values[0];

  if (isImproving) return 'Improving';
  if (isDeclining) return 'Declining';
  return 'Mixed';
}

export function BulkPerformanceReportButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Fetch active employees
      const { data: employees, error: empErr } = await supabase
        .from('employees')
        .select('id, user_id, full_name, position, department_id, departments:department_id(name)')
        .eq('status', 'Active')
        .order('full_name');
      
      if (empErr) throw empErr;
      if (!employees || employees.length === 0) {
        toast.error('No active employees found');
        setLoading(false);
        return;
      }

      const empList = employees.map((e: any) => ({
        id: e.id,
        user_id: e.user_id,
        full_name: e.full_name,
        position: e.position,
        department: e.departments?.name || '-',
      }));

      // Fetch company info
      const { data: companyInfo } = await supabase
        .from('company_info')
        .select('company_name, address, phone, email')
        .limit(1)
        .maybeSingle();

      // Calculate date ranges for current month and last 3 months
      const now = new Date();
      const months: { label: string; from: string; to: string }[] = [];
      for (let i = 0; i < 4; i++) {
        const d = subMonths(now, i);
        const from = format(startOfMonth(d), 'yyyy-MM-dd');
        const to = format(endOfMonth(d), 'yyyy-MM-dd');
        months.push({ label: format(d, 'MMMM yyyy'), from, to });
      }

      // Fetch data for all 4 months in parallel
      const allMonthData = await Promise.all(
        months.map(m => fetchMonthDataForAllEmployees(empList, m.from, m.to))
      );

      // Current month data
      const currentMonth = allMonthData[0];
      const currentLabel = months[0].label;

      // Group current month by rating
      const ratingGroups: Record<string, EmployeeMonthData[]> = {
        'Excellent': [], 'Good': [], 'Medium': [], 'Low': [], 'No Rating': []
      };
      currentMonth.forEach(e => ratingGroups[e.overallRating].push(e));

      // Analyze 3-month trend (months[1], months[2], months[3] = last 3 months, oldest to newest)
      const trendData: { emp: EmployeeMonthData; trend: TrendCategory; monthRatings: Rating[] }[] = [];
      empList.forEach(emp => {
        const monthlyRatings = allMonthData.map(monthData => 
          monthData.find(d => d.employeeId === emp.id)
        );
        // Reverse: oldest first for trend analysis (index 3=oldest, 0=current)
        const last3 = [monthlyRatings[3], monthlyRatings[2], monthlyRatings[1]].filter(Boolean) as EmployeeMonthData[];
        const trend = analyzeTrend(last3);
        trendData.push({
          emp: monthlyRatings[0] || currentMonth.find(d => d.employeeId === emp.id)!,
          trend,
          monthRatings: [
            monthlyRatings[3]?.overallRating || 'No Rating',
            monthlyRatings[2]?.overallRating || 'No Rating',
            monthlyRatings[1]?.overallRating || 'No Rating',
          ],
        });
      });

      // Generate PDF
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 12;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(companyInfo?.company_name || 'Company', pageWidth / 2, y, { align: 'center' });
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      if (companyInfo?.address) { doc.text(companyInfo.address, pageWidth / 2, y, { align: 'center' }); y += 4; }
      if (companyInfo?.phone || companyInfo?.email) {
        doc.text([companyInfo?.phone, companyInfo?.email].filter(Boolean).join(' | '), pageWidth / 2, y, { align: 'center' });
        y += 4;
      }
      
      // Title
      y += 3;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Staff Performance Report', pageWidth / 2, y, { align: 'center' });
      y += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Current Month: ${currentLabel} | Generated: ${format(now, 'dd MMM yyyy')}`, pageWidth / 2, y, { align: 'center' });
      y += 8;

      // ---- SECTION 1: Current Month Performance by Category ----
      const ratingOrder = ['Excellent', 'Good', 'Medium', 'Low', 'No Rating'];
      const ratingColors: Record<string, [number, number, number]> = {
        'Excellent': [22, 163, 74],
        'Good': [37, 99, 235],
        'Medium': [234, 179, 8],
        'Low': [220, 38, 38],
        'No Rating': [148, 163, 184],
      };

      for (const rating of ratingOrder) {
        const group = ratingGroups[rating];
        if (group.length === 0) continue;

        // Section header
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const color = ratingColors[rating];
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(`${rating} (${group.length} staff)`, 14, y);
        doc.setTextColor(0, 0, 0);
        y += 1;

        autoTable(doc, {
          startY: y,
          head: [['#', 'Employee', 'Position', 'Attendance', 'Sales', 'Tasks', 'Score']],
          body: group.map((e, i) => [
            (i + 1).toString(),
            e.fullName,
            e.position,
            e.attendanceRating === 'No Rating' ? '-' : `${e.attendanceScore}/30`,
            e.salesRating === 'No Rating' ? '-' : `${e.salesScore}/40`,
            e.taskRating === 'No Rating' ? '-' : `${e.taskScore}/30`,
            e.maxScore > 0 ? `${e.totalScore}/${e.maxScore}` : '-',
          ]),
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: color, fontSize: 7, cellPadding: 1.5 },
          columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 35 },
            2: { cellWidth: 30 },
          },
          margin: { left: 14, right: 14 },
        });

        y = (doc as any).lastAutoTable.finalY + 6;

        // Page break if needed
        if (y > 260) {
          doc.addPage();
          y = 15;
        }
      }

      // ---- SECTION 2: 3-Month Trend Analysis ----
      doc.addPage();
      y = 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('3-Month Performance Trend Analysis', pageWidth / 2, y, { align: 'center' });
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`${months[3].label} - ${months[1].label}`, pageWidth / 2, y, { align: 'center' });
      y += 8;

      // Consistently Excellent/Good
      const consistentHigh = trendData.filter(t => t.trend === 'Consistently Excellent/Good');
      const consistentLow = trendData.filter(t => t.trend === 'Consistently Low');
      const improving = trendData.filter(t => t.trend === 'Improving');
      const declining = trendData.filter(t => t.trend === 'Declining');

      const trendSections: { title: string; data: typeof trendData; color: [number, number, number]; icon: string }[] = [
        { title: 'Consistently Excellent/Good', data: consistentHigh, color: [22, 163, 74], icon: 'Top Performers' },
        { title: 'Consistently Low', data: consistentLow, color: [220, 38, 38], icon: 'Needs Attention' },
        { title: 'Improving', data: improving, color: [37, 99, 235], icon: 'Getting Better' },
        { title: 'Declining', data: declining, color: [234, 179, 8], icon: 'Watch List' },
      ];

      for (const section of trendSections) {
        if (section.data.length === 0) continue;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(section.color[0], section.color[1], section.color[2]);
        doc.text(`${section.title} - ${section.icon} (${section.data.length})`, 14, y);
        doc.setTextColor(0, 0, 0);
        y += 1;

        autoTable(doc, {
          startY: y,
          head: [['#', 'Employee', 'Position', months[3].label, months[2].label, months[1].label, 'Current']],
          body: section.data.map((t, i) => [
            (i + 1).toString(),
            t.emp.fullName,
            t.emp.position,
            t.monthRatings[0],
            t.monthRatings[1],
            t.monthRatings[2],
            t.emp.overallRating,
          ]),
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: section.color, fontSize: 7, cellPadding: 1.5 },
          columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 30 }, 2: { cellWidth: 25 } },
          margin: { left: 14, right: 14 },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index >= 3) {
              const val = data.cell.raw;
              if (val === 'Excellent') data.cell.styles.textColor = [22, 163, 74];
              else if (val === 'Good') data.cell.styles.textColor = [37, 99, 235];
              else if (val === 'Medium') data.cell.styles.textColor = [234, 179, 8];
              else if (val === 'Low') data.cell.styles.textColor = [220, 38, 38];
              else data.cell.styles.textColor = [148, 163, 184];
            }
          },
        });

        y = (doc as any).lastAutoTable.finalY + 6;
        if (y > 260) {
          doc.addPage();
          y = 15;
        }
      }

      // ---- SECTION 3: Summary ----
      y += 4;
      if (y > 240) { doc.addPage(); y = 15; }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      const summaryLines = [
        `Total Active Employees: ${empList.length}`,
        `Excellent: ${ratingGroups['Excellent'].length} | Good: ${ratingGroups['Good'].length} | Medium: ${ratingGroups['Medium'].length} | Low: ${ratingGroups['Low'].length} | No Rating: ${ratingGroups['No Rating'].length}`,
        `Consistently High Performers (3 months): ${consistentHigh.length}`,
        `Consistently Low Performers (3 months): ${consistentLow.length}`,
        `Improving Trend: ${improving.length} | Declining Trend: ${declining.length}`,
      ];
      summaryLines.forEach(line => {
        doc.text(line, 14, y);
        y += 4;
      });

      // Footer
      y += 8;
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.text('This is a system-generated report.', pageWidth / 2, y, { align: 'center' });

      doc.save(`Staff_Performance_Report_${format(now, 'yyyy-MM')}.pdf`);
      toast.success('Performance report exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleExport} disabled={loading}>
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
      {loading ? 'Generating...' : 'Performance Report'}
    </Button>
  );
}
