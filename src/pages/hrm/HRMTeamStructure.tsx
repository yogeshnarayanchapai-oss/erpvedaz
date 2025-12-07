import { useState } from 'react';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment, useEmployees } from '@/hooks/useHRM';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Building2, Pencil, Trash2, Users } from 'lucide-react';

export default function HRMTeamStructure() {
  const { data: departments = [], isLoading } = useDepartments();
  const { data: employees = [] } = useEmployees();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const resetForm = () => {
    setForm({ name: '', description: '' });
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await updateDept.mutateAsync({ id: editing.id, ...form });
    } else {
      await createDept.mutateAsync(form);
    }
    setIsOpen(false);
    resetForm();
  };

  const openEdit = (d: any) => {
    setEditing(d);
    setForm({ name: d.name, description: d.description || '' });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this department?')) await deleteDept.mutateAsync(id);
  };

  const getEmployeesByDept = (deptId: string) => employees.filter((e) => e.department_id === deptId && e.status === 'Active');
  const unassignedEmployees = employees.filter((e) => !e.department_id && e.status === 'Active');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Structure</h1>
          <p className="text-muted-foreground">Departments and team organization</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Department</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Edit Department' : 'Add Department'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
              <Button type="submit" className="w-full" disabled={createDept.isPending || updateDept.isPending}>{editing ? 'Update' : 'Create'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" />Departments</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Employees</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline">{getEmployeesByDept(d.id).length}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {departments.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{isLoading ? 'Loading...' : 'No departments'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Team Overview</CardTitle></CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {departments.map((d) => {
                const deptEmployees = getEmployeesByDept(d.id);
                return (
                  <AccordionItem key={d.id} value={d.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{d.name}</span>
                        <Badge variant="outline" className="ml-2">{deptEmployees.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {deptEmployees.length > 0 ? (
                        <ul className="space-y-1 pl-4">
                          {deptEmployees.map((e) => (
                            <li key={e.id} className="text-sm text-muted-foreground">
                              {e.full_name} {e.position && <span className="text-xs">({e.position})</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground pl-4">No employees</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
              {unassignedEmployees.length > 0 && (
                <AccordionItem value="unassigned">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground">Unassigned</span>
                      <Badge variant="secondary" className="ml-2">{unassignedEmployees.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-1 pl-4">
                      {unassignedEmployees.map((e) => (
                        <li key={e.id} className="text-sm text-muted-foreground">{e.full_name}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
