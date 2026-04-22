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

  // Load CALLING staff scoped to current store (via user_store_access).
  // Falls back to global CALLING profiles when no store is selected.
  useEffect(() => {
    (async () => {
      if (currentStore?.id) {
        // 1) Get user_ids with CALLING access to this store
        const { data: access } = await supabase
          .from('user_store_access')
          .select('user_id, store_role')
          .eq('store_id', currentStore.id)
          .eq('is_active', true);
        const accessUserIds = (access || []).map(a => a.user_id);
        if (accessUserIds.length === 0) {
          setStaffOptions([]);
          return;
        }
        // 2) Match against profiles with global role CALLING OR store_role CALLING
        const callingByStoreRole = new Set(
          (access || []).filter(a => a.store_role === 'CALLING').map(a => a.user_id)
        );
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, role')
          .in('id', accessUserIds)
          .eq('is_active', true)
          .order('name');
        const filtered = (profiles || []).filter(
          p => callingByStoreRole.has(p.id) || p.role === 'CALLING'
        );
        setStaffOptions(filtered.map(p => ({ id: p.id, name: p.name || 'Unknown' })));
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('id, name, role')
          .eq('is_active', true)
          .eq('role', 'CALLING')
          .order('name');
        setStaffOptions((data || []).map(p => ({ id: p.id, name: p.name || 'Unknown' })));
      }
    })();
  }, [currentStore?.id]);

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
          {/* Summary cards (always visible above tabs) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard icon={Users} label="Staff Analyzed" value={report.summary.total_staff} />
            <SummaryCard icon={Clock} label="Late Orders (4PM+)" value={report.summary.total_late_orders} tone="warn" />
            <SummaryCard icon={PhoneOff} label="Followup Issues" value={report.summary.total_followup_issues} tone="warn" />
            <SummaryCard icon={RotateCcw} label="Redirects" value={report.summary.total_redirects} />
            <SummaryCard icon={ShieldAlert} label="Status Changes" value={report.summary.total_status_manipulations} tone="warn" />
            <SummaryCard icon={AlertTriangle} label="Invalid Phones" value={report.summary.total_invalid_phones} tone="bad" />
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full h-auto">
              <TabsTrigger value="overview" className="text-xs md:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="bonus" className="text-xs md:text-sm">🏆 Bonus</TabsTrigger>
              <TabsTrigger value="late" className="text-xs md:text-sm">Late Orders</TabsTrigger>
              <TabsTrigger value="followup" className="text-xs md:text-sm">Followups</TabsTrigger>
              <TabsTrigger value="redirect" className="text-xs md:text-sm">Redirects</TabsTrigger>
              <TabsTrigger value="status" className="text-xs md:text-sm">Status Changes</TabsTrigger>
            </TabsList>

            {/* Overview tab — staff-wise full breakdown table */}
            <TabsContent value="overview" className="mt-4">
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
                        {[...report.staff]
                          .sort((a, b) => {
                            // Worst first: lowest score on top, then highest issue count
                            const aIssues = a.late_orders + a.followup_no_time + a.followup_overdue + a.confirm_then_changed + a.duplicate_phone_confirms + a.invalid_phone_confirms;
                            const bIssues = b.late_orders + b.followup_no_time + b.followup_overdue + b.confirm_then_changed + b.duplicate_phone_confirms + b.invalid_phone_confirms;
                            if (a.score !== b.score) return a.score - b.score;
                            return bIssues - aIssues;
                          })
                          .map(s => (
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
            </TabsContent>

            {/* Bonus tab */}
            <TabsContent value="bonus" className="mt-4">
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
            </TabsContent>

            {/* Late Orders tab */}
            <TabsContent value="late" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Late Order Creation (After 4:00 PM NPT)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead className="text-right">Late Orders</TableHead>
                        <TableHead>Sample Timestamps</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.staff.filter(s => s.late_orders > 0).length === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No late orders 🎉</TableCell></TableRow>
                      )}
                      {report.staff.filter(s => s.late_orders > 0).sort((a, b) => b.late_orders - a.late_orders).map(s => (
                        <TableRow key={s.staff_id}>
                          <TableCell className="font-medium">{s.staff_name}</TableCell>
                          <TableCell className="text-right font-semibold text-orange-600 dark:text-orange-400">{s.late_orders}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {s.late_orders_detail.slice(0, 8).map(o => (
                                <Badge key={o.order_id} variant="outline" className="text-[10px] font-mono">
                                  #{o.order_number} · {o.npt_time}
                                </Badge>
                              ))}
                              {s.late_orders_detail.length > 8 && (
                                <Badge variant="secondary" className="text-[10px]">+{s.late_orders_detail.length - 8} more</Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Followup tab */}
            <TabsContent value="followup" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PhoneOff className="w-4 h-4" /> Followup Issues
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead className="text-right">No Time Set</TableHead>
                        <TableHead className="text-right">Overdue</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Sample Leads</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.staff.filter(s => s.followup_no_time + s.followup_overdue > 0).length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No followup issues 🎉</TableCell></TableRow>
                      )}
                      {report.staff.filter(s => s.followup_no_time + s.followup_overdue > 0).map(s => (
                        <TableRow key={s.staff_id}>
                          <TableCell className="font-medium">{s.staff_name}</TableCell>
                          <TableCell className="text-right">{s.followup_no_time}</TableCell>
                          <TableCell className="text-right text-destructive font-semibold">{s.followup_overdue}</TableCell>
                          <TableCell className="text-right font-semibold">{s.followup_no_time + s.followup_overdue}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {s.followup_detail.slice(0, 5).map(f => (
                                <Badge key={f.lead_id} variant={f.reason === 'OVERDUE' ? 'destructive' : 'secondary'} className="text-[10px]">
                                  {f.client_name || f.contact_number || '—'}
                                </Badge>
                              ))}
                              {s.followup_detail.length > 5 && (
                                <Badge variant="outline" className="text-[10px]">+{s.followup_detail.length - 5}</Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Redirect tab */}
            <TabsContent value="redirect" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Redirect Reason Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead className="text-right">Cancelled</TableHead>
                        <TableHead className="text-right">Not Ordered</TableHead>
                        <TableHead className="text-right">Already Received</TableHead>
                        <TableHead className="text-right">Other</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.staff.filter(s => s.redirect_total > 0).length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No redirects in this period.</TableCell></TableRow>
                      )}
                      {report.staff.filter(s => s.redirect_total > 0).map(s => (
                        <TableRow key={s.staff_id}>
                          <TableCell className="font-medium">{s.staff_name}</TableCell>
                          <TableCell className="text-right">{s.redirect_cancelled}</TableCell>
                          <TableCell className="text-right">{s.redirect_not_ordered}</TableCell>
                          <TableCell className="text-right">{s.redirect_received}</TableCell>
                          <TableCell className="text-right">{s.redirect_other}</TableCell>
                          <TableCell className="text-right font-semibold">{s.redirect_total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Status manipulation tab */}
            <TabsContent value="status" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Status Manipulation & Data Integrity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead className="text-right">Confirmed→Changed</TableHead>
                        <TableHead className="text-right">Cancel After Confirm</TableHead>
                        <TableHead className="text-right">Duplicate Confirms</TableHead>
                        <TableHead className="text-right">Invalid Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.staff.filter(s => s.confirm_then_changed + s.cancel_after_confirm + s.duplicate_phone_confirms + s.invalid_phone_confirms > 0).length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No data integrity issues 🎉</TableCell></TableRow>
                      )}
                      {report.staff.filter(s => s.confirm_then_changed + s.cancel_after_confirm + s.duplicate_phone_confirms + s.invalid_phone_confirms > 0).map(s => (
                        <TableRow key={s.staff_id}>
                          <TableCell className="font-medium">{s.staff_name}</TableCell>
                          <TableCell className="text-right">{s.confirm_then_changed}</TableCell>
                          <TableCell className="text-right">{s.cancel_after_confirm}</TableCell>
                          <TableCell className="text-right text-destructive">{s.duplicate_phone_confirms}</TableCell>
                          <TableCell className="text-right text-destructive">{s.invalid_phone_confirms}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
