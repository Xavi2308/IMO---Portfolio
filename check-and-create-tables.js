// ========================================
// VERIFICADOR Y CREADOR DE TABLAS
// ========================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODAyMjU3OCwiZXhwIjoyMDYzNTk4NTc4fQ.tDy9qlbeW2RxP4YE_vb44vjZABcgkBWwhsQWhO-5U-k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndCreateTables() {
  console.log('🔍 Verificando tablas existentes...');

  // Verificar tablas existentes
  const tables = [
    'promotions',
    'payment_only_sales', 
    'account_transactions',
    'dispatch_remissions'
  ];

  for (const tableName of tables) {
    try {
      console.log(`📋 Verificando tabla: ${tableName}`);
      
      // Intentar hacer una consulta simple para ver si la tabla existe
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log(`❌ Tabla ${tableName} NO existe`);
          await createTable(tableName);
        } else {
          console.log(`⚠️ Error verificando ${tableName}:`, error.message);
        }
      } else {
        console.log(`✅ Tabla ${tableName} existe`);
      }
    } catch (err) {
      console.error(`💥 Error con tabla ${tableName}:`, err.message);
    }
  }

  // Verificar funciones esenciales
  await checkFunctions();
}

async function createTable(tableName) {
  console.log(`🏗️ Intentando crear tabla: ${tableName}`);
  
  // Como no podemos ejecutar DDL directamente, vamos a usar un enfoque alternativo
  // Intentar insertar un registro dummy para forzar el error específico
  try {
    const { data, error } = await supabase
      .from(tableName)
      .insert({ temp: true });

    console.log(`⚠️ Tabla ${tableName} necesita ser creada manualmente en Supabase Dashboard`);
    
  } catch (err) {
    console.log(`⚠️ Confirma que la tabla ${tableName} necesita ser creada`);
  }
}

async function checkFunctions() {
  console.log('\n🔧 Verificando funciones...');
  
  const functions = [
    'get_next_consecutive',
    'calculate_account_balance'
  ];

  for (const funcName of functions) {
    try {
      console.log(`🔍 Verificando función: ${funcName}`);
      
      // Intentar llamar la función con parámetros dummy
      let testCall;
      if (funcName === 'get_next_consecutive') {
        testCall = supabase.rpc(funcName, { 
          p_type: 'test', 
          p_company_id: '00000000-0000-0000-0000-000000000000' 
        });
      } else if (funcName === 'calculate_account_balance') {
        testCall = supabase.rpc(funcName, { 
          account_id_param: '00000000-0000-0000-0000-000000000000' 
        });
      }

      const { data, error } = await testCall;

      if (error) {
        if (error.message.includes('does not exist') || error.code === '42883') {
          console.log(`❌ Función ${funcName} NO existe`);
        } else {
          console.log(`✅ Función ${funcName} existe (error esperado con parámetros dummy)`);
        }
      } else {
        console.log(`✅ Función ${funcName} existe y funciona`);
      }
    } catch (err) {
      console.log(`⚠️ Error verificando función ${funcName}:`, err.message);
    }
  }
}

