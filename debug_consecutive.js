const { createClient } = require('@supabase/supabase-js');

// Using the same keys from the successful fetch
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeXV1amJwdndidXZ0anJ3aWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NjQyNjUsImV4cCI6MjA1MDA0MDI2NX0.1pKYK3rYfDBFOsLZLNnOXe-VhCJ8BK31Rf1L-P2PZnU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSalesConsecutive() {
  try {
    console.log('🔍 Checking sales consecutive_number field...\n');
    
    // Get recent sales with consecutive_number data
    const { data: sales, error } = await supabase
      .from('sales')
      .select(`
        id,
        consecutive_number,
        sale_type,
        order_id,
        total_value,
        created_at,
        customers (name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

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
      console.log(`   Consecutive: ${sale.consecutive_number === null ? 'NULL' : `"${sale.consecutive_number}"`}`);
      console.log(`   Sale Type: "${sale.sale_type}"`);
      console.log(`   Order ID: ${sale.order_id === null ? 'NULL' : `"${sale.order_id}"`}`);
      console.log(`   Customer: ${sale.customers?.name || 'N/A'}`);
      console.log(`   Total: $${sale.total_value}`);
      console.log(`   Created: ${new Date(sale.created_at).toLocaleString()}`);
      console.log('');
    });

    // Check column structure
    console.log('\n🔍 Checking table structure...');
    const { data: columns, error: structError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'sales' 
          AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });

    if (structError) {
      console.error('❌ Error checking structure:', structError);
    } else {
      console.log('📋 Table structure:', columns);
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkSalesConsecutive();