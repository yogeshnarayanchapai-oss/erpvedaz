import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import {
  useConsignmentSettings, useAddSettingOption, useUpdateSettingOption, useDeleteSettingOption,
  SettingCategory, SettingOption,
} from '@/hooks/useConsignmentSettings';

function OptionsEditor({ category }: { category: SettingCategory }) {
  const { data: options = [], isLoading } = useConsignmentSettings(category);
  const add = useAddSettingOption();
  const update = useUpdateSettingOption();
  const del = useDeleteSettingOption();
  const [newLabel, setNewLabel] = useState('');

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    await add.mutateAsync({ category, label: newLabel });
    setNewLabel('');
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder={category === 'STATUS' ? 'e.g. Quality Check' : 'e.g. Insurance'}
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
        />
        <Button onClick={handleAdd} disabled={add.isPending || !newLabel.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      <div className="border rounded-md divide-y max-h-[420px] overflow-auto">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
        ) : options.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No options yet</div>
        ) : options.map((opt: SettingOption) => (
          <div key={opt.id} className="flex items-center gap-2 p-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <Input
              className="h-8"
              defaultValue={opt.label}
              onBlur={e => {
                const v = e.target.value.trim();
                if (v && v !== opt.label) update.mutate({ id: opt.id, patch: { label: v } });
              }}
            />
            <code className="text-[10px] text-muted-foreground whitespace-nowrap">{opt.code}</code>
            <div className="flex items-center gap-1">
              <Switch
                checked={opt.is_active}
                onCheckedChange={(v) => update.mutate({ id: opt.id, patch: { is_active: v } })}
              />
              <Label className="text-xs">Active</Label>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del.mutate(opt.id)} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Removing an option doesn't change consignments already using it — they'll keep the old value as text. Toggle off to hide from dropdowns without deleting.
      </p>
    </div>
  );
}

export function ConsignmentSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Consignment Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="STATUS">
          <TabsList>
            <TabsTrigger value="STATUS">Order Status</TabsTrigger>
            <TabsTrigger value="PAYMENT_CATEGORY">Payment Categories</TabsTrigger>
          </TabsList>
          <TabsContent value="STATUS" className="mt-3">
            <OptionsEditor category="STATUS" />
          </TabsContent>
          <TabsContent value="PAYMENT_CATEGORY" className="mt-3">
            <OptionsEditor category="PAYMENT_CATEGORY" />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
