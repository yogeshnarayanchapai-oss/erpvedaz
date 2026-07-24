import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { StaffLeaderboardEntry } from '@/hooks/useStaffLeaderboard';

interface StaffLeaderboardProps {
  data: StaffLeaderboardEntry[];
  periodLabel: string;
  isLoading?: boolean;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-4 h-4 text-yellow-500" />;
    case 2:
      return <Medal className="w-4 h-4 text-gray-400" />;
    case 3:
      return <Award className="w-4 h-4 text-amber-600" />;
    default:
      return <span className="text-muted-foreground text-sm">#{rank}</span>;
  }
};

const getConversionColor = (rate: number) => {
  if (rate >= 50) return 'text-success';
  if (rate >= 30) return 'text-chart-2';
  if (rate >= 15) return 'text-warning';
  return 'text-muted-foreground';
};

export function StaffLeaderboard({ data, periodLabel, isLoading }: StaffLeaderboardProps) {
  const navigate = useNavigate();
  
  const handleStaffClick = (staffId: string) => {
    navigate(`/admin/staff/${staffId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Staff Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  const topPerformers = data;
  const maxOrders = Math.max(...topPerformers.map(s => s.confirmedOrders), 1);


  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Staff Leaderboard
          <Badge variant="secondary" className="ml-auto text-xs font-normal">
            {periodLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topPerformers.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            No performance data for selected period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">VD Not Deliver</TableHead>
                  <TableHead className="text-right">Conv. Rate</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="w-24">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPerformers.map((staff, index) => {
                  const rank = index + 1;
                  const progressPercent = (staff.confirmedOrders / maxOrders) * 100;

                  return (
                    <TableRow 
                      key={staff.id} 
                      className={`cursor-pointer hover:bg-muted/60 transition-colors ${rank <= 3 ? 'bg-muted/30' : ''}`}
                      onClick={() => handleStaffClick(staff.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center justify-center">
                          {getRankIcon(rank)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-primary hover:underline">{staff.name}</div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {staff.totalLeads}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold">{staff.confirmedOrders}</span>
                        {staff.totalOrders > staff.confirmedOrders && (
                          <span className="text-muted-foreground text-xs ml-1">
                            /{staff.totalOrders}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={staff.vdNotDeliver > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                          {staff.vdNotDeliver}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`flex items-center justify-end gap-1 ${getConversionColor(staff.conversionRate)}`}>
                          <TrendingUp className="w-3 h-3" />
                          <span className="font-medium">
                            {staff.conversionRate.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{staff.totalSales.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Progress 
                          value={progressPercent} 
                          className="h-2"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
