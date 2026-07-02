import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Rating,
  EmployeeMonthData,
  fetchMonthDataForAllEmployees,
  renderEmployeePage,
} from '@/lib/employeePerformancePdf';

type TrendCategory = 'Consistently Excellent/Good' | 'Consistently Low' | 'Improving' | 'Declining' | 'Mixed' | 'Insufficient Data';

function analyzeTrend(months: EmployeeMonthData[]): TrendCategory {
  const rated = months.filter(m => m.overallRating !== 'No Rating');
  if (rated.length < 2) return 'Insufficient Data';
  const allHigh = rated.every(m => m.overallRating === 'Excellent' || m.overallRating === 'Good');
  const allLow = rated.every(m => m.overallRating === 'Low');
  if (allHigh) return 'Consistently Excellent/Good';
  if (allLow) return 'Consistently Low';
  const ratingValues: Record<Rating, number> = { 'Excellent': 4, 'Good': 3, 'Medium': 2, 'Low': 1, 'No Rating': 0 };
  const values = rated.map(m => ratingValues[m.overallRating]);
  const isImproving = values.every((v, i) => i === 0 || v >= values[i - 1]) && values[values.length - 1] > values[0];
  const isDeclining = values.every((v, i) => i === 0 || v <= values[i - 1]) && values[values.length - 1] < values[0];
  if (isImproving) return 'Improving';
  if (isDeclining) return 'Declining';
  return 'Mixed';
}

function buildMonthOptions() {
  const opts: { value: string; label: string; date: Date }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    opts.push({ value: `${d.getFullYear()}-${d.getMonth()}`, label: format(d, 'MMMM yyyy'), date: d });
  }
  return opts;
}

export function BulkPerformanceReportButton() {
  const [loading, setLoading] = useState(false);
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [monthValue, setMonthValue] = useState(monthOptions[0].value);
  const selectedDate = useMemo(() => monthOptions.find(o => o.value === monthValue)?.date || new Date(), [monthValue, monthOptions]);

  const fetchEmployeesAndCompany = async () => {
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, user_id, full_name, position, department_id, store_id, departments:department_id(name)')
      .eq('status', 'Active')
      .order('full_name');
    if (empErr) throw empErr;
    if (!employees || employees.length === 0) {
      toast.error('No active employees found');
      return null;
    }
    const empList = employees.map((e: any) => ({
      id: e.id, user_id: e.user_id, full_name: e.full_name, position: e.position,
      department: e.departments?.name || '-', store_id: e.store_id, department_id: e.department_id,
    }));
    const storeId = empList.find(e => e.store_id)?.store_id;
    let companyInfo: any = null;
    if (storeId) {
      const { data } = await supabase.from('company_info')
        .select('company_name, address, phone, email, logo_url, registration_no')
        .eq('store_id', storeId).maybeSingle();
      companyInfo = data;
    }
    if (!companyInfo) {
      const { data } = await supabase.from('company_info')
        .select('company_name, address, phone, email, logo_url, registration_no')
        .limit(1).maybeSingle();
      companyInfo = data;
    }
    return { empList, companyInfo };
  };

  const buildMonths = (baseDate: Date) => {
    const months: { label: string; from: string; to: string }[] = [];
    for (let i = 0; i < 4; i++) {
      const d = subMonths(baseDate, i);
      months.push({
        label: format(d, 'MMMM yyyy'),
        from: format(startOfMonth(d), 'yyyy-MM-dd'),
        to: format(endOfMonth(d), 'yyyy-MM-dd'),
      });
    }
    return months;
  };

  const handleExportOverall = async () => {
    setLoading(true);
    try {
      const res = await fetchEmployeesAndCompany();
      if (!res) return;
      const { empList, companyInfo } = res;
      const months = buildMonths(selectedDate);
      const allMonthData = await Promise.all(months.map(m => fetchMonthDataForAllEmployees(empList, m.from, m.to)));
      const currentMonth = allMonthData[0];
      const currentLabel = months[0].label;

      const ratingGroups: Record<string, EmployeeMonthData[]> = {
        'Excellent': [], 'Good': [], 'Medium': [], 'Low': [], 'No Rating': []
      };
      currentMonth.forEach(e => ratingGroups[e.overallRating].push(e));

      const trendData: { emp: EmployeeMonthData; trend: TrendCategory; monthRatings: Rating[] }[] = [];
      empList.forEach(emp => {
        const monthlyRatings = allMonthData.map(md => md.find(d => d.employeeId === emp.id));
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

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 12;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
      doc.text(companyInfo?.company_name || 'Company', pageWidth / 2, y, { align: 'center' }); y += 5;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      if (companyInfo?.address) { doc.text(companyInfo.address, pageWidth / 2, y, { align: 'center' }); y += 4; }
      if (companyInfo?.phone || companyInfo?.email) {
        doc.text([companyInfo?.phone, companyInfo?.email].filter(Boolean).join(' | '), pageWidth / 2, y, { align: 'center' });
        y += 4;
      }
      y += 3;
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('Staff Performance Report', pageWidth / 2, y, { align: 'center' }); y += 5;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Month: ${currentLabel} | Generated: ${format(new Date(), 'dd MMM yyyy')}`, pageWidth / 2, y, { align: 'center' });
      y += 8;

      const ratingOrder = ['Excellent', 'Good', 'Medium', 'Low', 'No Rating'];
      const ratingColors: Record<string, [number, number, number]> = {
        'Excellent': [22, 163, 74], 'Good': [37, 99, 235], 'Medium': [234, 179, 8], 'Low': [220, 38, 38], 'No Rating': [148, 163, 184],
      };

      for (const rating of ratingOrder) {
        const group = ratingGroups[rating];
        if (group.length === 0) continue;
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        const color = ratingColors[rating];
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(`${rating} (${group.length} staff)`, 14, y);
        doc.setTextColor(0, 0, 0);
        y += 1;
        autoTable(doc, {
          startY: y,
          head: [['#', 'Employee', 'Position', 'Attendance', 'Sales', 'Tasks', 'Score']],
          body: group.map((e, i) => [
            (i + 1).toString(), e.fullName, e.position,
            e.attendanceRating === 'No Rating' ? '-' : `${e.attendanceScore}/30`,
            e.salesRating === 'No Rating' ? '-' : `${e.salesScore}/40`,
            e.taskRating === 'No Rating' ? '-' : `${e.taskScore}/30`,
            e.maxScore > 0 ? `${e.totalScore}/${e.maxScore}` : '-',
          ]),
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: color, fontSize: 7, cellPadding: 1.5 },
          columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 35 }, 2: { cellWidth: 30 } },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
        if (y > 260) { doc.addPage(); y = 15; }
      }

      // Trend section
      doc.addPage(); y = 15;
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
      doc.text('3-Month Performance Trend Analysis', pageWidth / 2, y, { align: 'center' }); y += 5;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(`${months[3].label} - ${months[1].label}`, pageWidth / 2, y, { align: 'center' }); y += 8;

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
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.setTextColor(section.color[0], section.color[1], section.color[2]);
        doc.text(`${section.title} - ${section.icon} (${section.data.length})`, 14, y);
        doc.setTextColor(0, 0, 0);
        y += 1;
        autoTable(doc, {
          startY: y,
          head: [['#', 'Employee', 'Position', months[3].label, months[2].label, months[1].label, 'Current']],
          body: section.data.map((t, i) => [
            (i + 1).toString(), t.emp.fullName, t.emp.position,
            t.monthRatings[0], t.monthRatings[1], t.monthRatings[2], t.emp.overallRating,
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
        if (y > 260) { doc.addPage(); y = 15; }
      }

      // Summary
      y += 4;
      if (y > 240) { doc.addPage(); y = 15; }
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, y); y += 5;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      const summaryLines = [
        `Total Active Employees: ${empList.length}`,
        `Excellent: ${ratingGroups['Excellent'].length} | Good: ${ratingGroups['Good'].length} | Medium: ${ratingGroups['Medium'].length} | Low: ${ratingGroups['Low'].length} | No Rating: ${ratingGroups['No Rating'].length}`,
        `Consistently High Performers (3 months): ${consistentHigh.length}`,
        `Consistently Low Performers (3 months): ${consistentLow.length}`,
        `Improving Trend: ${improving.length} | Declining Trend: ${declining.length}`,
      ];
      summaryLines.forEach(line => { doc.text(line, 14, y); y += 4; });

      y += 8;
      doc.setFontSize(7); doc.setTextColor(128, 128, 128);
      doc.text('This is a system-generated report.', pageWidth / 2, y, { align: 'center' });

      doc.save(`Staff_Performance_Report_${format(selectedDate, 'yyyy-MM')}.pdf`);
      toast.success('Overall performance report exported');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportByEmployee = async () => {
    setLoading(true);
    try {
      const res = await fetchEmployeesAndCompany();
      if (!res) return;
      const { empList, companyInfo } = res;

      const trendRanges = [2, 1, 0].map(offset => {
        const d = subMonths(selectedDate, offset);
        return {
          label: format(d, 'MMM yyyy'),
          fullLabel: format(d, 'MMMM yyyy'),
          from: format(startOfMonth(d), 'yyyy-MM-dd'),
          to: format(endOfMonth(d), 'yyyy-MM-dd'),
        };
      });
      const monthsData = await Promise.all(trendRanges.map(r => fetchMonthDataForAllEmployees(empList, r.from, r.to)));

      const doc = new jsPDF('p', 'mm', 'a4');
      let firstPage = true;
      for (const emp of empList) {
        const current = monthsData[2].find(m => m.employeeId === emp.id);
        if (!current) continue;
        const trend: EmployeeMonthData[] = [
          monthsData[0].find(m => m.employeeId === emp.id) || current,
          monthsData[1].find(m => m.employeeId === emp.id) || current,
          current,
        ];
        if (!firstPage) doc.addPage();
        firstPage = false;
        renderEmployeePage(doc, current, trendRanges[2].fullLabel, trend, trendRanges.map(r => r.label), companyInfo);
      }

      doc.save(`Employee_Performance_Reports_${format(selectedDate, 'yyyy-MM')}.pdf`);
      toast.success(`Exported ${empList.length} employee reports`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export reports');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={monthValue} onValueChange={setMonthValue} disabled={loading}>
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {loading ? 'Generating...' : 'Performance Report'}
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleExportOverall} disabled={loading}>
            Overall Report
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportByEmployee} disabled={loading}>
            By Employee (All Staff)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
