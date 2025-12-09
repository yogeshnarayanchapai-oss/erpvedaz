import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Save, RotateCcw, Info } from 'lucide-react';
import { useOrderCopyTemplate } from '@/hooks/useOrderCopyTemplate';
import { toast } from 'sonner';

const AVAILABLE_VARIABLES = [
  { name: '{{customer_name}}', description: 'Customer name' },
  { name: '{{phone}}', description: 'Phone number' },
  { name: '{{products}}', description: 'Product names' },
  { name: '{{address}}', description: 'Full address' },
  { name: '{{amount}}', description: 'Total amount' },
  { name: '{{quantity}}', description: 'Total quantity' },
  { name: '{{branch}}', description: 'Destination branch' },
  { name: '{{delivery_location}}', description: 'Inside/Outside Valley' },
  { name: '{{payment_method}}', description: 'COD/Online' },
  { name: '{{order_by}}', description: 'Staff who created order' },
];

export function OrderCopyFormatEditor() {
  const { template, isLoading, updateTemplate, DEFAULT_TEMPLATE, getTemplateText } = useOrderCopyTemplate();
  const [editedTemplate, setEditedTemplate] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditedTemplate(getTemplateText());
  }, [template]);

  useEffect(() => {
    setHasChanges(editedTemplate !== getTemplateText());
  }, [editedTemplate, template]);

  const handleSave = () => {
    updateTemplate.mutate(editedTemplate);
  };

  const handleReset = () => {
    setEditedTemplate(DEFAULT_TEMPLATE);
  };

  const handleInsertVariable = (variable: string) => {
    setEditedTemplate(prev => prev + variable);
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    toast.success(`Copied ${variable}`);
  };

  // Preview with sample data
  const previewText = editedTemplate
    .replace(/\{\{customer_name\}\}/gi, 'Ram Sharma')
    .replace(/\{\{phone\}\}/gi, '9841234567')
    .replace(/\{\{products\}\}/gi, 'Hair Oil x2')
    .replace(/\{\{address\}\}/gi, 'Kathmandu, Nepal')
    .replace(/\{\{amount\}\}/gi, '1499')
    .replace(/\{\{quantity\}\}/gi, '2')
    .replace(/\{\{branch\}\}/gi, 'Chitwan Branch')
    .replace(/\{\{delivery_location\}\}/gi, 'Outside Valley')
    .replace(/\{\{payment_method\}\}/gi, 'COD')
    .replace(/\{\{order_by\}\}/gi, 'Hari');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Copy className="w-5 h-5 text-primary" />
          Order Copy Format
        </CardTitle>
        <CardDescription>
          Customize the format used when copying order details in Calling Portal. This is store-specific.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Available Variables */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium">
            <Info className="w-4 h-4" />
            Available Variables (click to copy):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_VARIABLES.map((v) => (
              <Badge
                key={v.name}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => copyVariable(v.name)}
                title={v.description}
              >
                {v.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Template Editor */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Template</label>
            <Textarea
              value={editedTemplate}
              onChange={(e) => setEditedTemplate(e.target.value)}
              placeholder="Enter your order copy format..."
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Preview</label>
            <div className="p-3 bg-muted rounded-lg h-[240px] overflow-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono">{previewText}</pre>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateTemplate.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {updateTemplate.isPending ? 'Saving...' : 'Save Format'}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </Button>
          {hasChanges && (
            <span className="text-sm text-warning">Unsaved changes</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
