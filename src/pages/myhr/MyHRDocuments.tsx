import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format, startOfMonth } from 'date-fns';
import { FileText, User, Shield, Building2, Save, Loader2, CreditCard, Receipt, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DocumentUploadCard } from '@/components/documents/DocumentUploadCard';
import { MyBankAccountsCard } from '@/components/hrm/MyBankAccountsCard';
import { usePayrollRecords, useCompanyInfo, useBankAccounts } from '@/hooks/useHRM';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { useDateMode } from '@/contexts/DateModeContext';
import { adToBS, getBSMonthName, bsToAd, getBSYears, getBSMonths, formatBSDate } from '@/lib/nepaliDate';
import jsPDF from 'jspdf';
import {
  useMyEmployeeProfile,
  useEmployeeDocuments,
  useUpdateGuardianInfo,
  EmployeeDocument,
  EmployeeGuardianInfo,
} from '@/hooks/useEmployeeDocuments';

const RELATION_OPTIONS = [
  'Father',
  'Mother',
  'Spouse',
  'Brother',
  'Sister',
  'Son',
  'Daughter',
  'Guardian',
  'Other',
];

export default function MyHRDocuments() {
  const [activeTab, setActiveTab] = useState('documents');
  const [viewSlip, setViewSlip] = useState<any>(null);
  
  const { dateMode } = useDateMode();
  const { currentStore } = useCurrentStore();
  
  // BS date state for Nepali calendar filter
  const currentBS = adToBS(new Date());
  const [bsYear, setBsYear] = useState(currentBS.year);
  const [bsMonth, setBsMonth] = useState(currentBS.month);
  const [selectedMonth, setSelectedMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM-01'));
  
  const { data: employee, isLoading: employeeLoading } = useMyEmployeeProfile();
  const { data: documents, isLoading: docsLoading } = useEmployeeDocuments(employee?.id);
  const { data: company } = useCompanyInfo();
  const { data: bankAccounts = [] } = useBankAccounts();
  const updateGuardianMutation = useUpdateGuardianInfo();

  // Compute the actual month to query based on mode
  const getQueryMonth = () => {
    if (dateMode === 'BS') {
      const adDate = bsToAd(bsYear, bsMonth, 1);
      return format(adDate, 'yyyy-MM-01');
    }
    return selectedMonth;
  };

  // Fetch payroll records
  const { data: allPayrollRecords = [], isLoading: payrollLoading } = usePayrollRecords(getQueryMonth());
  
  // Filter to only show current employee's records
  const payrollRecords = employee 
    ? allPayrollRecords.filter(r => r.employee_id === employee.id)
    : [];

  // Get display month/year based on date mode
  const getDisplayMonthYear = (adDateStr: string) => {
    const adDate = new Date(adDateStr);
    if (dateMode === 'BS') {
      const bs = adToBS(adDate);
      return `${getBSMonthName(bs.month)} ${bs.year}`;
    }
    return format(adDate, 'MMMM yyyy');
  };

  // Get Nepali month/year for PDF
  const getNepaliMonthYear = (adDateStr: string) => {
    const adDate = new Date(adDateStr);
    const bs = adToBS(adDate);
    return `${getBSMonthName(bs.month)} ${bs.year}`;
  };

  // Get employee's linked bank account
  const getEmployeeBank = (bankAccountId: string | null | undefined) => {
    if (!bankAccountId) return null;
    return bankAccounts.find((b) => b.id === bankAccountId) || null;
  };

  // PDF Download function
  const handleDownloadPDF = async () => {
    if (!viewSlip || !employee) return;

    const employeeBank = getEmployeeBank(employee?.bank_account_id);
    const companyName = company?.company_name || currentStore?.name || 'Company';
    const employeeName = employee.full_name || 'Employee';
    const monthYear = getNepaliMonthYear(viewSlip.month);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Logo
    const logoUrl = company?.logo_url || currentStore?.logo_url;
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
    doc.setTextColor(37, 99, 235);
    doc.text(companyName, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Company address/contact
    if (company?.address) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(company.address, pageWidth / 2, y, { align: 'center' });
      y += 5;
    }
    if (company?.phone) {
      doc.text(`Phone: ${company.phone}`, pageWidth / 2, y, { align: 'center' });
      y += 5;
    }

    y += 5;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 12;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('SALARY SLIP', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`For the month of ${monthYear}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Employee Details Box
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(20, y, pageWidth - 40, 28, 3, 3, 'F');
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(60);

    // Left column
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Name:', 25, y);
    doc.setFont('helvetica', 'normal');
    const nameLines = doc.splitTextToSize(employeeName, 55);
    doc.text(nameLines, 58, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Position:', 25, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(employee.position || '-', 50, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.text('Department:', 25, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(employee.department_id ? 'Department' : '-', 55, y + 14);

    // Right column
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Status:', pageWidth - 80, y);
    doc.setFont('helvetica', 'normal');
    doc.text(viewSlip.payment_status || 'Pending', pageWidth - 43, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Payment Date:', pageWidth - 80, y + 7);
    doc.setFont('helvetica', 'normal');
    const paidDateDisplay = viewSlip.paid_on ? formatBSDate(viewSlip.paid_on, 'full') : 'Pending';
    doc.text(paidDateDisplay, pageWidth - 45, y + 7);

    y += 35;

    // Salary Details Table
    const tableStartY = y;
    doc.setFillColor(37, 99, 235);
    doc.rect(20, y, pageWidth - 40, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255);
    doc.text('Description', 25, y + 7);
    doc.text('Amount (Rs.)', pageWidth - 25, y + 7, { align: 'right' });
    y += 10;

    doc.setTextColor(60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Basic Salary
    doc.setFillColor(255, 255, 255);
    doc.rect(20, y, pageWidth - 40, 10, 'F');
    doc.text('Basic Salary', 25, y + 7);
    doc.text(`Rs. ${viewSlip.basic_salary.toLocaleString()}`, pageWidth - 25, y + 7, { align: 'right' });
    y += 10;

    // Allowances
    doc.setFillColor(248, 249, 250);
    doc.rect(20, y, pageWidth - 40, 10, 'F');
    doc.setTextColor(34, 197, 94);
    doc.text('Allowances', 25, y + 7);
    doc.text(`+ Rs. ${(viewSlip.allowances || 0).toLocaleString()}`, pageWidth - 25, y + 7, { align: 'right' });
    y += 10;

    // Deductions
    doc.setFillColor(255, 255, 255);
    doc.rect(20, y, pageWidth - 40, 10, 'F');
    doc.setTextColor(239, 68, 68);
    doc.text('Deductions', 25, y + 7);
    doc.text(`- Rs. ${(viewSlip.deductions || 0).toLocaleString()}`, pageWidth - 25, y + 7, { align: 'right' });
    y += 10;

    // Net Salary
    doc.setFillColor(219, 234, 254);
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

  const { register, handleSubmit, setValue, watch, formState: { isDirty } } = useForm<EmployeeGuardianInfo>({
    values: {
      guardian_name: employee?.guardian_name || '',
      guardian_relation: employee?.guardian_relation || '',
      guardian_phone: employee?.guardian_phone || '',
      citizenship_number: employee?.citizenship_number || '',
      pan_number: employee?.pan_number || '',
    },
  });

  const onSubmitGuardian = async (data: EmployeeGuardianInfo) => {
    if (!employee) return;
    await updateGuardianMutation.mutateAsync({
      employeeId: employee.id,
      data,
    });
  };

  // Find existing documents by type
  const getDocByType = (type: string): EmployeeDocument | undefined => {
    return documents?.find(d => d.doc_type === type);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <Badge className="bg-green-500/10 text-green-600">Verified</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-500/10 text-red-600">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600">Pending</Badge>;
    }
  };

  if (employeeLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Employee Profile Found</h3>
            <p className="text-muted-foreground">
              Your account is not linked to an employee record. Please contact HR.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Documents & KYC</h1>
        <p className="text-muted-foreground">
          Upload and manage your personal documents securely
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="salaryslips" className="gap-2">
            <Receipt className="h-4 w-4" />
            Salary Slips
          </TabsTrigger>
          <TabsTrigger value="bank" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Bank Accounts
          </TabsTrigger>
          <TabsTrigger value="emergency" className="gap-2">
            <Shield className="h-4 w-4" />
            Emergency Contact
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          {/* Document Upload Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DocumentUploadCard
              title="Profile Photo"
              docType="PROFILE_PHOTO"
              employeeId={employee.id}
              existingDoc={getDocByType('PROFILE_PHOTO')}
              description="Your official profile photo"
            />
            <DocumentUploadCard
              title="Citizenship (Front)"
              docType="CITIZENSHIP_FRONT"
              employeeId={employee.id}
              existingDoc={getDocByType('CITIZENSHIP_FRONT')}
              description="Front side of citizenship"
            />
            <DocumentUploadCard
              title="Citizenship (Back)"
              docType="CITIZENSHIP_BACK"
              employeeId={employee.id}
              existingDoc={getDocByType('CITIZENSHIP_BACK')}
              description="Back side of citizenship"
            />
            <DocumentUploadCard
              title="PAN Card"
              docType="PAN_CARD"
              employeeId={employee.id}
              existingDoc={getDocByType('PAN_CARD')}
              description="Personal PAN card"
            />
          </div>

          {/* Company Document */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle className="text-lg">Company Required Document</CardTitle>
              </div>
              <CardDescription>
                e.g. Signed appointment letter, contract, NDA, offer letter scan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <DocumentUploadCard
                  title="Company Document"
                  docType="COMPANY_REQUIREMENT_DOC"
                  employeeId={employee.id}
                  existingDoc={getDocByType('COMPANY_REQUIREMENT_DOC')}
                />
              </div>
            </CardContent>
          </Card>

          {/* All Documents Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Documents</CardTitle>
              <CardDescription>
                {documents?.length || 0} document(s) uploaded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {docsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : documents && documents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Uploaded At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verified By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          {doc.doc_type.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>{doc.title || '-'}</TableCell>
                        <TableCell>
                          {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>
                          {doc.verifier?.name || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No documents uploaded yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salary Slips Tab */}
        <TabsContent value="salaryslips" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                My Salary Slips
              </CardTitle>
              
              {/* Date Mode Filter */}
              {dateMode === 'BS' ? (
                <div className="flex items-center gap-2">
                  <Select value={bsYear.toString()} onValueChange={(v) => setBsYear(parseInt(v))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getBSYears().map((y) => (
                        <SelectItem key={y.value} value={y.value.toString()}>{y.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={bsMonth.toString()} onValueChange={(v) => setBsMonth(parseInt(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getBSMonths().map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Input
                  type="month"
                  value={selectedMonth.slice(0, 7)}
                  onChange={(e) => setSelectedMonth(e.target.value + '-01')}
                  className="w-40"
                />
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Basic</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{getDisplayMonthYear(record.month)}</TableCell>
                      <TableCell className="text-right">Rs.{record.basic_salary.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">+Rs.{(record.allowances || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">-Rs.{(record.deductions || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">Rs.{record.net_salary.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={record.payment_status === 'Paid' ? 'default' : 'secondary'}>
                          {record.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setViewSlip(record)}>
                          <FileText className="w-4 h-4 mr-2" />View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payrollRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {payrollLoading ? 'Loading...' : 'No salary slips found for this period'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Salary Slip View Dialog */}
          <Dialog open={!!viewSlip} onOpenChange={(open) => !open && setViewSlip(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  Salary Slip - {viewSlip && getDisplayMonthYear(viewSlip.month)}
                </DialogTitle>
              </DialogHeader>
              {viewSlip && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Employee</p>
                      <p className="font-medium">{employee.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Position</p>
                      <p className="font-medium">{employee.position || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Status</p>
                      <Badge variant={viewSlip.payment_status === 'Paid' ? 'default' : 'secondary'}>
                        {viewSlip.payment_status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Date</p>
                      <p className="font-medium">
                        {viewSlip.paid_on ? formatBSDate(viewSlip.paid_on, 'full') : 'Pending'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span>Basic Salary</span>
                      <span className="font-medium">Rs. {viewSlip.basic_salary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b text-green-600">
                      <span>Allowances</span>
                      <span>+ Rs. {(viewSlip.allowances || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b text-red-600">
                      <span>Deductions</span>
                      <span>- Rs. {(viewSlip.deductions || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-3 bg-primary/10 rounded px-2 font-bold text-primary">
                      <span>Net Salary</span>
                      <span>Rs. {viewSlip.net_salary.toLocaleString()}</span>
                    </div>
                  </div>

                  {viewSlip.notes && (
                    <div className="p-3 bg-muted/50 rounded text-sm">
                      <p className="text-muted-foreground font-medium mb-1">Notes:</p>
                      <p>{viewSlip.notes}</p>
                    </div>
                  )}

                  <Button onClick={handleDownloadPDF} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Bank Accounts Tab */}
        <TabsContent value="bank">
          <MyBankAccountsCard />
        </TabsContent>

        {/* Emergency Contact Tab */}
        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Emergency Contact & KYC Information
              </CardTitle>
              <CardDescription>
                This information will be used in case of emergency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmitGuardian)} className="space-y-6 max-w-2xl">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="guardian_name">Guardian Name *</Label>
                    <Input
                      id="guardian_name"
                      placeholder="घरबाट को जिम्मेवार व्यक्ति"
                      {...register('guardian_name')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardian_relation">Relation</Label>
                    <Select
                      value={watch('guardian_relation') || ''}
                      onValueChange={(val) => setValue('guardian_relation', val, { shouldDirty: true })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATION_OPTIONS.map(rel => (
                          <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guardian_phone">Guardian Phone *</Label>
                  <Input
                    id="guardian_phone"
                    type="tel"
                    placeholder="98XXXXXXXX"
                    {...register('guardian_phone')}
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">KYC Information</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="citizenship_number">Citizenship Number</Label>
                      <Input
                        id="citizenship_number"
                        placeholder="Optional"
                        {...register('citizenship_number')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pan_number">PAN Number</Label>
                      <Input
                        id="pan_number"
                        placeholder="Optional"
                        {...register('pan_number')}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!isDirty || updateGuardianMutation.isPending}
                >
                  {updateGuardianMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
