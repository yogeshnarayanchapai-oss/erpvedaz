import { useState } from 'react';
import { usePartiesWithBalances, useCreateParty, useUpdateParty, useDeleteParty, Party } from '@/hooks/useParties';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Edit2, FileText, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function Parties() {
  const navigate = useNavigate();
  const { data: parties = [], isLoading } = usePartiesWithBalances();
  const createParty = useCreateParty();
  const updateParty = useUpdateParty();
  const deleteParty = useDeleteParty();

  const [isOpen, setIsOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    party_type: 'BOTH' as 'SUPPLIER' | 'WHOLESALER' | 'BOTH',
    phone: '',
    email: '',
    address: '',
    opening_balance: '0',
    opening_balance_type: 'RECEIVABLE' as 'RECEIVABLE' | 'PAYABLE',
    remarks: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      party_type: formData.party_type,
      phone: formData.phone || null,
      email: formData.email || null,
      address: formData.address || null,
      opening_balance: parseFloat(formData.opening_balance) || 0,
      opening_balance_type: formData.opening_balance_type,
      remarks: formData.remarks || null,
    };

    if (editingParty) {
      await updateParty.mutateAsync({ id: editingParty.id, ...data });
    } else {
      await createParty.mutateAsync(data);
    }

    setIsOpen(false);
    setEditingParty(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      party_type: 'BOTH',
      phone: '',
      email: '',
      address: '',
      opening_balance: '0',
      opening_balance_type: 'RECEIVABLE',
      remarks: '',
    });
  };

  const openEdit = (party: Party) => {
    setEditingParty(party);
    setFormData({
      name: party.name,
      party_type: party.party_type,
      phone: party.phone || '',
      email: party.email || '',
      address: party.address || '',
      opening_balance: party.opening_balance.toString(),
      opening_balance_type: party.opening_balance_type || 'RECEIVABLE',
      remarks: party.remarks || '',
    });
    setIsOpen(true);
  };

  const handleDelete = async () => {
    if (!partyToDelete) return;
    await deleteParty.mutateAsync(partyToDelete);
    setDeleteDialogOpen(false);
    setPartyToDelete(null);
  };

  const getPartyTypeBadge = (type: string) => {
    const colors = {
      SUPPLIER: 'bg-blue-500/10 text-blue-500',
      WHOLESALER: 'bg-green-500/10 text-green-500',
      BOTH: 'bg-purple-500/10 text-purple-500',
    };
    return <Badge className={colors[type as keyof typeof colors]}>{type}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parties</h1>
          <p className="text-muted-foreground">Manage suppliers and wholesalers</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingParty(null); resetForm(); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Party
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingParty ? 'Edit Party' : 'Add New Party'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Party Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Party Type *</Label>
                  <Select value={formData.party_type} onValueChange={(value: any) => setFormData({ ...formData, party_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPPLIER">Supplier</SelectItem>
                      <SelectItem value="WHOLESALER">Wholesaler</SelectItem>
                      <SelectItem value="BOTH">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="opening">Opening Balance</Label>
                  <Input
                    id="opening"
                    type="number"
                    step="0.01"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="balance-type">Balance Type</Label>
                  <Select value={formData.opening_balance_type} onValueChange={(value: any) => setFormData({ ...formData, opening_balance_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECEIVABLE">Receivable (They owe us)</SelectItem>
                      <SelectItem value="PAYABLE">Payable (We owe them)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createParty.isPending || updateParty.isPending}>
                {editingParty ? 'Update Party' : 'Create Party'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Parties List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Opening Balance</TableHead>
                <TableHead className="text-right">Current Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && parties.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No parties found. Add your first supplier or wholesaler.
                  </TableCell>
                </TableRow>
              )}
              {parties.map((party) => (
                <TableRow key={party.id}>
                  <TableCell className="font-medium">{party.name}</TableCell>
                  <TableCell>{getPartyTypeBadge(party.party_type)}</TableCell>
                  <TableCell>{party.phone || '-'}</TableCell>
                  <TableCell>{party.email || '-'}</TableCell>
                  <TableCell className="text-right">
                    ₹{party.opening_balance.toFixed(2)}
                    {party.opening_balance_type && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({party.opening_balance_type === 'RECEIVABLE' ? 'DR' : 'CR'})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${party.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{party.current_balance.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/accounting/party-statement?party=${party.id}`)}
                        title="View Statement"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(party)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPartyToDelete(party.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Party</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this party? This will also delete all associated transactions and payments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
