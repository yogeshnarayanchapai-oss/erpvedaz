import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, ShoppingCart, TrendingUp, Megaphone, Video, Target } from "lucide-react";
import { useAds } from "@/hooks/useAds";
import { useCampaigns, useCampaignStats } from "@/hooks/useCampaigns";
import { useVideoProjects } from "@/hooks/useVideoProjects";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

const DATE_RANGES = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Last 30 Days", value: "30days" },
];

export default function MarketingReports() {
  const [dateRange, setDateRange] = useState("month");
  
  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case "today":
        return { start: today, end: today };
      case "week":
        return { start: subDays(today, 7), end: today };
      case "30days":
        return { start: subDays(today, 30), end: today };
      case "month":
      default:
        return { start: startOfMonth(today), end: endOfMonth(today) };
    }
  };

  const { start, end } = getDateRange();
  const startDate = format(start, "yyyy-MM-dd");
  const endDate = format(end, "yyyy-MM-dd");

  const { data: ads } = useAds({});
  const { data: campaigns } = useCampaigns();
  const { data: campaignStats } = useCampaignStats();
  const { data: videoProjects } = useVideoProjects({ status: "Posted" });

  // Calculate totals
  const totalAdSpendNPR = ads?.reduce((sum, ad) => sum + (ad.amount_spent || 0), 0) || 0;
  const totalAdSpendUSD = ads?.reduce((sum, ad) => sum + (ad.amount_usd || 0), 0) || 0;
  const totalTargetOrders = ads?.reduce((sum, ad) => sum + (ad.target_orders || 0), 0) || 0;

  // Group by platform
  const spendByPlatform = ads?.reduce((acc: Record<string, number>, ad) => {
    const platform = ad.platform || "Other";
    acc[platform] = (acc[platform] || 0) + (ad.amount_spent || 0);
    return acc;
  }, {}) || {};

  // Group by product
  const spendByProduct = ads?.reduce((acc: Record<string, { spend: number; target: number }>, ad) => {
    const product = ad.product_id || "Unknown";
    if (!acc[product]) acc[product] = { spend: 0, target: 0 };
    acc[product].spend += ad.amount_spent || 0;
    acc[product].target += ad.target_orders || 0;
    return acc;
  }, {}) || {};

  const formatCurrency = (amount: number, currency: string = "NPR") => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Reports</h1>
          <p className="text-muted-foreground">Overview of marketing performance and spend</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ad Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAdSpendNPR)}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalAdSpendUSD, "USD")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target Orders</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTargetOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost per Target</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTargetOrders > 0 ? formatCurrency(Math.round(totalAdSpendNPR / totalTargetOrders)) : "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaignStats?.activeCampaigns || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos Posted</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videoProjects?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ad Records</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ads?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spend by Platform */}
        <Card>
          <CardHeader>
            <CardTitle>Spend by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead className="text-right">Spend (NPR)</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(spendByPlatform).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No data for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(spendByPlatform)
                    .sort(([, a], [, b]) => b - a)
                    .map(([platform, spend]) => (
                      <TableRow key={platform}>
                        <TableCell className="font-medium">{platform}</TableCell>
                        <TableCell className="text-right">{formatCurrency(spend)}</TableCell>
                        <TableCell className="text-right">
                          {totalAdSpendNPR > 0 ? `${((spend / totalAdSpendNPR) * 100).toFixed(1)}%` : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Spend by Product */}
        <Card>
          <CardHeader>
            <CardTitle>Spend by Product</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Spend (NPR)</TableHead>
                  <TableHead className="text-right">Target Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(spendByProduct).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No data for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(spendByProduct)
                    .sort(([, a], [, b]) => b.spend - a.spend)
                    .map(([product, data]) => (
                      <TableRow key={product}>
                        <TableCell className="font-medium">{product}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.spend)}</TableCell>
                        <TableCell className="text-right">{data.target}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Budget (NPR)</TableHead>
                <TableHead className="text-right">Target Orders</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No campaigns found
                  </TableCell>
                </TableRow>
              ) : (
                campaigns?.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{campaign.primary_product || "-"}</TableCell>
                    <TableCell>
                      {campaign.start_date && campaign.end_date
                        ? `${format(new Date(campaign.start_date), "MMM d")} - ${format(new Date(campaign.end_date), "MMM d")}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(campaign.total_budget_npr || 0)}</TableCell>
                    <TableCell className="text-right">{campaign.target_orders || "-"}</TableCell>
                    <TableCell>{campaign.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
