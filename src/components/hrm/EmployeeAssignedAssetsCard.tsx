import { Package, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssetAssignments } from '@/hooks/useAssets';

interface EmployeeAssignedAssetsCardProps {
  employeeId: string;
}

export function EmployeeAssignedAssetsCard({ employeeId }: EmployeeAssignedAssetsCardProps) {
  const { data: assignments, isLoading } = useAssetAssignments(employeeId);

  // Filter only active assignments (not returned)
  const activeAssignments = assignments?.filter(a => !a.returned_on) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Assigned Assets</CardTitle>
        </div>
        <CardDescription>
          Company assets assigned to this employee
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : activeAssignments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assigned On</TableHead>
                <TableHead>Condition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{assignment.assets?.name}</p>
                      <p className="text-xs text-muted-foreground">{assignment.assets?.asset_code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{assignment.assets?.category || '-'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(assignment.assigned_on), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {assignment.condition_on_assign || 'Good'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No assets currently assigned
          </div>
        )}
      </CardContent>
    </Card>
  );
}
