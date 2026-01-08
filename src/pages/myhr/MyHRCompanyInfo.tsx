import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, FileText, Info, Eye } from 'lucide-react';
import { useOfficeHolidays, useHRPolicies } from '@/hooks/useHRM';
import { FormattedDate } from '@/components/FormattedDate';

export default function MyHRCompanyInfo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'policies';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  // Holidays
  const { data: holidays = [], isLoading: loadingHolidays } = useOfficeHolidays();
  const typeColors: Record<string, string> = {
    Public: 'bg-success/10 text-success',
    Company: 'bg-primary/10 text-primary',
    Event: 'bg-warning/10 text-warning',
  };

  const { upcoming, past } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      upcoming: holidays
        .filter(h => new Date(h.date) >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      past: holidays
        .filter(h => new Date(h.date) < today)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };
  }, [holidays]);

  // Policies
  const { data: policies = [], isLoading: loadingPolicies } = useHRPolicies();
  const activePolicies = policies.filter(p => p.is_active);
  const [viewPolicy, setViewPolicy] = useState<any>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Company Info</h1>
        <p className="text-muted-foreground">View company holidays, events, and HR policies</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid">
          <TabsTrigger value="policies" className="gap-2">
            <FileText className="h-4 w-4" />
            HR Policies
          </TabsTrigger>
          <TabsTrigger value="holidays" className="gap-2">
            <Calendar className="h-4 w-4" />
            Holidays & Events
          </TabsTrigger>
        </TabsList>

        {/* POLICIES TAB */}
        <TabsContent value="policies" className="space-y-6 mt-6">
          {loadingPolicies ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : activePolicies.length > 0 ? (
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
        </TabsContent>

        {/* HOLIDAYS TAB */}
        <TabsContent value="holidays" className="space-y-6 mt-6">
          {loadingHolidays ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : (
            <>
              {/* Upcoming Holidays */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Upcoming Holidays ({upcoming.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcoming.length > 0 ? (
                    <div className="space-y-3">
                      {upcoming.map(h => (
                        <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                          <div>
                            <p className="font-medium">{h.title}</p>
                            <p className="text-sm text-muted-foreground">
                              <FormattedDate date={h.date} />
                            </p>
                            {h.description && (
                              <p className="text-xs text-muted-foreground mt-1">{h.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={typeColors[h.holiday_type]}>{h.holiday_type}</Badge>
                            {h.is_office_closed && (
                              <Badge variant="secondary">Office Closed</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Info className="w-8 h-8 mx-auto mb-2" />
                      <p>No upcoming holidays</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Past Holidays */}
              {past.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">Past Holidays</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {past.slice(0, 10).map(h => (
                        <div key={h.id} className="flex items-center justify-between p-2 rounded-lg opacity-60">
                          <div>
                            <p className="text-sm font-medium">{h.title}</p>
                            <p className="text-xs text-muted-foreground"><FormattedDate date={h.date} /></p>
                          </div>
                          <Badge variant="outline" className={typeColors[h.holiday_type]}>{h.holiday_type}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

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
