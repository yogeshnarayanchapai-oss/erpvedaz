import * as XLSX from 'xlsx';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number?: number;
  amount: number | null;
  quantity?: number;
  full_address?: string | null;
  leads?: {
    client_name: string;
    contact_number: string;
    alt_phone?: string | null;
    full_address?: string | null;
    reference_id?: string | null;
  } | null;
  customers?: {
    customer_name?: string;
    phone_number: string;
    full_address?: string | null;
    city?: string;
  } | null;
  branches?: {
    branch_name: string;
  } | null;
  destination_branch?: string | null;
  products?: {
    name: string;
  } | null;
  delivery_notes?: string | null;
  order_items?: OrderItem[];
  confirmed_by_profile?: {
    name?: string | null;
  } | null;
  sales_person?: {
    name?: string | null;
  } | null;
  created_by_staff?: {
    name?: string | null;
  } | null;
}

export function exportOrdersToCourierFormat(orders: Order[], filename = 'courier_orders.xlsx') {
  const rows = orders.map((order, index) => {
    const customerName = order.leads?.client_name || order.customers?.customer_name || 'N/A';
    const phone = order.leads?.contact_number || order.customers?.phone_number || 'N/A';
    const altPhone = order.leads?.alt_phone || '';
    const address = order.full_address || order.leads?.full_address || order.customers?.full_address || 'N/A';
    const city = order.customers?.city || '';
    const deliveryInstruction = order.delivery_notes || '';
    
    // Staff name: prefer confirmed_by, fallback to sales_person, then created_by_staff
    const staffName = order.confirmed_by_profile?.name || order.sales_person?.name || order.created_by_staff?.name || 'N/A';
    
    // Lead reference ID
    const leadRefId = order.leads?.reference_id || '';
    
    // Format: "Staff Name #ReferenceID" or just "Staff Name" if no reference ID
    const referenceId = leadRefId ? `${staffName} #${leadRefId}` : staffName;

    // Calculate COD and product description from order_items if available
    const orderItemsList = order.order_items || [];
    let cod: number;
    let productDesc: string;

    if (orderItemsList.length > 0) {
      // Multi-product order: sum total prices and list all products
      cod = orderItemsList.reduce((sum, item) => sum + (item.total_price || 0), 0);
      productDesc = orderItemsList.map(item => `${item.product_name} x${item.quantity}`).join(', ');
    } else {
      // Legacy single-product order
      cod = (order.amount || 0) * (order.quantity || 1);
      productDesc = order.products?.name || 'Product';
    }

    return {
      'S.N': index + 1,
      'Source Branch': 'HEAD OFFICE',
      'Destination Branch': order.destination_branch || order.branches?.branch_name || 'N/A',
      'Customer Name': customerName,
      'Full Address': address,
      'Municipality': city,
      'Phone Number': phone,
      'Alt Phone Number': altPhone,
      'Package Access': "Can't Open",
      'COD': cod,
      'Delivery Instruction': deliveryInstruction,
      'Order Description': productDesc,
      'Vendor Reference ID': referenceId,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // S.N
    { wch: 15 }, // Source Branch
    { wch: 25 }, // Destination Branch
    { wch: 20 }, // Customer Name
    { wch: 40 }, // Full Address
    { wch: 15 }, // Municipality
    { wch: 15 }, // Phone Number
    { wch: 15 }, // Alt Phone Number
    { wch: 15 }, // Package Access
    { wch: 12 }, // COD
    { wch: 30 }, // Delivery Instruction
    { wch: 40 }, // Order Description - wider for multi-products
    { wch: 25 }, // Vendor Reference ID - wider for "Staff Name #RefID"
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
  XLSX.writeFile(workbook, filename);
}
