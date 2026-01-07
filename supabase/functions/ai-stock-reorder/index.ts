import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { storeId, warehouseId, lookbackDays = 30 } = await req.json();

    if (!storeId) {
      return new Response(
        JSON.stringify({ error: 'storeId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get products with current inventory
    let inventoryQuery = supabaseClient
      .from('product_inventory')
      .select(`
        *,
        products!inner(id, name, category, base_cost, selling_price),
        warehouses!inner(id, name, type)
      `);

    if (warehouseId) {
      inventoryQuery = inventoryQuery.eq('warehouse_id', warehouseId);
    }

    const { data: inventoryData, error: invError } = await inventoryQuery;

    if (invError) {
      console.error('Inventory query error:', invError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch inventory data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate date range for lookback
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    // Get sales data from order_items joined with orders
    const { data: salesData } = await supabaseClient
      .from('order_items')
      .select(`
        quantity,
        product_id,
        orders!inner(
          order_date,
          order_status,
          warehouse_id
        )
      `)
      .gte('orders.order_date', startDate.toISOString().split('T')[0])
      .lte('orders.order_date', endDate.toISOString().split('T')[0])
      .in('orders.order_status', ['CONFIRMED', 'DELIVERED']);

    // Aggregate sales by product and warehouse
    const salesByProduct = new Map<string, { totalQty: number; warehouseId: string }>();
    (salesData || []).forEach((item: any) => {
      const key = `${item.product_id}_${item.orders.warehouse_id}`;
      const existing = salesByProduct.get(key) || { totalQty: 0, warehouseId: item.orders.warehouse_id };
      existing.totalQty += item.quantity || 0;
      salesByProduct.set(key, existing);
    });

    // Build analysis data
    const analysisData = (inventoryData || []).map((inv: any) => {
      const key = `${inv.product_id}_${inv.warehouse_id}`;
      const sales = salesByProduct.get(key) || { totalQty: 0 };
      const avgDailySales = sales.totalQty / lookbackDays;
      const daysOfCover = avgDailySales > 0 ? inv.current_stock / avgDailySales : 999;

      return {
        product_id: inv.product_id,
        product_name: inv.products?.name || 'Unknown',
        category: inv.products?.category || '',
        warehouse_id: inv.warehouse_id,
        warehouse_name: inv.warehouses?.name || 'Unknown',
        current_stock: inv.current_stock || 0,
        reorder_level: inv.reorder_level || 0,
        total_sales_qty: sales.totalQty,
        avg_daily_sales: Math.round(avgDailySales * 100) / 100,
        days_of_cover: Math.round(daysOfCover * 10) / 10,
        base_cost: inv.products?.base_cost || 0,
        selling_price: inv.products?.selling_price || 0,
      };
    });

    // Generate AI insights
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured', data: analysisData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an inventory planner for a Nepali D2C e-commerce brand.

Based on product inventory data including:
- current stock levels
- average daily sales velocity
- days of cover (how many days current stock will last)
- reorder level threshold

Your job is to:
1. Classify each product's urgency: "URGENT" (needs immediate reorder), "LOW" (will need reorder soon), or "OK" (sufficient stock)
2. Suggest a reorder quantity for products that need restocking (aim for 30-45 days of stock)
3. Provide a brief, actionable note in simple English (you can add casual Nepali words)

Rules:
- URGENT: days_of_cover < 7 OR current_stock <= reorder_level
- LOW: days_of_cover between 7-14
- OK: days_of_cover > 14
- For overstocked items (days_of_cover > 60), mark as "OVERSTOCKED" with suggested_reorder_qty = 0

Return ONLY a valid JSON array with this exact structure:
[
  {
    "product_id": "uuid-here",
    "urgency": "URGENT" | "LOW" | "OK" | "OVERSTOCKED",
    "suggested_reorder_qty": number,
    "short_note": "brief explanation"
  }
]`;

    const userPrompt = `Analyze this inventory data and provide reorder suggestions:

${JSON.stringify(analysisData.slice(0, 50), null, 2)}

Return ONLY a JSON array as specified. No markdown, no explanation, just the JSON array.`;

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
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI rate limit exceeded', data: analysisData }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted', data: analysisData }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('AI gateway error:', aiResponse.status, await aiResponse.text());
      return new Response(
        JSON.stringify({ error: 'AI service error', data: analysisData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    let aiText = aiData.choices[0]?.message?.content || '[]';

    // Clean up markdown formatting if present
    aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let aiSuggestions: any[] = [];
    try {
      aiSuggestions = JSON.parse(aiText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, aiText);
      // Fallback: basic rule-based suggestions
      aiSuggestions = analysisData.map(item => ({
        product_id: item.product_id,
        urgency: item.days_of_cover < 7 || item.current_stock <= item.reorder_level ? 'URGENT' 
          : item.days_of_cover < 14 ? 'LOW' 
          : item.days_of_cover > 60 ? 'OVERSTOCKED'
          : 'OK',
        suggested_reorder_qty: item.days_of_cover < 14 ? Math.ceil(item.avg_daily_sales * 30) : 0,
        short_note: 'Automatic suggestion based on sales velocity'
      }));
    }

    // Merge AI suggestions with analysis data
    const suggestionMap = new Map(aiSuggestions.map(s => [s.product_id, s]));
    const finalResults = analysisData.map(item => {
      const aiSuggestion = suggestionMap.get(item.product_id) || {
        urgency: 'OK',
        suggested_reorder_qty: 0,
        short_note: 'No AI suggestion available'
      };
      return {
        ...item,
        ...aiSuggestion,
      };
    });

    // Calculate summary
    const summary = {
      total_products: finalResults.length,
      urgent: finalResults.filter(r => r.urgency === 'URGENT').length,
      low: finalResults.filter(r => r.urgency === 'LOW').length,
      ok: finalResults.filter(r => r.urgency === 'OK').length,
      overstocked: finalResults.filter(r => r.urgency === 'OVERSTOCKED').length,
      lookback_days: lookbackDays,
    };

    return new Response(
      JSON.stringify({
        summary,
        results: finalResults,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-stock-reorder function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