async function showDDLCommands() {
  console.log('\n📝 COMANDOS DDL PARA EJECUTAR EN SUPABASE DASHBOARD:');
  console.log('==================================================');
  
  const ddlCommands = [
    `-- Tabla de promociones
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_purchase_amount DECIMAL(10,2) DEFAULT 0,
  max_discount_amount DECIMAL(10,2),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`,

    `-- Tabla de pagos sin referencia
CREATE TABLE IF NOT EXISTS payment_only_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  payment_proof_url TEXT,
  consecutive_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`,

    `-- Tabla de transacciones de cuenta
CREATE TABLE IF NOT EXISTS account_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  transaction_type VARCHAR(50) DEFAULT 'adjustment',
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`,

    `-- Tabla de remisiones de despacho
CREATE TABLE IF NOT EXISTS dispatch_remissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  remission_number INTEGER NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_document VARCHAR(50),
  customer_address TEXT,
  total_items INTEGER DEFAULT 0,
  confirmed_items INTEGER DEFAULT 0,
  generated_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'generated',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`,

    `-- Función para obtener siguiente consecutivo
CREATE OR REPLACE FUNCTION get_next_consecutive(p_type TEXT, p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Obtener el siguiente número
  SELECT COALESCE(MAX(
    CASE 
      WHEN p_type = 'sale' THEN consecutive_number
      WHEN p_type = 'account' THEN account_consecutive  
      WHEN p_type = 'dispatch' THEN dispatch_consecutive
      WHEN p_type = 'remission' THEN remission_consecutive
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM company_consecutives 
  WHERE company_id = p_company_id;

  -- Si no existe registro, crear uno
  IF next_number = 1 THEN
    INSERT INTO company_consecutives (company_id, consecutive_number, account_consecutive, dispatch_consecutive, remission_consecutive)
    VALUES (p_company_id, 
      CASE WHEN p_type = 'sale' THEN 1 ELSE 0 END,
      CASE WHEN p_type = 'account' THEN 1 ELSE 0 END,
      CASE WHEN p_type = 'dispatch' THEN 1 ELSE 0 END,
      CASE WHEN p_type = 'remission' THEN 1 ELSE 0 END
    );
  ELSE
    -- Actualizar el consecutivo
    UPDATE company_consecutives 
    SET 
      consecutive_number = CASE WHEN p_type = 'sale' THEN next_number ELSE consecutive_number END,
      account_consecutive = CASE WHEN p_type = 'account' THEN next_number ELSE account_consecutive END,
      dispatch_consecutive = CASE WHEN p_type = 'dispatch' THEN next_number ELSE dispatch_consecutive END,
      remission_consecutive = CASE WHEN p_type = 'remission' THEN next_number ELSE remission_consecutive END,
      updated_at = NOW()
    WHERE company_id = p_company_id;
  END IF;

  RETURN next_number;
END;
$$ LANGUAGE plpgsql;`,

    `-- Función para calcular balance de cuenta
CREATE OR REPLACE FUNCTION calculate_account_balance(account_id_param UUID)
RETURNS TABLE(balance DECIMAL, status TEXT) AS $$
DECLARE
  sales_total DECIMAL := 0;
  payments_total DECIMAL := 0;
  transactions_total DECIMAL := 0;
  final_balance DECIMAL;
  balance_status TEXT;
BEGIN
  -- Sumar ventas (débito)
  SELECT COALESCE(SUM(total_value), 0)
  INTO sales_total
  FROM sales
  WHERE account_id = account_id_param;

  -- Sumar pagos de ventas (crédito)
  SELECT COALESCE(SUM(payment_amount), 0)
  INTO payments_total
  FROM sales
  WHERE account_id = account_id_param;

  -- Sumar pagos sin referencia (crédito)
  SELECT COALESCE(SUM(amount), 0)
  INTO payments_total
  FROM payment_only_sales
  WHERE account_id = account_id_param;

  -- Sumar transacciones manuales
  SELECT COALESCE(SUM(amount), 0)
  INTO transactions_total
  FROM account_transactions
  WHERE account_id = account_id_param;

  -- Calcular balance final
  final_balance := sales_total - payments_total + transactions_total;

  -- Determinar estado
  IF final_balance > 0 THEN
    balance_status := 'pending';
  ELSIF final_balance < 0 THEN
    balance_status := 'favor';
    final_balance := ABS(final_balance);
  ELSE
    balance_status := 'balanced';
  END IF;

  RETURN QUERY SELECT final_balance, balance_status;
END;
$$ LANGUAGE plpgsql;`
  ];

  ddlCommands.forEach((cmd, index) => {
    console.log(`\n-- COMANDO ${index + 1}:`);
    console.log(cmd);
  });

  console.log('\n📋 INSTRUCCIONES:');
  console.log('1. Ve a tu dashboard de Supabase');
  console.log('2. Abre el SQL Editor');
  console.log('3. Copia y pega cada comando por separado');
  console.log('4. Ejecuta cada uno individualmente');
  console.log('5. Vuelve a ejecutar este script para verificar');
}

// Ejecutar verificación
checkAndCreateTables().then(() => {
  showDDLCommands();
}).catch(console.error);
