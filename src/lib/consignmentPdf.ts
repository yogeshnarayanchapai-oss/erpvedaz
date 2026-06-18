import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { STATUS_LABELS } from '@/hooks/useConsignments';

export async function exportConsignmentPDF(c: any) {
  const [{ data: costs }, { data: payments }] = await Promise.all([
    (supabase as any).from('consignment_costs').select('*').eq('consignment_id', c.id).order('created_at'),
    (supabase as any).from('consignment_payments').select('*').eq('consignment_id', c.id).order('payment_date'),
  ]);
  const costList = costs || [];
  const payList = payments || [];

  const totalReceived = payList.filter((p: any) => p.direction === 'RECEIVED').reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const totalPaid = payList.filter((p: any) => p.direction === 'PAID').reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const manualCost = costList.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const totalCost = totalPaid + manualCost;
  const billing = Number(c.customer_billing_amount || 0);
  const profit = billing - totalCost;
  const receivable = billing - totalReceived;

  const paidByCategory: Record<string, number> = {};
  payList.filter((p: any) => p.direction === 'PAID').forEach((p: any) => {
    const k = p.payment_for || 'OTHER';
    paidByCategory[k] = (paidByCategory[k] || 0) + Number(p.amount || 0);
  });

  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const colGap = 6;
  const colW = (pageW - margin * 2 - colGap) / 2;

  doc.setFontSize(15); doc.setFont(undefined, 'bold');
  doc.text('Consignment Report', pageW / 2, 14, { align: 'center' });
  doc.setFontSize(11); doc.setFont(undefined, 'normal');
  doc.text(`${c.consignment_code}  ·  ${STATUS_LABELS[c.status as keyof typeof STATUS_LABELS] || c.status}`, pageW / 2, 20, { align: 'center' });

  // Customer info short
  autoTable(doc, {
    startY: 25, theme: 'plain', styles: { fontSize: 9, cellPadding: 1 },
    body: [
      ['Customer:', c.customer?.name || '-', 'Route:', `${c.origin_country || '-'} → ${c.destination || '-'}`],
      ['Product:', c.product_name || '-', 'Mode:', c.shipment_mode || '-'],
      ['Qty:', `${c.quantity ?? '-'} ${c.unit || ''}`, 'ETA:', c.eta || c.expected_arrival_date || '-'],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 22 }, 1: { cellWidth: 70 }, 2: { fontStyle: 'bold', cellWidth: 22 }, 3: { cellWidth: 70 } },
  });

  const y = (doc as any).lastAutoTable.finalY + 4;

  // Left: Financial Summary
  autoTable(doc, {
    startY: y, margin: { left: margin, right: pageW - margin - colW },
    tableWidth: colW,
    head: [['Financial Summary', 'Amount']],
    body: [
      ['Customer Billing', billing.toLocaleString()],
      ['Total Cost', totalCost.toLocaleString()],
      ['Received', totalReceived.toLocaleString()],
      ['Receivable', receivable.toLocaleString()],
    ],
    foot: [[profit >= 0 ? 'Profit' : 'Loss', profit.toLocaleString()]],
    styles: { fontSize: 9 }, headStyles: { fillColor: [40, 60, 90] },
    footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
  });
  const leftEnd = (doc as any).lastAutoTable.finalY;

  // Right: Costing Breakdown
  const costRows: any[] = Object.entries(paidByCategory).map(([k, v]) => [k, Number(v).toLocaleString()]);
  costList.forEach((r: any) => costRows.push([`${r.cost_type}${r.description ? ' - ' + r.description : ''}`, Number(r.amount).toLocaleString()]));
  if (costRows.length === 0) costRows.push(['No costs recorded', '-']);
  autoTable(doc, {
    startY: y, margin: { left: margin + colW + colGap, right: margin },
    tableWidth: colW,
    head: [['Costing Breakdown', 'Amount']],
    body: costRows,
    foot: [['Total', totalCost.toLocaleString()]],
    styles: { fontSize: 9 }, headStyles: { fillColor: [40, 60, 90] },
    footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
  });
  const rightEnd = (doc as any).lastAutoTable.finalY;

  let yT = Math.max(leftEnd, rightEnd) + 6;
  doc.setFontSize(11); doc.setFont(undefined, 'bold');
  doc.text('Transactions', margin, yT);
  yT += 2;
  autoTable(doc, {
    startY: yT,
    head: [['Date', 'Direction', 'For', 'Method', 'Amount']],
    body: payList.length === 0
      ? [['-', '-', '-', '-', '-']]
      : payList.map((p: any) => [p.payment_date, p.direction, p.payment_for, p.payment_method || '-', Number(p.amount).toLocaleString()]),
    styles: { fontSize: 8 }, headStyles: { fillColor: [40, 60, 90] },
    columnStyles: { 4: { halign: 'right' } },
  });

  doc.save(`Consignment_${c.consignment_code}.pdf`);
}
