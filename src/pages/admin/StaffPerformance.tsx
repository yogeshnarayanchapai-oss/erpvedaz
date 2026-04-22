import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronDown, ChevronRight, Trophy, Medal, Award, AlertTriangle,
  Clock, PhoneOff, RotateCcw, ShieldAlert, Users, BarChart3, Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { useStaffPerformance, type StaffMetric, type TeamFilter } from '@/hooks/useStaffPerformance';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function StaffPerformance() {
  const { currentStore } = useCurrentStore();
  const today = format(new Date(), 'yyyy-MM-dd');
  const sevenDaysAgo = format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(sevenDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [teamType, setTeamType] = useState<TeamFilter>('ALL');
  const [staffOptions, setStaffOptions] = useState<{ id: string; name: string }[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const perf = useStaffPerformance();
  const report = perf.data;

  // Load CALLING staff only — this audit is sales-focused
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('is_active', true)
        .eq('role', 'CALLING')
        .order('name');
      setStaffOptions((data || []).map(p => ({ id: p.id, name: p.name || 'Unknown' })));
    })();
  }, []);

  const handleGenerate = () => {
    if (!startDate || !endDate) {
      toast.error('Please select a date range');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date must be before end date');
      return;
    }
    perf.mutate({
      startDate, endDate, teamType,
      staffIds: selectedStaff.length > 0 ? selectedStaff : undefined,
      storeId: currentStore?.id,
    });
  };

  const toggleExpand = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const selectedStaffLabel = useMemo(() => {
    if (selectedStaff.length === 0) return 'All staff';
    if (selectedStaff.length === 1)
      return staffOptions.find(s => s.id === selectedStaff[0])?.name || '1 selected';
    return `${selectedStaff.length} selected`;
  }, [selectedStaff, staffOptions]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 max-w-[1600px]">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Staff Performance Audit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Owner-level performance audit. Data loads only when you click <b>Generate Report</b>.
        </p>
      </header>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Team</Label>
              <Select value={teamType} onValueChange={v => setTeamType(v as TeamFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Teams</SelectItem>
                  <SelectItem value="CALLING">Calling</SelectItem>
                  <SelectItem value="LOGISTICS">Logistics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Staff (multi)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    <span className="truncate">{selectedStaffLabel}</span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <ScrollArea className="h-64 p-2">
                    <div className="flex justify-between px-2 py-1">
                      <button className="text-xs text-primary" onClick={() => setSelectedStaff(staffOptions.map(s => s.id))}>Select all</button>
                      <button className="text-xs text-muted-foreground" onClick={() => setSelectedStaff([])}>Clear</button>
                    </div>
                    {staffOptions.map(s => (
                      <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer">
                        <Checkbox
                          checked={selectedStaff.includes(s.id)}
                          onCheckedChange={(c) => {
                            setSelectedStaff(prev => c ? [...prev, s.id] : prev.filter(id => id !== s.id));
                          }}
                        />
                        <span className="text-sm">{s.name}</span>
                      </label>
                    ))}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Button onClick={handleGenerate} disabled={perf.isPending} className="w-full">
                {perf.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {!report && !perf.isPending && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Pick filters above and click <b>Generate Report</b> to view metrics.</p>
          </CardContent>
        </Card>
      )}

      {report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard icon={Users} label="Staff Analyzed" value={report.summary.total_staff} />
            <SummaryCard icon={Clock} label="Late Orders (4PM+)" value={report.summary.total_late_orders} tone="warn" />
            <SummaryCard icon={PhoneOff} label="Followup Issues" value={report.summary.total_followup_issues} tone="warn" />
            <SummaryCard icon={RotateCcw} label="Redirects" value={report.summary.total_redirects} />
            <SummaryCard icon={ShieldAlert} label="Status Changes" value={report.summary.total_status_manipulations} tone="warn" />
            <SummaryCard icon={AlertTriangle} label="Invalid Phones" value={report.summary.total_invalid_phones} tone="bad" />
          </div>

          {/* Bonus suggestion */}
          <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Smart Bonus Suggestion (Top 3)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.bonusTop3.length === 0 ? (
                <p className="text-sm text-muted-foreground">No staff qualify for bonus in this period.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {report.bonusTop3.map((s, i) => (
                    <div key={s.staff_id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <div className="text-2xl">{['🥇', '🥈', '🥉'][i]}</div>
                      <div className="flex-1">
                        <p className="font-semibold">{s.staff_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Score: <b className="text-foreground">{s.score.toFixed(2)}</b> · {s.verified_confirms} delivered
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {report.excluded.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    Excluded from Bonus ({report.excluded.length})
                  </h4>
                  <div className="space-y-1.5">
                    {report.excluded.map(s => (
                      <div key={s.staff_id} className="text-xs p-2 rounded bg-destructive/5 border border-destructive/20">
                        <span className="font-medium">{s.staff_name}</span>
                        <span className="text-muted-foreground"> — {s.exclusion_reasons.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Staff-wise table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Staff-wise Breakdown ({report.staff.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Verified ✓</TableHead>
                      <TableHead className="text-right">Late Orders</TableHead>
                      <TableHead className="text-right">FU No-Time</TableHead>
                      <TableHead className="text-right">FU Overdue</TableHead>
                      <TableHead className="text-right">Redirects</TableHead>
                      <TableHead className="text-right">Cnf→Changed</TableHead>
                      <TableHead className="text-right">Dup Confirms</TableHead>
                      <TableHead className="text-right">Invalid Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.staff.length === 0 && (
                      <TableRow><TableCell colSpan={11} className="text-center py-6 text-muted-foreground">No staff data for this period.</TableCell></TableRow>
                    )}
                    {report.staff.map(s => (
                      <StaffRow
                        key={s.staff_id}
                        staff={s}
                        expanded={!!expanded[s.staff_id]}
                        onToggle={() => toggleExpand(s.staff_id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, tone }: any) {
  const toneCls =
    tone === 'bad' ? 'text-destructive' :
    tone === 'warn' ? 'text-orange-600 dark:text-orange-400' :
    'text-foreground';
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Icon className="w-3.5 h-3.5" /> {label}
        </div>
        <p className={`text-2xl font-bold ${toneCls}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function StaffRow({ staff, expanded, onToggle }: { staff: StaffMetric; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/40" onClick={onToggle}>
        <TableCell className="px-2">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </TableCell>
        <TableCell className="font-medium">
          {staff.staff_name}
          {staff.excluded && <Badge variant="destructive" className="ml-2 text-[10px] py-0">Excluded</Badge>}
        </TableCell>
        <TableCell className="text-right font-mono font-semibold">{staff.score.toFixed(2)}</TableCell>
        <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{staff.verified_confirms}</TableCell>
        <TableCell className="text-right">{staff.late_orders}</TableCell>
        <TableCell className="text-right">{staff.followup_no_time}</TableCell>
        <TableCell className="text-right">{staff.followup_overdue}</TableCell>
        <TableCell className="text-right">{staff.redirect_total}</TableCell>
        <TableCell className="text-right">{staff.confirm_then_changed}</TableCell>
        <TableCell className="text-right">{staff.duplicate_phone_confirms}</TableCell>
        <TableCell className="text-right">{staff.invalid_phone_confirms}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={11} className="bg-muted/20 p-0">
            <Collapsible open={expanded}>
              <CollapsibleContent>
                <div className="p-4 space-y-4">
                  {/* Redirect breakdown */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Redirect Reason Breakdown</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">Customer Cancelled: {staff.redirect_cancelled}</Badge>
                      <Badge variant="outline">Not Ordered: {staff.redirect_not_ordered}</Badge>
                      <Badge variant="outline">Already Received: {staff.redirect_received}</Badge>
                      <Badge variant="outline">Other: {staff.redirect_other}</Badge>
                    </div>
                  </div>

                  {/* Late orders detail */}
                  {staff.late_orders_detail.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Late Orders ({staff.late_orders_detail.length})</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 max-h-40 overflow-auto">
                        {staff.late_orders_detail.map(o => (
                          <div key={o.order_id} className="text-xs p-1.5 rounded bg-card border">
                            <span className="font-mono">#{o.order_number}</span>
                            <span className="text-muted-foreground ml-2">{o.npt_time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Followup detail */}
                  {staff.followup_detail.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Followup Issues ({staff.followup_detail.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-48 overflow-auto">
                        {staff.followup_detail.slice(0, 50).map(f => (
                          <div key={f.lead_id} className="text-xs p-2 rounded bg-card border flex items-center justify-between">
                            <div>
                              <p className="font-medium">{f.client_name || '—'}</p>
                              <p className="text-muted-foreground">{f.contact_number || '—'}</p>
                            </div>
                            <Badge variant={f.reason === 'OVERDUE' ? 'destructive' : 'secondary'} className="text-[10px]">
                              {f.reason === 'OVERDUE' ? 'Overdue' : 'No time set'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status manipulation detail */}
                  {staff.status_change_detail.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Confirmed → Later Changed ({staff.status_change_detail.length})</h4>
                      <div className="space-y-1 max-h-48 overflow-auto">
                        {staff.status_change_detail.slice(0, 30).map((d, i) => (
                          <div key={i} className="text-xs p-2 rounded bg-card border">
                            <span className="font-mono">#{d.order_number}</span>
                            <span className="mx-2">·</span>
                            <span>Confirmed by <b>{d.confirmed_by_name}</b></span>
                            <span className="mx-2">→</span>
                            <span>Changed to <Badge variant="outline" className="text-[10px]">{d.final_status}</Badge> by <b>{d.changed_by_name}</b></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {staff.exclusion_reasons.length > 0 && (
                    <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <p className="text-xs font-semibold text-destructive mb-1">Excluded from bonus because:</p>
                      <ul className="text-xs list-disc list-inside text-muted-foreground space-y-0.5">
                        {staff.exclusion_reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
