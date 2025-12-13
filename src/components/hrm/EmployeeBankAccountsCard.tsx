import { CreditCard, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployeeBankAccounts } from '@/hooks/useEmployeeBankAccounts';

interface EmployeeBankAccountsCardProps {
  employeeId: string;
}

export function EmployeeBankAccountsCard({ employeeId }: EmployeeBankAccountsCardProps) {
  const { data: bankAccounts, isLoading } = useEmployeeBankAccounts(employeeId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Bank Accounts</CardTitle>
        </div>
        <CardDescription>
          Employee's bank accounts for salary disbursement
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : bankAccounts && bankAccounts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Account Holder</TableHead>
                <TableHead>Default</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{account.bank_name}</p>
                      {account.branch && (
                        <p className="text-xs text-muted-foreground">{account.branch}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{account.account_number}</TableCell>
                  <TableCell>{account.account_name || '-'}</TableCell>
                  <TableCell>
                    {account.is_default ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Default
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No bank accounts added by employee yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
