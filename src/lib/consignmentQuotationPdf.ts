import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface QuotationLine {
  label: string;
  value: string | number;
}

export interface QuotationData {
  productName: string;
  hsCode: string;
  taxRate: number;       // %
  duty: number;          // %
  vat: number;           // %
  grossWeight: number;   // kg
  ratePerPcs: number;    // INR per unit
  totalQty: number;      // pcs or kg
  exchangeRate: number;  // INR -> NPR
  transportIndia: number;
  customAgent: number;
  borderTransport: number;
  bankCharge: number;
  insurance: number;
  nepalTransport: number;
  serviceChargePct: number; // %
  notes?: string;
}

export interface QuotationCompany {
  company_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  registration_no?: string;
  logo_url?: string;
}

export interface QuotationCustomer {
  name?: string;
  phone?: string;
  address?: string;
}

export function computeQuotation(d: QuotationData) {
  const productPriceINR = (d.ratePerPcs || 0) * (d.totalQty || 0);
  const productPriceNPR = productPriceINR * (d.exchangeRate || 0);
  const subTotal1 = productPriceNPR + (d.transportIndia || 0); // before tax
  const taxAmt = subTotal1 * ((d.taxRate || 0) / 100);
  const afterTax = subTotal1 + taxAmt;
  const dutyAmt = afterTax * ((d.duty || 0) / 100);
  const afterDuty = afterTax + dutyAmt;
  const vatAmt = afterDuty * ((d.vat || 0) / 100);
  const afterVat = afterDuty + vatAmt;
  const overheads = (d.customAgent || 0) + (d.borderTransport || 0) + (d.bankCharge || 0) + (d.insurance || 0) + (d.nepalTransport || 0);
  const beforeService = afterVat + overheads;
  const serviceCharge = beforeService * ((d.serviceChargePct || 0) / 100);
  const grandTotal = beforeService + serviceCharge;
  return { productPriceINR, productPriceNPR, taxAmt, dutyAmt, vatAmt, overheads, serviceCharge, grandTotal };
}

const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

async function loadImageAsDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateQuotationPDF(opts: {
  data: QuotationData;
  company: QuotationCompany;
  customer?: QuotationCustomer;
  terms: string[];
  quotationNo?: string;
}) {
  const { data, company, customer, terms, quotationNo } = opts;
  const calc = computeQuotation(data);
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 14;

  // Logo
  if (company.logo_url) {
    const dataUrl = await loadImageAsDataURL(company.logo_url);
    if (dataUrl) {
      try { doc.addImage(dataUrl, 'PNG', margin, y, 22, 22); } catch {}
    }
  }

  // Title centered
  doc.setFontSize(18); doc.setFont(undefined, 'bold');
  doc.text('ESTIMATE QUOTATION', pageW / 2, y + 8, { align: 'center' });

  // Company info (right side)
  doc.setFontSize(10); doc.setFont(undefined, 'bold');
  doc.text(company.company_name || 'Company', pageW - margin, y + 4, { align: 'right' });
  doc.setFont(undefined, 'normal'); doc.setFontSize(8);
  const lines = [
    company.address,
    [company.phone, company.email].filter(Boolean).join(' · '),
    company.website,
    company.registration_no ? `Reg: ${company.registration_no}` : '',
  ].filter(Boolean) as string[];
  lines.forEach((t, i) => doc.text(t, pageW - margin, y + 9 + i * 4, { align: 'right' }));

  y += 28;
  doc.setDrawColor(180); doc.line(margin, y, pageW - margin, y); y += 4;

  // Meta line
  doc.setFontSize(9);
  doc.text(`Quotation No: ${quotationNo || '-'}`, margin, y);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, pageW - margin, y, { align: 'right' });
  y += 5;
  if (customer?.name) {
    doc.setFont(undefined, 'bold'); doc.text('To:', margin, y); doc.setFont(undefined, 'normal');
    doc.text(`${customer.name}${customer.phone ? ' · ' + customer.phone : ''}`, margin + 10, y);
    y += 4;
    if (customer.address) { doc.text(customer.address, margin + 10, y); y += 4; }
  }
  y += 2;

  // Items table
  const rows: any[] = [
    ['Product name', data.productName || '-'],
    ['HS Code', data.hsCode || '-'],
    ['Gross weight (kg)', fmt(data.grossWeight)],
    ['Total rate per pcs (INR)', fmt(data.ratePerPcs)],
    ['Total qty (kg/pcs)', fmt(data.totalQty)],
    ['Product price (INR)', fmt(calc.productPriceINR)],
    [`Product price (NPR) @ ${data.exchangeRate}`, fmt(calc.productPriceNPR)],
    ['Transportation (India)', fmt(data.transportIndia)],
    ['Sub Total', fmt(calc.productPriceNPR + data.transportIndia)],
    [`Tax (${data.taxRate}%)`, fmt(calc.taxAmt)],
    [`Duty (${data.duty}%)`, fmt(calc.dutyAmt)],
    [`VAT (${data.vat}%)`, fmt(calc.vatAmt)],
    ['Custom agent (India+Nepal)', fmt(data.customAgent)],
    ['Border transportation', fmt(data.borderTransport)],
    ['Bank charge', fmt(data.bankCharge)],
    ['Insurance', fmt(data.insurance)],
    ['Nepal transportation', fmt(data.nepalTransport)],
    [`Service charge (${data.serviceChargePct}%)`, fmt(calc.serviceCharge)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Amount']],
    body: rows,
    foot: [['Total Amount (approx.)', fmt(calc.grandTotal)]],
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [40, 60, 90] },
    footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold', fontSize: 10 },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Terms
  if (terms && terms.length) {
    if (y > 240) { doc.addPage(); y = 14; }
    doc.setFontSize(10); doc.setFont(undefined, 'bold');
    doc.text('Terms & Conditions', margin, y); y += 4;
    doc.setFont(undefined, 'normal'); doc.setFontSize(8);
    terms.forEach((t, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${t}`, pageW - margin * 2);
      if (y + lines.length * 4 > 280) { doc.addPage(); y = 14; }
      doc.text(lines, margin, y);
      y += lines.length * 4 + 1;
    });
  }

  // Disclaimer footer
  if (y > 270) { doc.addPage(); y = 14; }
  y += 4;
  doc.setDrawColor(200); doc.line(margin, y, pageW - margin, y); y += 4;
  doc.setFontSize(8); doc.setFont(undefined, 'italic'); doc.setTextColor(110);
  const disclaimer = 'This quotation is system generated and is an estimate only. Final amounts may change until the goods are delivered, based on actual exchange rate, duties, transportation, and other government charges at the time of delivery.';
  const dLines = doc.splitTextToSize(disclaimer, pageW - margin * 2);
  doc.text(dLines, margin, y);

  doc.save(`Quotation_${(data.productName || 'item').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
