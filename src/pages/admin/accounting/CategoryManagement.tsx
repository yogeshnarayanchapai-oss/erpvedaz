import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTransactionCategories, useCreateTransactionCategory, useDeleteTransactionCategory } from '@/hooks/useTransactionCategories';
import { useAccountingEditAccess } from '@/hooks/useAccountingEditAccess';
import { Plus, Trash2, DollarSign, Receipt, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

export default function CategoryManagement() {
  const { canEdit } = useAccountingEditAccess();
  const { data: incomeCategories = [], isLoading: loadingIncome } = useTransactionCategories('income');
  const { data: expenseCategories = [], isLoading: loadingExpense } = useTransactionCategories('expense');
  const createCategory = useCreateTransactionCategory();
  const deleteCategory = useDeleteTransactionCategory();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>('income');
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await createCategory.mutateAsync({
      name: newCategoryName.trim(),
      nature: categoryType,
    });
    setNewCategoryName('');
    setIsAddOpen(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      await deleteCategory.mutateAsync(id);
    }
  };

  const CategoryTable = ({ categories, type }: { categories: typeof incomeCategories; type: 'income' | 'expense' }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Created</TableHead>
          {canEdit && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.length === 0 && (
          <TableRow>
            <TableCell colSpan={canEdit ? 4 : 3} className="text-center py-8 text-muted-foreground">
              No {type} categories found. Add one to get started.
            </TableCell>
          </TableRow>
        )}
        {categories.map((category) => (
          <TableRow key={category.id}>
            <TableCell className="font-medium">{category.name}</TableCell>
            <TableCell>
              <Badge variant={type === 'income' ? 'default' : 'secondary'}>
                {type === 'income' ? 'Income' : 'Expense'}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(category.created_at), 'dd/MM/yyyy')}
            </TableCell>
            {canEdit && (
              <TableCell className="text-right">
                {!category.is_system && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCategory(category.id)}
                    disabled={deleteCategory.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
                {category.is_system && (
                  <span className="text-xs text-muted-foreground">System</span>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Category Management</h1>
          <p className="text-muted-foreground">Manage income and expense categories</p>
        </div>
        {canEdit && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Category Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={categoryType === 'income' ? 'default' : 'outline'}
                      onClick={() => setCategoryType('income')}
                      className="flex-1"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Income
                    </Button>
                    <Button
                      type="button"
                      variant={categoryType === 'expense' ? 'default' : 'outline'}
                      onClick={() => setCategoryType('expense')}
                      className="flex-1"
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Expense
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAddCategory} disabled={createCategory.isPending || !newCategoryName.trim()}>
                    {createCategory.isPending ? 'Adding...' : 'Add Category'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!canEdit && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-4 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              You have view-only access. Only OWNER and ACCOUNTANT roles can add or delete categories.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="income" className="w-full">
        <TabsList>
          <TabsTrigger value="income" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Income Categories ({incomeCategories.length})
          </TabsTrigger>
          <TabsTrigger value="expense" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Expense Categories ({expenseCategories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Income Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingIncome ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : (
                <CategoryTable categories={incomeCategories} type="income" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expense">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-red-600" />
                Expense Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingExpense ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : (
                <CategoryTable categories={expenseCategories} type="expense" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
