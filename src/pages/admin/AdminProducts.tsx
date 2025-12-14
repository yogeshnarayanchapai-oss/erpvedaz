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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    opening_stock: '',
    warehouse_id: '',
  });

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // Get existing inventory for the editing product
  const existingInventory = useMemo(() => {
    if (!editingProduct || !inventoryData.length) return null;
    return inventoryData.find(inv => inv.product_id === editingProduct.id);
  }, [editingProduct, inventoryData]);

  // Update form when existing inventory is found
  useEffect(() => {
    if (existingInventory && editingProduct) {
      setFormData(prev => ({
        ...prev,
        opening_stock: existingInventory.opening_stock?.toString() || '',
        warehouse_id: existingInventory.warehouse_id || '',
      }));
    }
  }, [existingInventory, editingProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: formData.name,
      target_per_day: formData.target_per_day ? parseInt(formData.target_per_day) : null,
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
      sell_price: formData.sell_price ? parseFloat(formData.sell_price) : null,
      wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : null,
    };

    const openingStock = formData.opening_stock ? parseFloat(formData.opening_stock) : 0;

    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...data });
      
      // Update or create inventory record for existing product
      if (formData.warehouse_id) {
        if (existingInventory) {
          // Update existing inventory
          const stockDiff = openingStock - (existingInventory.opening_stock || 0);
          await updateInventory.mutateAsync({
            id: existingInventory.id,
            opening_stock: openingStock,
            current_stock: (existingInventory.current_stock || 0) + stockDiff,
          });
        } else {
          // Create new inventory record
          await createInventory.mutateAsync({
            product_id: editingProduct.id,
            warehouse_id: formData.warehouse_id,
            opening_stock: openingStock,
            current_stock: openingStock,
            reorder_level: 0,
            reorder_required: false,
          });
        }
      }
    } else {
      const newProduct = await createProduct.mutateAsync(data);
      
      // Create inventory record if opening stock and warehouse provided
      if (formData.warehouse_id && newProduct) {
        await createInventory.mutateAsync({
          product_id: newProduct.id,
          warehouse_id: formData.warehouse_id,
          opening_stock: openingStock,
          current_stock: openingStock,
          reorder_level: 0,
          reorder_required: false,
        });
      }
    }

    setIsOpen(false);
    setEditingProduct(null);
    setFormData({ name: '', target_per_day: '', cost_price: '', sell_price: '', wholesale_price: '', opening_stock: '', warehouse_id: '' });
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      target_per_day: product.target_per_day?.toString() || '',
      cost_price: product.cost_price?.toString() || '',
      sell_price: product.sell_price?.toString() || '',
      wholesale_price: product.wholesale_price?.toString() || '',
      opening_stock: '',
      warehouse_id: '',
    });
    setIsOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-muted-foreground">Manage product catalog and pricing</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingProduct(null); setFormData({ name: '', target_per_day: '', cost_price: '', sell_price: '', wholesale_price: '', opening_stock: '', warehouse_id: '' }); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                
                {/* Opening Stock section */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="warehouse">Warehouse</Label>
                    <Select
                      value={formData.warehouse_id}
                      onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id}>
                            {wh.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="opening_stock">Opening Stock</Label>
                    <Input
                      id="opening_stock"
                      type="number"
                      value={formData.opening_stock}
                      onChange={(e) => setFormData({ ...formData, opening_stock: e.target.value })}
                      placeholder="0"
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
        <div className="relative max-w-md">
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Product Catalog
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
