import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { toast } from 'sonner';

interface OrderCopyTemplate {
  id: string;
  store_id: string;
  template: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_TEMPLATE = `{{customer_name}}
{{phone}}
{{products}}
{{address}}
{{amount}}
{{branch}}
Vedaz01`;

export function useOrderCopyTemplate() {
  const { currentStore } = useCurrentStore();
  const queryClient = useQueryClient();

  const { data: template, isLoading } = useQuery({
    queryKey: ['order-copy-template', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return null;

      const { data, error } = await supabase
        .from('order_copy_templates')
        .select('*')
        .eq('store_id', currentStore.id)
        .maybeSingle();

      if (error) throw error;
      return data as OrderCopyTemplate | null;
    },
    enabled: !!currentStore?.id,
  });

  const updateTemplate = useMutation({
    mutationFn: async (newTemplate: string) => {
      if (!currentStore?.id) throw new Error('No store selected');

      const { data: existing } = await supabase
        .from('order_copy_templates')
        .select('id')
        .eq('store_id', currentStore.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('order_copy_templates')
          .update({ template: newTemplate })
          .eq('store_id', currentStore.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('order_copy_templates')
          .insert({ store_id: currentStore.id, template: newTemplate });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-copy-template'] });
      toast.success('Order copy format saved');
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const getTemplateText = () => template?.template || DEFAULT_TEMPLATE;

  // Generate order copy text from template
  const generateOrderCopy = (order: {
    customerName: string;
    phone: string;
    products: string;
    address: string;
    amount: number;
    quantity: number;
    branch: string;
    deliveryLocation: string;
    paymentMethod: string;
    orderBy: string;
  }) => {
    const templateText = getTemplateText();
    
    return templateText
      .replace(/\{\{customer_name\}\}/gi, order.customerName || '')
      .replace(/\{\{phone\}\}/gi, order.phone || '')
      .replace(/\{\{products\}\}/gi, order.products || '')
      .replace(/\{\{address\}\}/gi, order.address || '')
      .replace(/\{\{amount\}\}/gi, order.amount?.toString() || '0')
      .replace(/\{\{quantity\}\}/gi, order.quantity?.toString() || '1')
      .replace(/\{\{branch\}\}/gi, order.branch || '')
      .replace(/\{\{delivery_location\}\}/gi, order.deliveryLocation || '')
      .replace(/\{\{payment_method\}\}/gi, order.paymentMethod || '')
      .replace(/\{\{order_by\}\}/gi, order.orderBy || '');
  };

  return {
    template,
    isLoading,
    updateTemplate,
    getTemplateText,
    generateOrderCopy,
    DEFAULT_TEMPLATE,
  };
}
