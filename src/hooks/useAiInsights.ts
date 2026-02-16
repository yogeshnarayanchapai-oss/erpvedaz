import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AiInsightsMetrics {
  store_name: string;
  date: string;
  today: {
    total_orders: number;
    confirmed: number;
    delivered: number;
    cancelled: number;
    sales: number;
    avg_order_value: number;
  };
  last_7_days: {
    total_orders: number;
    sales: number;
    avg_daily: number;
  };
  rto: {
    rate_30d: number;
    count_30d: number;
  };
  top_products: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  sales_by_province: Record<string, {
    orders: number;
    sales: number;
    rto: number;
  }>;
  marketing_spend: Record<string, number>;
}

interface AiInsights {
  daily_summary: string;
  key_observations: string[];
  action_suggestions: string[];
  raw_text?: string;
}

interface AiInsightsResponse {
  metrics: AiInsightsMetrics;
  ai_insights: AiInsights;
  error?: string;
}

interface AiInsightsParams {
  storeId: string;
  date?: string;
}

export function useAiInsights() {
  return useMutation({
    mutationFn: async ({ storeId, date }: AiInsightsParams) => {
      if (!storeId) {
        throw new Error('Store ID is required');
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            storeId,
            date: date || new Date().toISOString().split('T')[0]
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch insights: ${response.statusText}`);
      }

      const data: AiInsightsResponse = await response.json();
      return data;
    },
  });
}
