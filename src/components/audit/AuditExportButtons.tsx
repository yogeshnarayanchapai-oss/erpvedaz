import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatNPR } from '@/lib/currency';
import { formatBSDate } from '@/lib/nepaliDate';
import { AuditSummary, AuditFilters, AuditManualEntry } from '@/hooks/useAuditDashboard';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface AuditExportButtonsProps {
  summary?: AuditSummary;
  manualEntries?: AuditManualEntry[];
  monthlySales?: { month: string; amount: number }[];
  expenseBreakdown?: { name: string; value: number }[];
  filters: AuditFilters;
  companyName?: string;
}

export function AuditExportButtons({
  summary,
  manualEntries,
  monthlySales,
  expenseBreakdown,
  filters,
  companyName = 'Company',
}: AuditExportButtonsProps) {
  const { toast } = useToast();

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(20);
      doc.text('Audit Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text(companyName, pageWidth / 2, 30, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Period: ${filters.fiscalYear || 'Custom Range'}`, pageWidth / 2, 38, { align: 'center' });
      doc.text(`Generated: ${formatBSDate(new Date(), 'full')}`, pageWidth / 2, 44, { align: 'center' });
      
      let yPos = 55;

      // Financial Summary
      doc.setFontSize(14);
      doc.text('Financial Summary', 14, yPos);
      yPos += 5;

      const summaryData = [
        ['Total Sales', formatNPR(summary?.totalSales || 0)],
        ['Total Expenses', formatNPR(summary?.totalExpenses || 0)],
        ['Total Payroll', formatNPR(summary?.totalPayroll || 0)],
        ['Total Purchase', formatNPR(summary?.totalPurchase || 0)],
        ['Net Profit/Loss', formatNPR(summary?.profitLoss || 0)],
        ['Cash Balance', formatNPR(summary?.cashBalance || 0)],
        ['Bank Balance', formatNPR(summary?.bankBalance || 0)],
        ['Receivables', formatNPR(summary?.receivables || 0)],
        ['Payables', formatNPR(summary?.payables || 0)],
        ['Inventory Value', formatNPR(summary?.inventoryValue || 0)],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Amount']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Monthly Sales
      if (monthlySales && monthlySales.length > 0) {
        doc.setFontSize(14);
        doc.text('Monthly Sales', 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['Month', 'Sales Amount']],
          body: monthlySales.map(s => [s.month, formatNPR(s.amount)]),
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Expense Breakdown
      if (expenseBreakdown && expenseBreakdown.length > 0) {
        // Check if need new page
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Expense Breakdown', 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['Category', 'Amount']],
          body: expenseBreakdown.map(e => [e.name, formatNPR(e.value)]),
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68] },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Manual Entries
      if (manualEntries && manualEntries.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Manual Audit Entries', 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'Category', 'Description', 'Amount', 'In Audit']],
          body: manualEntries.map(e => [
            formatBSDate(e.date, 'short'),
            e.category,
            e.description,
            formatNPR(e.amount),
            e.include_in_audit ? 'Yes' : 'No',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [168, 85, 247] },
        });
      }

      // Save
      const fileName = `Audit_Report_${filters.fiscalYear || 'Custom'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast({ title: 'PDF exported successfully' });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ title: 'Error exporting PDF', variant: 'destructive' });
    }
  };

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Financial Summary Sheet
      const summarySheet = XLSX.utils.aoa_to_sheet([
        ['Audit Report - Financial Summary'],
        ['Company', companyName],
        ['Period', filters.fiscalYear || 'Custom Range'],
        ['Generated', formatBSDate(new Date(), 'full')],
        [],
        ['Metric', 'Amount'],
        ['Total Sales', summary?.totalSales || 0],
        ['Total Expenses', summary?.totalExpenses || 0],
        ['Total Payroll', summary?.totalPayroll || 0],
        ['Total Purchase', summary?.totalPurchase || 0],
        ['Net Profit/Loss', summary?.profitLoss || 0],
        ['Cash Balance', summary?.cashBalance || 0],
        ['Bank Balance', summary?.bankBalance || 0],
        ['Receivables', summary?.receivables || 0],
        ['Payables', summary?.payables || 0],
        ['Inventory Value', summary?.inventoryValue || 0],
        ['Sales Count', summary?.salesCount || 0],
        ['Purchase Count', summary?.purchaseCount || 0],
      ]);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Financial Summary');

      // Monthly Sales Sheet
      if (monthlySales && monthlySales.length > 0) {
        const salesSheet = XLSX.utils.json_to_sheet(
          monthlySales.map(s => ({
            Month: s.month,
            'Sales Amount': s.amount,
          }))
        );
        XLSX.utils.book_append_sheet(wb, salesSheet, 'Monthly Sales');
      }

      // Expense Breakdown Sheet
      if (expenseBreakdown && expenseBreakdown.length > 0) {
        const expenseSheet = XLSX.utils.json_to_sheet(
          expenseBreakdown.map(e => ({
            Category: e.name,
            Amount: e.value,
          }))
        );
        XLSX.utils.book_append_sheet(wb, expenseSheet, 'Expense Breakdown');
      }

      // Manual Entries Sheet
      if (manualEntries && manualEntries.length > 0) {
        const entriesSheet = XLSX.utils.json_to_sheet(
          manualEntries.map(e => ({
            'Date (BS)': formatBSDate(e.date, 'numeric'),
            'Date (AD)': e.date,
            Category: e.category,
            'Sub-Category': e.sub_category || '',
            Description: e.description,
            Amount: e.amount,
            Quantity: e.quantity || '',
            'Include in Audit': e.include_in_audit ? 'Yes' : 'No',
            Notes: e.notes || '',
          }))
        );
        XLSX.utils.book_append_sheet(wb, entriesSheet, 'Manual Entries');
      }

      // Save
      const fileName = `Audit_Report_${filters.fiscalYear || 'Custom'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast({ title: 'Excel exported successfully' });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({ title: 'Error exporting Excel', variant: 'destructive' });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={exportToPDF}>
        <FileText className="w-4 h-4 mr-1" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={exportToExcel}>
        <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
      </Button>
    </div>
  );
}
