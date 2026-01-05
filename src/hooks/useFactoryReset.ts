import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSendFactoryResetCode() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('factory-reset', {
        body: { action: 'send-code' }
      });
      
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      toast.success('Verification code sent', {
        description: 'Check your email for the reset code'
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to send code', { description: error.message });
    }
  });
}

export function useVerifyAndReset() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.functions.invoke('factory-reset', {
        body: { action: 'verify-and-reset', code }
      });
      
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      toast.success('Factory reset completed', {
        description: `System has been reset. ${data.deletedTables} tables cleared.`
      });
    },
    onError: (error: Error) => {
      toast.error('Factory reset failed', { description: error.message });
    }
  });
}
