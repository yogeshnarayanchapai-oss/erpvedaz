import { useState, useMemo } from 'react';
import { usePayrollRecords, useCompanyInfo, useEmployees, useBankAccounts, useDeletePayrollRecord } from '@/hooks/useHRM';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Trash2, ArrowUpDown } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { useStoreBranding } from '@/hooks/useStoreBranding';

import { adToBS, getBSMonthName, bsToAd, getBSYears, getBSMonths, formatBSDate } from '@/lib/nepaliDate';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { isAdminOrManager } from '@/lib/roleUtils';
import jsPDF from 'jspdf';

export default function HRMSalarySlip() {
  // Always use BS month for salary slips
  const currentBS = adToBS(new Date());
  // Default to previous BS month
  const prevMonth = currentBS.month === 1 ? 12 : currentBS.month - 1;
  const prevYear = currentBS.month === 1 ? currentBS.year - 1 : currentBS.year;
  const [bsYear, setBsYear] = useState(prevYear);
  const [bsMonth, setBsMonth] = useState(prevMonth);
  
  // Convert BS to AD for database query
  const getQueryMonth = () => {
    const adDate = bsToAd(bsYear, bsMonth, 1);
    return format(adDate, 'yyyy-MM-01');
  };

  const { data: records = [], isLoading } = usePayrollRecords(getQueryMonth());
  const { data: company } = useCompanyInfo();
  const { data: employees = [] } = useEmployees();
  const { data: bankAccounts = [] } = useBankAccounts();
  const { currentStore } = useCurrentStore();
  const { data: branding } = useStoreBranding(currentStore?.id || '');
  const { effectiveRole } = useEffectiveRole();
  const deletePayroll = useDeletePayrollRecord();

  const [viewSlip, setViewSlip] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [slipToDelete, setSlipToDelete] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'name'>('newest');

  // Sort records
  const sortedRecords = useMemo(() => {
    const sorted = [...records];
    if (sortBy === 'name') {
      sorted.sort((a, b) => (a.employees?.full_name || '').localeCompare(b.employees?.full_name || ''));
    }
    // 'newest' is default from API (created_at desc)
    return sorted;
  }, [records, sortBy]);

  const canDelete = isAdminOrManager(effectiveRole);

  const getEmployee = (id: string) => employees.find((e) => e.id === id);
  
  // Only return the employee's linked bank, no default fallback
  const getEmployeeBank = (bankAccountId: string | null | undefined) => {
    if (!bankAccountId) return null;
    return bankAccounts.find((b) => b.id === bankAccountId) || null;
  };

  // Always display in BS format - use mid-month to avoid timezone edge cases
  const getDisplayMonthYear = (adDateStr: string) => {
    const adDate = new Date(adDateStr + 'T00:00:00');
    adDate.setDate(15);
    const bs = adToBS(adDate);
    return `${getBSMonthName(bs.month)} ${bs.year}`;
  };

  // Get Nepali month/year for PDF (always show Nepali for PDF as per requirement)
  const getNepaliMonthYear = (adDateStr: string) => {
    const adDate = new Date(adDateStr + 'T00:00:00');
    adDate.setDate(15);
    const bs = adToBS(adDate);
    return `${getBSMonthName(bs.month)} ${bs.year}`;
  };

  // Get Nepali date for paid_on date in PDF
  const getNepaliPaidDate = (paidOnStr: string | null) => {
    if (!paidOnStr) return 'Pending';
    return formatBSDate(paidOnStr, 'full');
  };

  const handleDownloadPDF = async () => {
    if (!viewSlip) return;

    const employee = getEmployee(viewSlip.employee_id);
    const employeeBank = getEmployeeBank(employee?.bank_account_id);
    const companyName = company?.company_name || currentStore?.name || 'Company';
    const employeeName = viewSlip.employees?.full_name || 'Employee';
    const monthYear = getNepaliMonthYear(viewSlip.month); // Always Nepali month in PDF

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Logo
    const logoUrl = company?.logo_url || branding?.logo_url || currentStore?.logo_url;
    if (logoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          img.onload = () => {
            const logoHeight = 15;
            const logoWidth = (img.width / img.height) * logoHeight;
            doc.addImage(img, 'PNG', (pageWidth - logoWidth) / 2, y, logoWidth, logoHeight);
            y += logoHeight + 5;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = logoUrl;
        });
      } catch {}
    }

    // Header - Company Name
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Company Details
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    if (company?.address) {
      doc.text(company.address, pageWidth / 2, y, { align: 'center' });
      y += 5;
    }
    if (company?.phone || company?.email) {
      const contactInfo = [company?.phone, company?.email].filter(Boolean).join(' | ');
      doc.text(contactInfo, pageWidth / 2, y, { align: 'center' });
      y += 5;
    }

    // Divider line
    y += 3;
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('SALARY SLIP', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(`For the month of ${monthYear}`, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Slip Number
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Slip No: ${viewSlip.id.slice(0, 8).toUpperCase()}`, pageWidth - 20, y, { align: 'right' });
    y += 10;

    // Employee Info Box - Dynamic height based on name length
    const nameMaxWidth = 85; // Max width for name text
    doc.setFontSize(10);
    const nameLines = doc.splitTextToSize(employeeName, nameMaxWidth);
    const nameRowCount = nameLines.length;
    const boxHeight = 35 + (nameRowCount > 1 ? (nameRowCount - 1) * 5 : 0);
    
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(20, y, pageWidth - 40, boxHeight, 3, 3, 'F');
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text('Employee Name:', 25, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    
    // Handle multi-line name
    if (nameRowCount > 1) {
      nameLines.forEach((line: string, idx: number) => {
        doc.text(line, 70, y + (idx * 5));
      });
    } else {
      doc.text(employeeName, 70, y);
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text('Status:', pageWidth / 2 + 10, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(viewSlip.payment_status === 'Paid' ? 34 : 100, viewSlip.payment_status === 'Paid' ? 139 : 100, viewSlip.payment_status === 'Paid' ? 34 : 100);
    doc.text(viewSlip.payment_status, pageWidth / 2 + 30, y);

    y += 8 + (nameRowCount > 1 ? (nameRowCount - 1) * 5 : 0);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text('Position:', 25, y);
    doc.setTextColor(0);
    doc.text(employee?.position || '-', 70, y);

    doc.setTextColor(80);
    doc.text('Payment Date:', pageWidth / 2 + 10, y);
    doc.setTextColor(0);
    doc.text(getNepaliPaidDate(viewSlip.paid_on), pageWidth / 2 + 48, y);

    y += 8;
    doc.setTextColor(80);
    doc.text('Department:', 25, y);
    doc.setTextColor(0);
    doc.text(employee?.departments?.name || '-', 70, y);

    y += 20;

    // Salary Breakdown Table
    const tableStartY = y;

    // Table Header
    doc.setFillColor(59, 130, 246);
    doc.rect(20, y, pageWidth - 40, 10, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255);
    doc.text('Description', 25, y + 7);
    doc.text('Amount (NPR)', pageWidth - 25, y + 7, { align: 'right' });
    y += 10;

    // Table Rows
    const rows = [
      { label: 'Basic Salary', value: viewSlip.basic_salary, color: null },
      { label: 'Allowances', value: viewSlip.allowances || 0, color: 'green' },
      { label: 'Deductions', value: viewSlip.deductions || 0, color: 'red' },
    ];

    rows.forEach((row, index) => {
      doc.setFillColor(index % 2 === 0 ? 255 : 249, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 251);
      doc.rect(20, y, pageWidth - 40, 10, 'F');
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      doc.text(row.label, 25, y + 7);
      
      if (row.color === 'green') {
        doc.setTextColor(34, 139, 34);
        doc.text(`+ Rs. ${row.value.toLocaleString()}`, pageWidth - 25, y + 7, { align: 'right' });
      } else if (row.color === 'red') {
        doc.setTextColor(220, 53, 69);
        doc.text(`- Rs. ${row.value.toLocaleString()}`, pageWidth - 25, y + 7, { align: 'right' });
      } else {
        doc.setTextColor(0);
        doc.text(`Rs. ${row.value.toLocaleString()}`, pageWidth - 25, y + 7, { align: 'right' });
      }
      y += 10;
    });

    // Net Salary Row
    doc.setFillColor(239, 246, 255);
    doc.rect(20, y, pageWidth - 40, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.text('Net Salary Payable', 25, y + 8);
    doc.text(`Rs. ${viewSlip.net_salary.toLocaleString()}`, pageWidth - 25, y + 8, { align: 'right' });
    y += 12;

    // Table border
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.rect(20, tableStartY, pageWidth - 40, y - tableStartY);

    y += 12;

    // Bank Details - Only show if employee has linked bank account
    if (employeeBank) {
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(20, y, pageWidth - 40, 22, 3, 3, 'F');
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text('Payment Details', 25, y);
      y += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);
      doc.text(`Bank: ${employeeBank.bank_name}`, 25, y);
      doc.text(`A/C No: ${employeeBank.account_number}`, pageWidth / 2, y);
      y += 18;
    }

    // Notes
    if (viewSlip.notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text('Remarks:', 20, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);
      doc.text(viewSlip.notes, 20, y);
      y += 12;
    }

    // Footer
    y = Math.max(y + 10, 250);
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 20, y);
    y += 4;
    doc.text('This is a computer-generated document. No signature required.', 20, y);

    // Authorized Signature
    doc.setDrawColor(150);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([2, 1], 0);
    doc.line(pageWidth - 70, y - 8, pageWidth - 20, y - 8);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text('Authorized Signature', pageWidth - 45, y, { align: 'center' });

    // Save PDF
    const bs = adToBS(new Date(viewSlip.month));
    const fileName = `Salary_Slip_${employeeName.replace(/\s+/g, '_')}_${getBSMonthName(bs.month)}_${bs.year}.pdf`;
    doc.save(fileName);
  };

  // Get current display month for card title - always BS
  const getCurrentDisplayMonth = () => {
    return `${getBSMonthName(bsMonth)} ${bsYear}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Salary Slips</h1>
          <p className="text-muted-foreground">Generate and view salary slips</p>
        </div>
        
        {/* Date Filter - Always BS */}
        <div className="flex gap-2">
          <Select value={bsYear.toString()} onValueChange={(v) => setBsYear(parseInt(v))}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {getBSYears().map((year) => (
                <SelectItem key={year.value} value={year.value.toString()}>
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bsMonth.toString()} onValueChange={(v) => setBsMonth(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {getBSMonths().map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Salary Slips for {getCurrentDisplayMonth()}
            </CardTitle>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'newest' | 'name')}>
              <SelectTrigger className="w-36">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="name">By Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRecords.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employees?.full_name || '-'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{getDisplayMonthYear(r.month)}</TableCell>
                  <TableCell className="text-right font-bold">रू {r.net_salary.toLocaleString()}</TableCell>
                  <TableCell><Badge variant={r.payment_status === 'Paid' ? 'default' : 'secondary'}>{r.payment_status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setViewSlip(r)}>
                        <FileText className="w-4 h-4 mr-2" />View
                      </Button>
                      {canDelete && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setSlipToDelete(r);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sortedRecords.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{isLoading ? 'Loading...' : 'No payroll records'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewSlip} onOpenChange={(open) => !open && setViewSlip(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Salary Slip Preview
            </DialogTitle>
          </DialogHeader>
          {viewSlip && (
            <div className="space-y-4" id="salary-slip">
              {/* Company Header */}
              <div className="text-center border-b pb-4">
                {(company?.logo_url || branding?.logo_url || currentStore?.logo_url) && (
                  <img 
                    src={company?.logo_url || branding?.logo_url || currentStore?.logo_url || ''} 
                    alt="Logo" 
                    className="h-12 w-auto object-contain mx-auto mb-2"
                  />
                )}
                <h2 className="text-xl font-bold text-foreground">{company?.company_name || currentStore?.name || 'Company Name'}</h2>
                {company?.address && <p className="text-xs text-muted-foreground">{company.address}</p>}
                {(company?.phone || company?.email) && (
                  <p className="text-xs text-muted-foreground">{[company?.phone, company?.email].filter(Boolean).join(' | ')}</p>
                )}
              </div>

              {/* Title */}
              <div className="text-center py-2 bg-primary/10 rounded-md">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Salary Slip</h3>
                <p className="text-xs text-muted-foreground">{getDisplayMonthYear(viewSlip.month)}</p>
              </div>

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-md text-sm">
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">Name:</span>
                    <span className="font-medium break-words">{viewSlip.employees?.full_name}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Position:</span>
                    <span>{getEmployee(viewSlip.employee_id)?.position || '-'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Department:</span>
                    <span>{getEmployee(viewSlip.employee_id)?.departments?.name || '-'}</span>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="flex justify-end gap-2">
                    <span className="text-muted-foreground">Slip No:</span>
                    <span className="font-mono text-xs">{viewSlip.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={viewSlip.payment_status === 'Paid' ? 'default' : 'secondary'} className="text-xs">
                      {viewSlip.payment_status}
                    </Badge>
                  </div>
                  <div className="flex justify-end gap-2">
                    <span className="text-muted-foreground">Paid On:</span>
                    <span>{viewSlip.paid_on ? format(new Date(viewSlip.paid_on), 'dd MMM yyyy') : '-'}</span>
                  </div>
                </div>
              </div>

              {/* Salary Breakdown */}
              <div className="border rounded-md overflow-hidden">
                <div className="grid grid-cols-2 bg-primary text-primary-foreground text-sm font-medium">
                  <div className="p-2.5">Description</div>
                  <div className="p-2.5 text-right">Amount (NPR)</div>
                </div>
                <div className="divide-y">
                  <div className="grid grid-cols-2 text-sm">
                    <div className="p-2.5">Basic Salary</div>
                    <div className="p-2.5 text-right font-medium">रू {viewSlip.basic_salary.toLocaleString()}</div>
                  </div>
                  <div className="grid grid-cols-2 text-sm bg-muted/30">
                    <div className="p-2.5">Allowances</div>
                    <div className="p-2.5 text-right font-medium text-green-600">+ रू {(viewSlip.allowances || 0).toLocaleString()}</div>
                  </div>
                  <div className="grid grid-cols-2 text-sm">
                    <div className="p-2.5">Deductions</div>
                    <div className="p-2.5 text-right font-medium text-destructive">- रू {(viewSlip.deductions || 0).toLocaleString()}</div>
                  </div>
                  <div className="grid grid-cols-2 text-sm bg-primary/5 font-bold">
                    <div className="p-3 text-primary">Net Salary</div>
                    <div className="p-3 text-right text-primary text-base">रू {viewSlip.net_salary.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Bank Details - Only show if employee has linked bank */}
              {(() => {
                const emp = getEmployee(viewSlip.employee_id);
                const bank = getEmployeeBank(emp?.bank_account_id);
                if (!bank) return null;
                return (
                  <div className="p-3 bg-muted/50 rounded-md text-sm">
                    <p className="font-medium text-primary mb-1">Bank Details</p>
                    <div className="flex gap-6 text-muted-foreground">
                      <span>{bank.bank_name}</span>
                      <span className="font-mono">{bank.account_number}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Notes */}
              {viewSlip.notes && (
                <div className="p-3 border-l-2 border-primary/50 bg-primary/5 rounded-r-md text-sm">
                  <p className="font-medium text-primary">Remarks</p>
                  <p className="text-muted-foreground">{viewSlip.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t text-xs text-muted-foreground flex justify-between items-end">
                <div>
                  <p>Generated: {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
                  <p>Computer-generated document</p>
                </div>
                <div className="text-center">
                  <div className="border-t border-dashed w-24 mb-1"></div>
                  <span>Authorized Signature</span>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-between pt-2">
            {canDelete && (
              <Button 
                variant="ghost" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                onClick={() => {
                  setSlipToDelete(viewSlip);
                  setDeleteConfirmOpen(true);
                  setViewSlip(null);
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}
            <div className={canDelete ? '' : 'ml-auto'}>
              <Button onClick={handleDownloadPDF} className="gap-2">
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the salary slip for{' '}
              <span className="font-medium">{slipToDelete?.employees?.full_name}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (slipToDelete) {
                  deletePayroll.mutate(slipToDelete.id);
                  setSlipToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
