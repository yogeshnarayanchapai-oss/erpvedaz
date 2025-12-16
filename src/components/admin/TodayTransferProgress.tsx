import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Send, PhoneOff, Percent, Inbox, LayoutList, FileSpreadsheet, PlusCircle } from 'lucide-react';

interface TodayTransferProgressProps {
  totalTodayLeads: number;
  transferredToday: number;
  remainingTodayLeads: number;
  todayLeadsTransferred?: number;
  cnrLeadsTransferred?: number;
  totalRemainingInPool?: number;
  dateLabel?: string;
  showTotalInstead?: boolean; // If true, shows "Total" instead of "Total Remaining"
  bulkEntryTransferred?: number;
  importEntryTransferred?: number;
  singleEntryTransferred?: number;
}

export function TodayTransferProgress({
  totalTodayLeads,
  transferredToday,
  remainingTodayLeads,
  todayLeadsTransferred = 0,
  cnrLeadsTransferred = 0,
  totalRemainingInPool = 0,
  dateLabel = "Today",
  showTotalInstead = false,
  bulkEntryTransferred = 0,
  importEntryTransferred = 0,
  singleEntryTransferred = 0,
}: TodayTransferProgressProps) {
  const progressPercent = totalTodayLeads > 0 
    ? Math.round((transferredToday / totalTodayLeads) * 100) 
    : 0;
  
  const achievementPercent = totalTodayLeads > 0
    ? Math.round((todayLeadsTransferred / totalTodayLeads) * 100)
    : 0;

  const isToday = dateLabel === 'Today';
  const labelText = isToday ? "today's" : "selected";

  return (
    <div className="flex flex-wrap gap-4 items-stretch">
      {/* Transfer Progress Card */}
      <Card className="border shadow-sm flex-1 min-w-[280px]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="w-4 h-4 text-primary" />
            {isToday ? "Today's Transfer Progress" : "Transfer Progress"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{transferredToday.toLocaleString()}</span> of{' '}
            <span className="font-medium text-foreground">{totalTodayLeads.toLocaleString()}</span> {labelText} leads transferred to calling staff
          </p>
          
          <div className="space-y-2">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Remaining: <span className="font-medium text-foreground">{remainingTodayLeads.toLocaleString()}</span></span>
              <span>Transferred: <span className="font-medium text-primary">{transferredToday.toLocaleString()}</span></span>
            </div>
          </div>

          {totalTodayLeads === 0 && (
            <p className="text-xs text-muted-foreground italic">No leads in selected date range</p>
          )}
        </CardContent>
      </Card>

      {/* Total / Total Remaining Card */}
      <Card className="border shadow-sm min-w-[140px]">
        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
          {showTotalInstead ? (
            <LayoutList className="w-5 h-5 text-primary mb-1" />
          ) : (
            <Inbox className="w-5 h-5 text-chart-3 mb-1" />
          )}
          <span className="text-2xl font-bold">
            {showTotalInstead ? transferredToday.toLocaleString() : totalRemainingInPool.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">
            {showTotalInstead ? 'Total Transferred' : 'Total Remaining'}
          </span>
        </CardContent>
      </Card>

      {/* Quick Stat Cards */}
      <div className="flex flex-wrap gap-3">
        <Card className="border shadow-sm min-w-[120px]">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Send className="w-5 h-5 text-success mb-1" />
            <span className="text-2xl font-bold">{todayLeadsTransferred.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">Today Lead</span>
          </CardContent>
        </Card>

        <Card className="border shadow-sm min-w-[120px]">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <PhoneOff className="w-5 h-5 text-destructive mb-1" />
            <span className="text-2xl font-bold">{cnrLeadsTransferred.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">CNR Lead</span>
          </CardContent>
        </Card>

        <Card className="border shadow-sm min-w-[120px]">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <FileSpreadsheet className="w-5 h-5 text-blue-500 mb-1" />
            <span className="text-2xl font-bold">{bulkEntryTransferred.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">Bulk Entry</span>
          </CardContent>
        </Card>

        <Card className="border shadow-sm min-w-[120px]">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Percent className="w-5 h-5 text-primary mb-1" />
            <span className="text-2xl font-bold">{achievementPercent}%</span>
            <span className="text-xs text-muted-foreground">Achieved</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
