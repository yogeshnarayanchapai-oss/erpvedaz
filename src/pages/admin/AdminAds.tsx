import { useState, useMemo, useEffect } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useAds, useCreateAd, useUpdateAd, useDeleteAd, useDefaultUsdRate, useUpdateDefaultUsdRate, Ad } from '@/hooks/useAds';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { useProductROI } from '@/hooks/useProductROI';
import { useAdSpendReference } from '@/hooks/useAdSpendReference';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangeFilter, DateRange } from '@/components/ui/DateRangeFilter';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Plus, Edit2, Trash2, DollarSign, Target, TrendingUp, ShoppingCart, Settings, BarChart3, FileSpreadsheet } from 'lucide-react';
import { FormattedDate } from '@/components/FormattedDate';
import { AdSpendReferenceModal } from '@/components/marketing/AdSpendReferenceModal';

export default function AdminAds() {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(today),
    to: endOfDay(today),
  });
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
  const dateTo = format(dateRange.to, 'yyyy-MM-dd');

  const { data: ads = [], isLoading } = useAds({
    dateFrom,
    dateTo,
    productId: selectedProduct !== 'all' ? selectedProduct : undefined,
  });
  const { data: products = [] } = useProducts();
  const { data: orders = [] } = useOrders({ dateFrom, dateTo });
  const { data: defaultUsdRate = 133.5 } = useDefaultUsdRate();
  const { data: roiData } = useProductROI({ dateFrom, dateTo });
  
  // Get reference spend sum for the selected date
  const { data: refSpendData = [] } = useAdSpendReference({ startDate: dateFrom, endDate: dateTo });

  const createAd = useCreateAd();
  const updateAd = useUpdateAd();
  const deleteAd = useDeleteAd();
  const updateDefaultRate = useUpdateDefaultUsdRate();

  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRefSpendOpen, setIsRefSpendOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [newDefaultRate, setNewDefaultRate] = useState('');
  const [formData, setFormData] = useState({
    date: format(today, 'yyyy-MM-dd'),
    platform: '',
    amount_usd: '',
    dollar_rate: '',
    target_orders: '',
  });

  // Auto-calculate NPR amount
  const calculatedNprAmount = useMemo(() => {
    const usd = parseFloat(formData.amount_usd) || 0;
    const rate = parseFloat(formData.dollar_rate) || 0;
    return usd * rate;
  }, [formData.amount_usd, formData.dollar_rate]);

  // Calculate reference USD sum for selected date
  const referenceUsdSum = useMemo(() => {
    return refSpendData.reduce((sum, item) => sum + item.amount, 0);
  }, [refSpendData]);

  // Pre-fill USD rate and reference amount when opening dialog
  useEffect(() => {
    if (isOpen && !editingAd) {
      setFormData(prev => ({ 
        ...prev, 
        dollar_rate: prev.dollar_rate || defaultUsdRate.toString(),
        amount_usd: referenceUsdSum > 0 ? referenceUsdSum.toString() : prev.amount_usd
      }));
    }
  }, [isOpen, editingAd, defaultUsdRate, referenceUsdSum]);

  const stats = useMemo(() => {
    // Use NPR amount (amount_spent) for all calculations
    const totalSpentNpr = ads.reduce((sum, ad) => sum + ad.amount_spent, 0);
    const totalSpentUsd = ads.reduce((sum, ad) => sum + (ad.amount_usd || 0), 0);
    const totalTargetOrders = ads.reduce((sum, ad) => sum + (ad.target_orders || 0), 0);
    
    let filteredOrders = orders.filter(o => o.order_status === 'CONFIRMED');
    if (selectedProduct !== 'all') {
      filteredOrders = filteredOrders.filter(o => o.product_id === selectedProduct);
    }
    const confirmedOrders = filteredOrders.length;
    const costPerOrder = confirmedOrders > 0 ? totalSpentNpr / confirmedOrders : 0;

    return { totalSpentNpr, totalSpentUsd, totalTargetOrders, confirmedOrders, costPerOrder };
  }, [ads, orders, selectedProduct]);

  // Get product ROI map for easy lookup in table
  const productRoiMap = useMemo(() => {
    const map = new Map<string, { revenue: number; roiMultiple: number; roiPercent: number }>();
    roiData?.products.forEach(p => {
      map.set(p.product_id, { revenue: p.revenue, roiMultiple: p.roi_multiple, roiPercent: p.roi_percent });
    });
    return map;
  }, [roiData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountUsd = parseFloat(formData.amount_usd) || 0;
    const dollarRate = parseFloat(formData.dollar_rate) || defaultUsdRate;
    const amountSpentNpr = amountUsd * dollarRate;

    const data = {
      product_id: null,
      date: formData.date,
      platform: formData.platform,
      amount_usd: amountUsd,
      dollar_rate: dollarRate,
      amount_spent: amountSpentNpr,
      target_orders: formData.target_orders ? parseInt(formData.target_orders) : null,
    };

    if (editingAd) {
      await updateAd.mutateAsync({ id: editingAd.id, ...data });
    } else {
      await createAd.mutateAsync(data);
    }

    setIsOpen(false);
    setEditingAd(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
      date: format(today, 'yyyy-MM-dd'), 
      platform: 'Facebook', 
      amount_usd: '', 
      dollar_rate: defaultUsdRate.toString(),
      target_orders: '' 
    });
  };

  const openEdit = (ad: Ad) => {
    setEditingAd(ad);
    setFormData({
      date: ad.date,
      platform: ad.platform,
      amount_usd: ad.amount_usd?.toString() || '',
      dollar_rate: ad.dollar_rate?.toString() || defaultUsdRate.toString(),
      target_orders: ad.target_orders?.toString() || '',
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      await deleteAd.mutateAsync(id);
    }
  };

  const handleSaveDefaultRate = async () => {
    const rate = parseFloat(newDefaultRate);
    if (rate > 0) {
      await updateDefaultRate.mutateAsync(rate);
      setIsSettingsOpen(false);
      setNewDefaultRate('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ads Spend</h1>
          <p className="text-muted-foreground">Track advertising spend with USD to NPR conversion</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Reference Spend Button */}
          <Button variant="outline" onClick={() => setIsRefSpendOpen(true)} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Reference Spend
          </Button>

          {/* Settings Dialog */}
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => setNewDefaultRate(defaultUsdRate.toString())}>
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ads Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Default USD Rate (NPR per $1)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={newDefaultRate}
                      onChange={(e) => setNewDefaultRate(e.target.value)}
                      placeholder="e.g. 133.5"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current default: ₹{defaultUsdRate} per $1
                  </p>
                </div>
                <Button 
                  onClick={handleSaveDefaultRate} 
                  className="w-full"
                  disabled={updateDefaultRate.isPending}
                >
                  Save Default Rate
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Spend Dialog */}
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) { setEditingAd(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingAd(null); resetForm(); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Spend
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingAd ? 'Edit Ad Spend' : 'Add Ad Spend'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Input
                      placeholder="e.g. Facebook, Google"
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                {/* Currency Section */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                      <DollarSign className="w-3 h-3 mr-1" />
                      USD
                    </Badge>
                    <span className="text-xs text-muted-foreground">→</span>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      ₹ NPR
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">$</Badge>
                        Amount (USD)
                        {referenceUsdSum > 0 && !editingAd && (
                          <span className="text-xs text-muted-foreground ml-1">(from ref: ${referenceUsdSum})</span>
                        )}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 10"
                        value={formData.amount_usd}
                        onChange={(e) => setFormData({ ...formData, amount_usd: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>USD Rate (NPR per $)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 133.5"
                        value={formData.dollar_rate}
                        onChange={(e) => setFormData({ ...formData, dollar_rate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center bg-green-500/10 text-green-600 border-green-500/20 text-xs">₹</Badge>
                      Final Amount (NPR)
                    </Label>
                    <Input
                      type="text"
                      value={`₹ ${calculatedNprAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      disabled
                      className="bg-green-500/5 font-semibold text-green-600"
                    />
                    <p className="text-xs text-muted-foreground">
                      ${formData.amount_usd || '0'} × {formData.dollar_rate || defaultUsdRate} = ₹{calculatedNprAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={createAd.isPending || updateAd.isPending}>
                  {editingAd ? 'Update' : 'Create'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard
          title="Total Spent (NPR)"
          value={`₹${stats.totalSpentNpr.toLocaleString()}`}
          icon={<span className="text-green-600 font-bold">₹</span>}
          variant="primary"
        />
        <StatCard
          title="Total Spent (USD)"
          value={`$${stats.totalSpentUsd.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5 text-blue-500" />}
          variant="info"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${(roiData?.overall.totalRevenue || 0).toLocaleString()}`}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          variant="success"
        />
        <StatCard
          title="Overall ROI"
          value={`${(roiData?.overall.roiMultiple || 0).toFixed(2)}x`}
          icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
          variant={roiData?.overall.roiMultiple && roiData.overall.roiMultiple >= 1 ? 'success' : 'warning'}
          description={`${(roiData?.overall.roiPercent || 0) >= 0 ? '+' : ''}${(roiData?.overall.roiPercent || 0).toFixed(0)}% net`}
        />
        <StatCard
          title="Confirmed Orders"
          value={stats.confirmedOrders}
          icon={<ShoppingCart className="w-5 h-5" />}
          variant="default"
        />
        <StatCard
          title="Cost per Order"
          value={`₹${stats.costPerOrder.toFixed(2)}`}
          icon={<Target className="w-5 h-5" />}
          variant="default"
        />
      </div>

      {/* Ads Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Ad Spend Records (with Product ROI)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header">Date</TableHead>
                  <TableHead className="table-header">Store</TableHead>
                  <TableHead className="table-header">Platform</TableHead>
                  <TableHead className="table-header text-right">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">$</Badge>
                    {' '}USD Amount
                  </TableHead>
                  <TableHead className="table-header text-right">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">₹</Badge>
                    {' '}NPR Amount
                  </TableHead>
                  <TableHead className="table-header text-right">Revenue (Rs)</TableHead>
                  <TableHead className="table-header text-right">ROI</TableHead>
                  <TableHead className="table-header w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.map((ad) => {
                  const productRoi = ad.product_id ? productRoiMap.get(ad.product_id) : null;
                  return (
                    <TableRow key={ad.id}>
                      <TableCell>
                        <FormattedDate date={ad.date} />
                      </TableCell>
                      <TableCell className="font-medium">{ad.store?.name || '-'}</TableCell>
                      <TableCell>{ad.platform}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-blue-600 font-medium">
                          ${(ad.amount_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600 font-semibold">
                          ₹{ad.amount_spent.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {productRoi ? (
                          <span className="font-medium">₹{productRoi.revenue.toLocaleString()}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {productRoi && productRoi.roiMultiple > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className={`font-bold ${productRoi.roiMultiple >= 1 ? 'text-green-600' : 'text-orange-600'}`}>
                              {productRoi.roiMultiple.toFixed(2)}x
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {productRoi.roiPercent >= 0 ? '+' : ''}{productRoi.roiPercent.toFixed(0)}%
                            </span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(ad)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(ad.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {ads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No ad spend records found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reference Spend Modal */}
      <AdSpendReferenceModal open={isRefSpendOpen} onOpenChange={setIsRefSpendOpen} />
    </div>
  );
}
