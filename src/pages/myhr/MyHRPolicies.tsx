import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Info, Eye } from 'lucide-react';
import { useHRPolicies } from '@/hooks/useHRM';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function MyHRPolicies() {
  const { data: policies = [], isLoading } = useHRPolicies();
  const [viewPolicy, setViewPolicy] = useState<any>(null);

  // Only show active policies to staff
  const activePolicies = policies.filter(p => p.is_active);

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Company Policies</h1>
        <p className="text-muted-foreground">View company HR policies and guidelines</p>
      </div>

      {activePolicies.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activePolicies.map(policy => (
            <Card key={policy.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewPolicy(policy)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">{policy.title}</CardTitle>
                  </div>
                  {policy.category && (
                    <Badge variant="outline">{policy.category}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {policy.content || 'Click to view policy details'}
                </p>
                <Button variant="ghost" size="sm" className="mt-2 w-full">
                  <Eye className="w-4 h-4 mr-2" />
                  View Policy
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Policies Available</h3>
            <p className="text-muted-foreground">
              There are no HR policies published yet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* View Policy Dialog */}
      <Dialog open={!!viewPolicy} onOpenChange={() => setViewPolicy(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {viewPolicy?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewPolicy?.category && (
              <Badge variant="outline">{viewPolicy.category}</Badge>
            )}
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {viewPolicy?.content || 'No content available.'}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}