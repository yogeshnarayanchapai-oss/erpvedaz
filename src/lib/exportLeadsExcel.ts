import * as XLSX from 'xlsx';

export function exportLeadsToExcel(leads: any[], filename?: string) {
  if (!leads || leads.length === 0) return;
  const rows = leads.map((lead, idx) => ({
    'S.No': idx + 1,
    'Ref ID': lead.reference_id || '',
    'Date': lead.date || '',
    'Customer Name': lead.client_name || '',
    'Contact Number': lead.contact_number || '',
    'Alt Phone': lead.alt_phone || '',
    'Product': lead.products?.name || lead.product?.name || '',
    'Branch': lead.branch || lead.branches?.name || '',
    'Source': lead.source || '',
    'Status': lead.status || '',
    'Cancel Reason': lead.cancel_reason || '',
    'Assigned To': lead.assigned_to?.name || lead.assigned_to_profile?.name || '',
    'Current Team': lead.current_team || '',
    'Remark': lead.remark || '',
    'Address': lead.address || '',
    'Created At': lead.created_at ? new Date(lead.created_at).toLocaleString() : '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  const ts = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, filename || `leads_${ts}.xlsx`);
}
