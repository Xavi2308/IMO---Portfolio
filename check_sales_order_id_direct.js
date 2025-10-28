const { createClient } = require('@supabase/supabase-js');

// Hardcoded for quick check - will read from browser network tab
const supabaseUrl = 'https://cqyuujbpvwbuvtjrwidn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeXV1amJwdndidXZ0anJ3aWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NjQyNjUsImV4cCI6MjA1MDA0MDI2NX0.1pKYK3rYfDBFOsLZLNnOXe-VhCJ8BK31Rf1L-P2PZnU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSalesOrderId() {
  try {
    console.log('🔍 Checking sales data for order_id patterns...\n');
    
    // Get recent sales with their order_id and sale_type
    const { data: sales, error } = await supabase
      .from('sales')
      .select(`
        id,
        sale_type,
        order_id,
        total,
        created_at,
        customers (name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching sales:', error);
      return;
    }

    if (!sales || sales.length === 0) {
      console.log('📭 No sales found');
      return;
    }

    console.log(`📊 Found ${sales.length} recent sales:\n`);
    
    sales.forEach((sale, index) => {
      console.log(`${index + 1}. Sale ID: ${sale.id}`);
      console.log(`   Sale Type: "${sale.sale_type}"`);
      console.log(`   Order ID: ${sale.order_id === null ? 'NULL' : `"${sale.order_id}"`}`);
      console.log(`   Customer: ${sale.customers?.name || 'N/A'}`);
      console.log(`   Total: $${sale.total}`);
      console.log(`   Created: ${new Date(sale.created_at).toLocaleString()}`);
      console.log(`   → Will display as: ${sale.order_id ? 'ORDEN' : sale.sale_type || 'Unknown'}`);
      console.log('');
    });

    // Check patterns
    const withOrderId = sales.filter(s => s.order_id !== null);
    const withoutOrderId = sales.filter(s => s.order_id === null);
    
    console.log(`📈 Analysis:`);
    console.log(`   Sales with order_id: ${withOrderId.length} (will show as "Orden")`);
    console.log(`   Sales without order_id: ${withoutOrderId.length} (will show as sale_type)`);
    
    if (withOrderId.length > 0) {
      console.log(`\n🎯 Sales showing as "Orden" (have order_id):`);
      withOrderId.forEach(sale => {
        console.log(`   - ID ${sale.id}: sale_type="${sale.sale_type}", order_id="${sale.order_id}"`);
      });
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkSalesOrderId();