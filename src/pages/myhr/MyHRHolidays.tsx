import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Info } from 'lucide-react';
import { useOfficeHolidays } from '@/hooks/useHRM';
import { FormattedDate } from '@/components/FormattedDate';
import { useMemo } from 'react';

export default function MyHRHolidays() {
  const { data: holidays = [], isLoading } = useOfficeHolidays();

  const typeColors: Record<string, string> = {
    Public: 'bg-success/10 text-success',
    Company: 'bg-primary/10 text-primary',
    Event: 'bg-warning/10 text-warning',
  };

  // Split into upcoming and past
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

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Company Holidays & Events</h1>
        <p className="text-muted-foreground">View upcoming holidays and company events</p>
      </div>

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
    </div>
  );
}