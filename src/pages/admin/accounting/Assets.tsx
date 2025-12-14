import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAccountingAssets, useAccountingAssetTotal } from '@/hooks/useAccountingAssets';
import { format } from 'date-fns';
import { Package, TrendingUp } from 'lucide-react';

export default function Assets() {
  const { data: assets = [], isLoading } = useAccountingAssets();
  const { data: totalAssetValue = 0 } = useAccountingAssetTotal();

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assets</h1>
          <p className="text-muted-foreground">Company assets from transactions</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Asset Value</CardTitle>
            <Package className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              NPR {totalAssetValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sum of all asset transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets Count</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assets.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Number of asset entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cleared Assets</CardTitle>
            <Package className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {assets.filter(a => a.is_cleared).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              NPR {assets.filter(a => a.is_cleared).reduce((s, a) => s + a.amount, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No asset transactions found.</p>
              <p className="text-sm">
                Create a transaction with "Asset" category to see it here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>{format(new Date(asset.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-medium">{asset.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{asset.category_name}</Badge>
                    </TableCell>
                    <TableCell>{asset.account_name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{asset.reference_no || '-'}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      NPR {asset.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={asset.is_cleared ? 'default' : 'secondary'}>
                        {asset.is_cleared ? 'Cleared' : 'Pending'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
