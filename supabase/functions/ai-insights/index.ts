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

    const { date, storeId } = await req.json();
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get store info
    const { data: storeData } = await supabaseClient
      .from('stores')
      .select('name')
      .eq('id', storeId)
      .single();

    if (!storeData) {
      return new Response(
        JSON.stringify({ error: 'Store not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get today's orders
    const { data: todayOrders } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', `${targetDate}T00:00:00`)
      .lte('created_at', `${targetDate}T23:59:59`);

    // Get last 7 days orders
    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: last7DaysOrders } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .lte('created_at', `${targetDate}T23:59:59`);

    // Get last 30 days orders for RTO analysis
    const thirtyDaysAgo = new Date(targetDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: last30DaysOrders } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get products for today's orders
    const orderIds = (todayOrders || []).map(o => o.id);
    let topProducts: any[] = [];
    if (orderIds.length > 0) {
      const { data: orderItems } = await supabaseClient
        .from('order_items')
        .select('product_id, quantity, total_price, products!inner(name)')
        .in('order_id', orderIds);

      const productMap = new Map();
      (orderItems || []).forEach((item: any) => {
        const name = item.products?.name || 'Unknown';
        if (!productMap.has(name)) {
          productMap.set(name, { name, quantity: 0, revenue: 0 });
        }
        const p = productMap.get(name);
        p.quantity += item.quantity;
        p.revenue += item.total_price || 0;
      });
      topProducts = Array.from(productMap.values())
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 5);
    }

    // Get marketing spend last 7 days
    const { data: marketingSpend } = await supabaseClient
      .from('ads_spend')
      .select('platform, npr_amount')
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .lte('date', targetDate);

    const spendByChannel = (marketingSpend || []).reduce((acc: any, item) => {
      acc[item.platform] = (acc[item.platform] || 0) + (item.npr_amount || 0);
      return acc;
    }, {});

    // Calculate metrics
    const todayTotal = (todayOrders || []).length;
    const todayConfirmed = (todayOrders || []).filter(o => o.order_status === 'CONFIRMED').length;
    const todayDelivered = (todayOrders || []).filter(o => o.order_status === 'DELIVERED').length;
    const todayCancelled = (todayOrders || []).filter(o => o.order_status === 'CANCELLED').length;
    const todaySales = (todayOrders || [])
      .filter(o => o.order_status === 'CONFIRMED' || o.order_status === 'DELIVERED')
      .reduce((sum, o) => sum + (o.amount || 0), 0);

    const last7DaysTotal = (last7DaysOrders || []).length;
    const last7DaysSales = (last7DaysOrders || []).reduce((sum, o) => sum + (o.amount || 0), 0);

    const rtoOrders30d = (last30DaysOrders || []).filter(o => 
      o.order_status === 'RETURNED' || o.order_status === 'RTO'
    ).length;
    const totalOrders30d = (last30DaysOrders || []).length;
    const rtoRate30d = totalOrders30d > 0 ? (rtoOrders30d / totalOrders30d) * 100 : 0;

    // Province breakdown
    const salesByProvince = (last7DaysOrders || []).reduce((acc: any, order) => {
      const province = order.province || 'Unknown';
      if (!acc[province]) {
        acc[province] = { orders: 0, sales: 0, rto: 0 };
      }
      acc[province].orders += 1;
      acc[province].sales += order.amount || 0;
      if (order.order_status === 'RETURNED' || order.order_status === 'RTO') {
        acc[province].rto += 1;
      }
      return acc;
    }, {});

    const metrics = {
      store_name: storeData.name,
      date: targetDate,
      today: {
        total_orders: todayTotal,
        confirmed: todayConfirmed,
        delivered: todayDelivered,
        cancelled: todayCancelled,
        sales: todaySales,
        avg_order_value: todayTotal > 0 ? todaySales / todayTotal : 0
      },
      last_7_days: {
        total_orders: last7DaysTotal,
        sales: last7DaysSales,
        avg_daily: last7DaysTotal / 7
      },
      rto: {
        rate_30d: rtoRate30d,
        count_30d: rtoOrders30d
      },
      top_products: topProducts,
      sales_by_province: salesByProvince,
      marketing_spend: spendByChannel
    };

    // Generate AI insights using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured', metrics }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert business analyst for Nepali e-commerce brands. Your job is to analyze daily business metrics and provide clear, actionable insights in simple English (you can use casual Nepali words where appropriate).

Focus on:
1. ROI and profitability
2. RTO (Return to Origin) issues
3. Product performance
4. Geographic patterns
5. Marketing effectiveness

Be concise, practical, and friendly. Highlight problems AND opportunities.`;

    const userPrompt = `Analyze this data for ${storeData.name} on ${targetDate}:

${JSON.stringify(metrics, null, 2)}

Please provide:
1. A daily summary (2-4 paragraphs) explaining what happened today compared to the last week
2. Key observations (3-5 bullet points) highlighting important patterns or concerns
3. Action suggestions (3-5 bullet points) with specific, practical recommendations`;

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
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI rate limit exceeded, please try again later', metrics }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted, please add credits', metrics }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('AI gateway error:', aiResponse.status, await aiResponse.text());
      return new Response(
        JSON.stringify({ error: 'AI service error', metrics }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.choices[0]?.message?.content || 'Unable to generate insights';

    // Parse AI response into sections
    const sections = aiText.split('\n\n');
    let dailySummary = '';
    let keyObservations: string[] = [];
    let actionSuggestions: string[] = [];

    let currentSection = 'summary';
    sections.forEach((section: string) => {
      const lower = section.toLowerCase();
      if (lower.includes('key observation') || lower.includes('observations:')) {
        currentSection = 'observations';
        return;
      }
      if (lower.includes('action') || lower.includes('suggestion') || lower.includes('recommend')) {
        currentSection = 'actions';
        return;
      }

      if (currentSection === 'summary') {
        dailySummary += section + '\n\n';
      } else if (currentSection === 'observations') {
        const bullets = section.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('•') || l.trim().match(/^\d+\./));
        keyObservations.push(...bullets.map(b => b.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim()));
      } else if (currentSection === 'actions') {
        const bullets = section.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('•') || l.trim().match(/^\d+\./));
        actionSuggestions.push(...bullets.map(b => b.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim()));
      }
    });

    // Fallback parsing if structure doesn't work
    if (!keyObservations.length && !actionSuggestions.length) {
      dailySummary = aiText;
    }

    return new Response(
      JSON.stringify({
        metrics,
        ai_insights: {
          daily_summary: dailySummary.trim(),
          key_observations: keyObservations.filter(o => o.length > 0),
          action_suggestions: actionSuggestions.filter(a => a.length > 0),
          raw_text: aiText
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-insights function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
