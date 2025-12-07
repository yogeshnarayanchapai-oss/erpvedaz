/**
 * Order Summary Generator
 * Generates a single-line, human-friendly order summary for clipboard copying.
 * Format: "{Customer Name} {Phone} {Address} {Product list} Qty: {total_qty} Rs.{total_amount} ({payment_method}) Order By: {order_by}"
 */

export interface OrderSummaryInput {
  customerName: string;
  phone: string;
  address: string;
  products: { name: string; quantity: number }[];
  totalAmount: number;
  paymentMethod: string; // COD, PAID, PENDING
  orderBy: string; // Staff name who created/confirmed the order
  deliveryLocation?: string; // 'inside-valley' or 'outside-valley'
  branch?: string; // Destination branch name
}

/**
 * Generates a multi-line order summary string for WhatsApp/clipboard
 * Format includes valley type header and structured fields
 */
export function generateOrderSummary(input: OrderSummaryInput): string {
  const { customerName, phone, address, products, totalAmount, paymentMethod, orderBy, deliveryLocation, branch } = input;

  // Determine valley type
  const isInsideValley = deliveryLocation === 'inside-valley';
  const valleyType = isInsideValley ? 'Inside' : 'Outside';

  // Format products: "ProductA x2, ProductB x1" or single product name with qty
  const productList = products.length === 1
    ? products[0].name
    : products.map(p => `${p.name} x${p.quantity}`).join(', ');

  // Calculate total quantity
  const totalQty = products.reduce((sum, p) => sum + p.quantity, 0);

  // Clean address - replace newlines with space and trim extra spaces
  const cleanAddress = (address || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Format payment method for display
  const paymentDisplay = paymentMethod === 'COD' ? 'COD' : 
                         paymentMethod === 'PAID' ? 'Paid' : 
                         paymentMethod === 'PENDING' ? 'Pending' : paymentMethod;

  // Build the multi-line summary
  const lines = [
    `Zivkart – ${valleyType} Valley Delivery Order`,
    '',
    `Customer: ${(customerName || '').trim()}`,
    `Phone: ${(phone || '').trim()}`,
    `Location: ${(branch || 'N/A').trim()}`,
    `Address: ${cleanAddress}`,
    '',
    `Product: ${productList}`,
    `Qty: ${totalQty}`,
    `Amount: Rs.${totalAmount.toLocaleString()} (${paymentDisplay})`,
    '',
    `Order By: ${(orderBy || 'N/A').trim()}`
  ];

  return lines.join('\n');
}

/**
 * Copies text to clipboard with fallback for older browsers
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

// ============= SERVER-SIDE HELPER (Node.js/Express compatible) =============
// This can be used in edge functions or Node.js backend

/**
 * Server-side helper to generate order summary string
 * Same logic as frontend, but designed for Node.js environment
 * 
 * Example usage in Express:
 * ```
 * const { generateOrderSummaryServer } = require('./orderSummary');
 * 
 * app.get('/api/orders/:id/summary', async (req, res) => {
 *   const order = await getOrder(req.params.id);
 *   const summary = generateOrderSummaryServer({
 *     customerName: order.customer_name,
 *     phone: order.phone,
 *     address: order.address,
 *     products: order.items.map(i => ({ name: i.product_name, quantity: i.quantity })),
 *     totalAmount: order.total,
 *     paymentMethod: order.payment_status,
 *     orderBy: order.sales_person_name
 *   });
 *   res.json({ summary });
 * });
 * ```
 */
export const generateOrderSummaryServer = generateOrderSummary;

// ============= EXAMPLE / TEST =============
/**
 * Example usage and expected output:
 * 
 * Input:
 * {
 *   customerName: "himn",
 *   phone: "9841502040",
 *   address: "Kathmandu, Nepal",
 *   products: [{ name: "Kesh Book Hair Oil", quantity: 2 }],
 *   totalAmount: 1499,
 *   paymentMethod: "COD",
 *   orderBy: "hari",
 *   deliveryLocation: "outside-valley",
 *   branch: "Chitwan Branch"
 * }
 * 
 * Expected Output:
 * "Zivkart – Outside Valley Delivery Order
 * 
 * Customer: himn
 * Phone: 9841502040
 * Location: Chitwan Branch
 * Address: Kathmandu, Nepal
 * 
 * Product: Kesh Book Hair Oil
 * Qty: 2
 * Amount: Rs.1,499 (COD)
 * 
 * Order By: hari"
 */
export function testOrderSummary(): { input: OrderSummaryInput; output: string; pass: boolean } {
  const input: OrderSummaryInput = {
    customerName: "himn",
    phone: "9841502040",
    address: "Kathmandu, Nepal",
    products: [{ name: "Kesh Book Hair Oil", quantity: 2 }],
    totalAmount: 1499,
    paymentMethod: "COD",
    orderBy: "hari",
    deliveryLocation: "outside-valley",
    branch: "Chitwan Branch"
  };
  
  const output = generateOrderSummary(input);
  const hasCorrectHeader = output.includes('Zivkart – Outside Valley Delivery Order');
  const hasCustomer = output.includes('Customer: himn');
  const hasPhone = output.includes('Phone: 9841502040');
  const hasLocation = output.includes('Location: Chitwan Branch');
  const hasProduct = output.includes('Product: Kesh Book Hair Oil');
  const hasQty = output.includes('Qty: 2');
  const hasAmount = output.includes('Rs.1,499 (COD)');
  const hasStaff = output.includes('Order By: hari');
  
  return {
    input,
    output,
    pass: hasCorrectHeader && hasCustomer && hasPhone && hasLocation && hasProduct && hasQty && hasAmount && hasStaff
  };
}
