import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch customer's order history
    const { data: customerOrders } = await supabase
      .from('orders')
      .select('order_status, amount, province, city, delivery_location')
      .eq('phone_number', order.phone_number)
      .neq('id', orderId);

    const totalPastOrders = customerOrders?.length || 0;
    const pastDelivered = customerOrders?.filter(o => o.order_status === 'DELIVERED').length || 0;
    const pastRtos = customerOrders?.filter(o => 
      o.order_status === 'RETURNED' || o.order_status === 'CANCELLED'
    ).length || 0;
    const rtoRate = totalPastOrders > 0 ? (pastRtos / totalPastOrders * 100).toFixed(1) : '0';

    // Fetch regional statistics
    const { data: regionalOrders } = await supabase
      .from('orders')
      .select('order_status')
      .eq('province', order.province || '')
      .limit(100);

    const regionalRtos = regionalOrders?.filter(o => 
      o.order_status === 'RETURNED' || o.order_status === 'CANCELLED'
    ).length || 0;
    const regionalRtoRate = regionalOrders?.length 
      ? (regionalRtos / regionalOrders.length * 100).toFixed(1) 
      : '0';

    // Construct AI prompt
    const systemPrompt = `You are an expert ecommerce risk analyst for Nepal COD (Cash on Delivery) orders. Your specialty is predicting RTO (Return to Origin) risk.

Your task is to analyze order data and provide:
1. An RTO risk score from 0-100 (where 100 is highest risk)
2. A risk label: "Low", "Medium", or "High"
3. A concise note for operations staff on what to verify or double-check

Consider these RTO risk factors:
- Customer's past RTO history (major factor)
- Regional RTO trends
- Address quality and completeness
- Phone number validity
- Order value (very high or very low values)
- Delivery location (inside/outside valley)
- Payment method
- Product type

Be specific and actionable in your notes. Focus on what staff should verify before dispatch.`;

    const userPrompt = `Analyze this order for RTO risk:

Order Details:
- Customer: ${order.client_name || 'Unknown'}
- Phone: ${order.phone_number}
- Amount: NPR ${order.amount || 0}
- Province: ${order.province || 'Not specified'}
- City/District: ${order.city || 'Not specified'}
- Full Address: ${order.full_address || 'Not provided'}
- Landmark: ${order.landmark || 'None'}
- Alternate Phone: ${order.alt_phone_number || 'None'}
- Delivery Type: ${order.delivery_location || 'Unknown'}
- Payment Method: ${order.payment_method || 'COD'}
- Product: ${order.product_name || 'Unknown'}

Customer History:
- Total Past Orders: ${totalPastOrders}
- Past Delivered: ${pastDelivered}
- Past RTOs: ${pastRtos}
- Personal RTO Rate: ${rtoRate}%

Regional Context:
- Regional RTO Rate: ${regionalRtoRate}%

Order Notes/Remarks: ${order.remarks || 'None'}

Return your analysis in this exact JSON format:
{
  "risk_score": <number 0-100>,
  "risk_label": "<Low|Medium|High>",
  "staff_note": "<specific actionable note>"
}`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "evaluate_rto_risk",
            description: "Evaluate order RTO risk and provide staff notes",
            parameters: {
              type: "object",
              properties: {
                risk_score: { 
                  type: "integer",
                  description: "RTO risk score from 0-100"
                },
                risk_label: { 
                  type: "string",
                  enum: ["Low", "Medium", "High"],
                  description: "RTO risk level"
                },
                staff_note: { 
                  type: "string",
                  description: "Specific actionable note for operations staff"
                }
              },
              required: ["risk_score", "risk_label", "staff_note"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "evaluate_rto_risk" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData));

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const result = typeof toolCall.function.arguments === 'string' 
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    // Update order with AI evaluation
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        ai_rto_risk_score: result.risk_score,
        ai_rto_risk_label: result.risk_label,
        ai_notes: result.staff_note,
        ai_last_evaluated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to update order');
    }

    return new Response(
      JSON.stringify({
        risk_score: result.risk_score,
        risk_label: result.risk_label,
        staff_note: result.staff_note,
        evaluated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-evaluate-order:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});