const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://your-project.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsdHRvd2twc3dwZ25jY2RxZXlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDkxMzc2NiwiZXhwIjoyMDQ2NDg5NzY2fQ.Ts8E2SFJ_3OvepJqJ_GNkgz1A-HGqw2iP3Cr5fhD1kI'
);

async function createDispatchTables() {
  try {
    console.log('🚀 Creando tabla dispatches...');
    
    // Crear tabla dispatches
    const { error: dispatchesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS dispatches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
          company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
          dispatch_number VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
          delivery_address TEXT,
          notes TEXT,
          total_items INTEGER DEFAULT 0,
          confirmed_items INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id),
          dispatch_user_id UUID REFERENCES users(id),
          completed_at TIMESTAMP WITH TIME ZONE,
          UNIQUE(company_id, dispatch_number)
        );
      `
    });
    
    if (dispatchesError) {
      console.error('Error creating dispatches table:', dispatchesError);
    } else {
      console.log('✅ Tabla dispatches creada');
    }

    console.log('🚀 Creando tabla dispatch_items...');
    
    // Crear tabla dispatch_items
    const { error: itemsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS dispatch_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          dispatch_id UUID NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,
          sale_id UUID REFERENCES sales(id),
          reference VARCHAR(100) NOT NULL,
          color VARCHAR(50),
          size VARCHAR(50),
          quantity INTEGER NOT NULL DEFAULT 1,
          confirmed BOOLEAN DEFAULT FALSE,
          confirmed_by UUID REFERENCES users(id),
          confirmed_at TIMESTAMP WITH TIME ZONE,
          confirmation_method VARCHAR(20) DEFAULT 'manual' CHECK (confirmation_method IN ('manual', 'barcode', 'qr'))
        );
      `
    });
    
    if (itemsError) {
      console.error('Error creating dispatch_items table:', itemsError);
    } else {
      console.log('✅ Tabla dispatch_items creada');
    }

    console.log('✨ Tablas de despacho creadas exitosamente');
    
  } catch (err) {
    console.error('Error general:', err.message);
  }
}

createDispatchTables();
