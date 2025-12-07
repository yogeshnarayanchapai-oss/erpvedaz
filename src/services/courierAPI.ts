import { supabase } from '@/integrations/supabase/client';

export interface CourierOrderPayload {
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  codAmount: number;
  weight?: number;
  productName?: string;
  quantity?: number;
}

export interface CourierResponse {
  success: boolean;
  trackingId?: string;
  courierOrderId?: string;
  estimatedDelivery?: string;
  error?: string;
}

/**
 * Submit order to NCM courier
 */
export async function submitToNCM(payload: CourierOrderPayload): Promise<CourierResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('courier-ncm-create', {
      body: payload,
    });

    if (error) throw error;

    return {
      success: true,
      trackingId: data.trackingId,
      courierOrderId: data.logisticsOrder?.courier_order_id,
    };
  } catch (error: any) {
    console.error('[NCM] Submission error:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit to NCM',
    };
  }
}

/**
 * Submit order to GBL courier
 */
export async function submitToGBL(payload: CourierOrderPayload): Promise<CourierResponse> {
  try {
    // TODO: Implement GBL API call
    // For now return mock response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockResponse = {
      success: true,
      trackingId: `GBL${Date.now()}`,
      courierOrderId: `GBL-${Math.floor(Math.random() * 100000)}`,
    };

    return mockResponse;
  } catch (error: any) {
    console.error('[GBL] Submission error:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit to GBL',
    };
  }
}

/**
 * Submit order to Pathao courier
 */
export async function submitToPathao(payload: CourierOrderPayload): Promise<CourierResponse> {
  try {
    // TODO: Implement Pathao API call
    // For now return mock response
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockResponse = {
      success: true,
      trackingId: `PATHAO${Date.now()}`,
      courierOrderId: `PTH-${Math.floor(Math.random() * 100000)}`,
    };

    return mockResponse;
  } catch (error: any) {
    console.error('[Pathao] Submission error:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit to Pathao',
    };
  }
}

/**
 * Submit order to Gaaubesi courier
 */
export async function submitToGaaubesi(payload: CourierOrderPayload): Promise<CourierResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('courier-gaaubesi-create', {
      body: payload,
    });

    if (error) throw error;

    return {
      success: true,
      trackingId: data.trackingId,
      courierOrderId: data.courierOrderId,
    };
  } catch (error: any) {
    console.error('[Gaaubesi] Submission error:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit to Gaaubesi',
    };
  }
}

/**
 * Generic courier submission router
 */
export async function submitToCourier(
  courier: 'NCM' | 'GBL' | 'PATHAO' | 'GAAUBESI',
  payload: CourierOrderPayload
): Promise<CourierResponse> {
  switch (courier) {
    case 'NCM':
      return submitToNCM(payload);
    case 'GBL':
      return submitToGBL(payload);
    case 'PATHAO':
      return submitToPathao(payload);
    case 'GAAUBESI':
      return submitToGaaubesi(payload);
    default:
      return {
        success: false,
        error: 'Unknown courier',
      };
  }
}
