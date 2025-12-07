import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { SearchableProductSelect } from './SearchableProductSelect';

export interface ProductLine {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

interface MultiProductSelectorProps {
  items: ProductLine[];
  onChange: (items: ProductLine[]) => void;
  disabled?: boolean;
}

export function MultiProductSelector({ items, onChange, disabled }: MultiProductSelectorProps) {
  const { data: products = [], isLoading } = useProducts();

  const addProduct = () => {
    const newItem: ProductLine = {
      id: crypto.randomUUID(),
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      discount: 0,
    };
    onChange([...items, newItem]);
  };

  const removeProduct = (id: string) => {
    if (items.length <= 1) return;
    onChange(items.filter(item => item.id !== id));
  };

  const updateProduct = (id: string, updates: Partial<ProductLine>) => {
    onChange(items.map(item => {
      if (item.id !== id) return item;
      return { ...item, ...updates };
    }));
  };

  const handleProductSelect = (id: string, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      updateProduct(id, {
        product_id: productId,
        product_name: product.name,
        unit_price: product.sell_price || 0,
      });
    }
  };

  const handleQuantityChange = (id: string, quantity: number) => {
    updateProduct(id, { quantity: Math.max(1, quantity) });
  };

  const handlePriceChange = (id: string, price: number) => {
    updateProduct(id, { unit_price: Math.max(0, price) });
  };

  const handleDiscountChange = (id: string, discount: number) => {
    updateProduct(id, { discount: Math.max(0, discount) });
  };

  const getLineTotal = (item: ProductLine) => {
    const subtotal = item.quantity * item.unit_price;
    return Math.max(0, subtotal - (item.discount || 0));
  };

  const grandTotal = items.reduce((sum, item) => sum + getLineTotal(item), 0);
  const totalDiscount = items.reduce((sum, item) => sum + (item.discount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Products</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addProduct}
          disabled={disabled || isLoading}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Product
        </Button>
      </div>

      <div className="space-y-3">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-4">Product</div>
          <div className="col-span-2">Qty</div>
          <div className="col-span-2">Price</div>
          <div className="col-span-2">Discount</div>
          <div className="col-span-1">Total</div>
          <div className="col-span-1"></div>
        </div>

        {/* Product rows */}
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-4">
              <SearchableProductSelect
                products={products}
                value={item.product_id}
                onSelect={(productId) => handleProductSelect(item.id, productId)}
                disabled={disabled}
                className="h-9 w-full"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                className="h-9"
                disabled={disabled}
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min="0"
                value={item.unit_price}
                onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0)}
                className="h-9"
                disabled={disabled}
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min="0"
                value={item.discount || 0}
                onChange={(e) => handleDiscountChange(item.id, parseFloat(e.target.value) || 0)}
                className="h-9"
                disabled={disabled}
                placeholder="0"
              />
            </div>
            <div className="col-span-1 text-sm font-medium">
              Rs. {getLineTotal(item).toLocaleString()}
            </div>
            <div className="col-span-1">
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProduct(item.id)}
                  disabled={disabled}
                  className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="flex flex-col items-end pt-2 border-t gap-1">
        {totalDiscount > 0 && (
          <div className="text-right text-sm text-muted-foreground">
            Total Discount: <span className="text-destructive">-Rs. {totalDiscount.toLocaleString()}</span>
          </div>
        )}
        <div className="text-right">
          <span className="text-sm text-muted-foreground mr-4">Grand Total:</span>
          <span className="text-lg font-bold">Rs. {grandTotal.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// Helper to convert ProductLines to OrderItemInput
export function productLinesToOrderItems(items: ProductLine[]) {
  return items
    .filter(item => item.product_id)
    .map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount || 0,
    }));
}

// Helper to create initial product line
export function createEmptyProductLine(): ProductLine {
  return {
    id: crypto.randomUUID(),
    product_id: '',
    product_name: '',
    quantity: 1,
    unit_price: 0,
    discount: 0,
  };
}

// Helper to calculate grand total (with discount)
export function calculateGrandTotal(items: ProductLine[]): number {
  return items.reduce((sum, item) => {
    const subtotal = item.quantity * item.unit_price;
    return sum + Math.max(0, subtotal - (item.discount || 0));
  }, 0);
}
