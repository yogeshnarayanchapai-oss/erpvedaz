import { useState, useMemo, useEffect } from 'react';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { useActiveWarehouses } from '@/hooks/useWarehouses';
import { useCreateInventory, useUpdateInventory, useInventory } from '@/hooks/useInventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Package, Plus, Edit2, Search, Trash2 } from 'lucide-react';

export default function AdminProducts() {
  const { data: products = [], isLoading } = useProducts();
  const { data: warehouses = [] } = useActiveWarehouses();
  const { data: inventoryData = [] } = useInventory();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createInventory = useCreateInventory();
  const updateInventory = useUpdateInventory();
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    target_per_day: '',
    cost_price: '',
    sell_price: '',
    wholesale_price: '',
  });
  const [warehouseStocks, setWarehouseStocks] = useState<Record<string, string>>({});

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // Get existing inventory for the editing product (all warehouses)
  const productInventoryMap = useMemo(() => {
    if (!editingProduct || !inventoryData.length) return {};
    const map: Record<string, { id: string; opening_stock: number; current_stock: number }> = {};
    inventoryData
      .filter(inv => inv.product_id === editingProduct.id)
      .forEach(inv => {
        map[inv.warehouse_id] = {
          id: inv.id,
          opening_stock: inv.opening_stock || 0,
          current_stock: inv.current_stock || 0,
        };
      });
    return map;
  }, [editingProduct, inventoryData]);

  // Update warehouse stocks when editing product changes
  useEffect(() => {
    if (editingProduct && warehouses.length) {
      const stocks: Record<string, string> = {};
      warehouses.forEach(wh => {
        const inv = productInventoryMap[wh.id];
        stocks[wh.id] = inv ? inv.opening_stock.toString() : '';
      });
      setWarehouseStocks(stocks);
    }
  }, [editingProduct, productInventoryMap, warehouses]);

  const resetForm = () => {
    setFormData({ name: '', target_per_day: '', cost_price: '', sell_price: '', wholesale_price: '' });
    setWarehouseStocks({});
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: formData.name,
      target_per_day: formData.target_per_day ? parseInt(formData.target_per_day) : null,
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
      sell_price: formData.sell_price ? parseFloat(formData.sell_price) : null,
      wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : null,
    };

    let productId = editingProduct?.id;

    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...data });
    } else {
      const newProduct = await createProduct.mutateAsync(data);
      productId = newProduct?.id;
    }

    // Update or create inventory records for each warehouse
    if (productId) {
      for (const wh of warehouses) {
        const stockValue = warehouseStocks[wh.id];
        const openingStock = stockValue ? parseFloat(stockValue) : 0;
        const existingInv = productInventoryMap[wh.id];

        if (openingStock > 0 || existingInv) {
          if (existingInv) {
            // Update existing inventory
            const stockDiff = openingStock - existingInv.opening_stock;
            await updateInventory.mutateAsync({
              id: existingInv.id,
              opening_stock: openingStock,
              current_stock: existingInv.current_stock + stockDiff,
            });
          } else if (openingStock > 0) {
            // Create new inventory record
            await createInventory.mutateAsync({
              product_id: productId,
              warehouse_id: wh.id,
              opening_stock: openingStock,
              current_stock: openingStock,
              reorder_level: 0,
              reorder_required: false,
            });
          }
        }
      }
    }

    setIsOpen(false);
    resetForm();
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      target_per_day: product.target_per_day?.toString() || '',
      cost_price: product.cost_price?.toString() || '',
      sell_price: product.sell_price?.toString() || '',
      wholesale_price: product.wholesale_price?.toString() || '',
    });
    setIsOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Products</h1>
            <p className="text-sm text-muted-foreground">Manage product catalog and pricing</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} size="sm" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-4 sm:mx-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target">Daily Target</Label>
                    <Input
                      id="target"
                      type="number"
                      value={formData.target_per_day}
                      onChange={(e) => setFormData({ ...formData, target_per_day: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost Price</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sell">Sell Price (Retail)</Label>
                    <Input
                      id="sell"
                      type="number"
                      step="0.01"
                      value={formData.sell_price}
                      onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wholesale">Wholesale Price</Label>
                    <Input
                      id="wholesale"
                      type="number"
                      step="0.01"
                      value={formData.wholesale_price}
                      onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={createProduct.isPending || updateProduct.isPending || createInventory.isPending}>
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Package className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            Product Catalog
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {/* Mobile card view */}
          <div className="md:hidden space-y-2 p-4 pt-0">
            {filteredProducts.length === 0 && !isLoading && (
              <p className="text-center py-8 text-muted-foreground text-sm">
                {searchQuery ? 'No products found matching your search' : 'No products found'}
              </p>
            )}
            {isLoading && <p className="text-center py-8 text-muted-foreground text-sm">Loading...</p>}
            {filteredProducts.map((product) => {
              const margin = (product.sell_price && product.cost_price)
                ? ((product.sell_price - product.cost_price) / product.sell_price * 100).toFixed(1)
                : '-';
              return (
                <Card key={product.id} className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-sm">{product.name}</p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(product)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-sm mx-4">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Product</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{product.name}"?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteProduct.mutate(product.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Target</span>
                      <p className="font-medium">{product.target_per_day || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cost</span>
                      <p className="font-medium">₹{product.cost_price?.toFixed(0) || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sell</span>
                      <p className="font-medium">₹{product.sell_price?.toFixed(0) || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs">
                    <span className="text-muted-foreground">Wholesale: ₹{product.wholesale_price?.toFixed(0) || '-'}</span>
                    <span className="text-success font-medium">Margin: {margin}%</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header">Product Name</TableHead>
                  <TableHead className="table-header text-right">Target/Day</TableHead>
                  <TableHead className="table-header text-right">Cost Price</TableHead>
                  <TableHead className="table-header text-right">Sell Price</TableHead>
                  <TableHead className="table-header text-right">Wholesale</TableHead>
                  <TableHead className="table-header text-right">Margin</TableHead>
                  <TableHead className="table-header w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No products found matching your search' : 'No products found'}
                    </TableCell>
                  </TableRow>
                )}
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
                {filteredProducts.map((product) => {
                  const margin = (product.sell_price && product.cost_price)
                    ? ((product.sell_price - product.cost_price) / product.sell_price * 100).toFixed(1)
                    : '-';
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">{product.target_per_day || '-'}</TableCell>
                      <TableCell className="text-right">₹{product.cost_price?.toFixed(2) || '-'}</TableCell>
                      <TableCell className="text-right">₹{product.sell_price?.toFixed(2) || '-'}</TableCell>
                      <TableCell className="text-right">₹{product.wholesale_price?.toFixed(2) || '-'}</TableCell>
                      <TableCell className="text-right text-success">{margin}%</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(product)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteProduct.mutate(product.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
