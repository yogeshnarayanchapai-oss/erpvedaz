/**
 * Renders a message template by replacing placeholders with actual values.
 * Placeholders are in the format {{placeholder_name}}
 */
export function renderTemplate(template: string, data: Record<string, string | number | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    return value !== undefined && value !== null ? String(value) : match;
  });
}

/**
 * Sample data for template preview
 */
export const SAMPLE_DATA: Record<string, string> = {
  customer_name: 'Ram Shrestha',
  customer_phone: '9801234567',
  product_name: 'Premium Widget',
  staff_name: 'Sita Sharma',
  assigned_date: '2025-11-30',
  old_status: 'NEW',
  new_status: 'CONFIRMED',
  order_code: 'ORD-12345',
  amount: 'Rs. 2,500',
  address: 'Kathmandu, Nepal',
  reseller_name: 'ABC Traders',
  reseller_phone: '9851234567',
  quantity: '10',
  ticket_code: 'TKT-001',
  subject: 'Delivery Issue',
  resolution: 'Resolved - Replacement sent',
};

/**
 * Preview a template with sample data
 */
export function previewTemplate(template: string): string {
  return renderTemplate(template, SAMPLE_DATA);
}
