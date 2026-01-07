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
    const { leadId } = await req.json();

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'Lead ID is required' }),
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

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Lead fetch error:', leadError);
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch lead history - count past orders and RTOs
    const { data: pastOrders } = await supabase
      .from('orders')
      .select('order_status, phone_number')
      .eq('phone_number', lead.contact_number);

    const pastOrderCount = pastOrders?.length || 0;
    const pastRtoCount = pastOrders?.filter(o => 
      o.order_status === 'RETURNED' || o.order_status === 'CANCELLED'
    ).length || 0;

    // Construct AI prompt
    const systemPrompt = `You are an expert Nepali ecommerce sales assistant specializing in lead qualification and conversion optimization.

Your task is to analyze lead data and provide:
1. A lead quality score from 0-100 (where 100 is highest quality)
2. A label: "Hot", "Warm", or "Cold"
3. A friendly follow-up WhatsApp message in mixed English and simple Roman Nepali

Consider these factors:
- Lead source (Facebook Ads, Instagram, Organic, etc.)
- Product interest
- Location (some regions have higher conversion)
- Past order history (if any)
- Past RTO history (returns indicate issues)
- Contact quality (phone, address completeness)

Be practical and encouraging in the follow-up message. Keep it under 100 words.`;

    const userPrompt = `Analyze this lead:

Name: ${lead.client_name || 'Unknown'}
Phone: ${lead.contact_number}
Province: ${lead.province || 'Not specified'}
District: ${lead.city || 'Not specified'}
Address: ${lead.full_address || 'Not provided'}
Source: ${lead.source || 'Unknown'}
Product Interest: ${lead.product_name || 'General'}
Past Orders: ${pastOrderCount}
Past RTOs: ${pastRtoCount}
Current Status: ${lead.order_status || 'NEW'}
Notes: ${lead.remarks || 'None'}

Return your analysis in this exact JSON format:
{
  "score": <number 0-100>,
  "label": "<Hot|Warm|Cold>",
  "followup_text": "<friendly message>"
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
            name: "evaluate_lead",
            description: "Evaluate lead quality and generate follow-up message",
            parameters: {
              type: "object",
              properties: {
                score: { 
                  type: "integer",
                  description: "Lead quality score from 0-100"
                },
                label: { 
                  type: "string",
                  enum: ["Hot", "Warm", "Cold"],
                  description: "Lead quality label"
                },
                followup_text: { 
                  type: "string",
                  description: "Friendly follow-up message"
                }
              },
              required: ["score", "label", "followup_text"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "evaluate_lead" } }
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

    // Update lead with AI evaluation
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        ai_lead_score: result.score,
        ai_lead_label: result.label,
        ai_followup_text: result.followup_text,
        ai_last_evaluated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to update lead');
    }

    return new Response(
      JSON.stringify({
        score: result.score,
        label: result.label,
        followup_text: result.followup_text,
        evaluated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-evaluate-lead:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});