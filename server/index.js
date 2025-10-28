// --- LÓGICA HÍBRIDA PARA VARIABLES DE ENTORNO ---
// Solo si las variables no son proporcionadas por Electron, cargarlas desde .env
if (!process.env.SUPABASE_URL) {
  console.log('Modo desarrollo web detectado. Cargando variables desde .env');
  const dotenv = require('dotenv');
  dotenv.config();
}
// --------------------------------------------------

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Permite conexiones del frontend de desarrollo y de Electron

// Importar el router de migración
const migrateRouter = require('./migrate-company-ids');

console.log('URL del servidor:', process.env.SUPABASE_URL);
console.log('KEY de servicio del servidor:', process.env.SUPABASE_SERVICE_KEY ? 'Recibida' : 'NO RECIBIDA');

// Valida que las variables existan antes de crear el cliente
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridas.');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// --- El resto de tus rutas API permanecen exactamente iguales ---

// Ruta para crear usuario
app.post('/api/users', async (req, res) => {
  const { email, password, username, role } = req.body;
  try {
    // Validar que el username no exista
    const { data: existingUser, error: userCheckError } = await supabase.from('users').select('id').eq('username', username).single();
    if (userCheckError && userCheckError.code !== 'PGRST116') throw userCheckError;
    if (existingUser) throw new Error('El nombre de usuario ya existe.');

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username: username },
      email_confirm: true // Confirma el email automáticamente
    });
    if (error) throw error;

    const { error: insertError } = await supabase.from('users').insert({
      id: data.user.id,
      email,
      username,
      role
    });
    if (insertError) {
        await supabase.auth.admin.deleteUser(data.user.id);
        throw insertError;
    }

    res.status(201).json({ message: 'Usuario creado', user: data.user });
  } catch (err) {
    console.error('Error creando usuario:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Ruta para eliminar usuario
// Ruta para eliminar usuario (CORREGIDA)
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`Petición web para eliminar usuario: ${id}`);

  try {
    // 1. Desvincular registros en otras tablas
    await supabase.from('sales').update({ created_by: null }).eq('created_by', id);
    await supabase.from('sales').update({ approved_by: null }).eq('approved_by', id);
    await supabase.from('orders').update({ user_id: null }).eq('user_id', id);
    await supabase.from('inventory_movements').update({ user_id: null }).eq('user_id', id);
    await supabase.from('notifications').update({ user_id: null }).eq('user_id', id);

    // 2. Eliminar settings del usuario (por restricción de clave foránea)
    await supabase.from('settings').delete().eq('user_id', id);

    // 3. Eliminar el perfil de la tabla 'public.users'
    const { error: profileError } = await supabase.from('users').delete().eq('id', id);
    if (profileError) throw profileError;

    // 4. Finalmente, eliminar el usuario de la autenticación
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) throw authError;

    res.status(200).json({ message: 'Usuario eliminado exitosamente' });
  } catch (err) {
    console.error(`Error al eliminar usuario (web): ${err.message}`);
    res.status(400).json({ error: `Error al eliminar usuario: ${err.message}` });
  }
});


// Ruta para obtener todos los usuarios
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error('Error obteniendo usuarios:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Endpoint para verificar tabla users (no profiles)
app.get('/api/check-profiles', async (req, res) => {
  try {
    console.log('🔍 Verificando tabla users...');
    
    // Obtener estructura de la tabla users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(10);
    
    if (usersError) {
      throw new Error(`Error obteniendo users: ${usersError.message}`);
    }
    
    // Contar users por company_id
    const { data: usersCount, error: countError } = await supabase
      .from('users')
      .select('company_id, id')
      .order('company_id');
    
    if (countError) {
      throw new Error(`Error contando users: ${countError.message}`);
    }
    
    // Agrupar por company_id
    const countByCompany = {};
    let nullCount = 0;
    
    usersCount?.forEach(user => {
      if (user.company_id === null) {
        nullCount++;
      } else {
        countByCompany[user.company_id] = (countByCompany[user.company_id] || 0) + 1;
      }
    });
    
    const result = {
      success: true,
      totalUsers: usersCount?.length || 0,
      nullCompanyId: nullCount,
      byCompanyId: countByCompany,
      sampleUsers: users?.map(p => ({
        id: p.id,
        email: p.email,
        username: p.username,
        company_id: p.company_id,
        role: p.role
      })) || []
    };
    
    console.log('📊 Resultado users:', result);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error verificando users:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint para migrar company_id en tabla users (no profiles)
app.post('/api/migrate-profiles', async (req, res) => {
  try {
    console.log('🔄 Iniciando migración de usuarios...');
    
    // 1. Obtener todas las empresas
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .order('created_at', { ascending: true }); // La primera empresa creada será la objetivo
    
    if (companiesError) {
      throw new Error(`Error obteniendo empresas: ${companiesError.message}`);
    }
    
    if (!companies || companies.length === 0) {
      throw new Error('No se encontraron empresas en la base de datos');
    }
    
    const targetCompany = companies[0]; // Demo Company
    console.log(`🎯 Empresa objetivo: ${targetCompany.name} (${targetCompany.id})`);
    
    // 2. Contar users sin company_id ANTES
    const { data: usersBefore, error: usersBeforeError } = await supabase
      .from('users')
      .select('id, email, username')
      .is('company_id', null);
    
    if (usersBeforeError) {
      throw new Error(`Error consultando users: ${usersBeforeError.message}`);
    }
    
    const usersCountBefore = usersBefore?.length || 0;
    console.log(`📋 users sin company_id antes: ${usersCountBefore}`);
    
    if (usersCountBefore > 0) {
      console.log('👥 Usuarios a migrar:');
      usersBefore.forEach(p => console.log(`   - ${p.username} (${p.email})`));
    }
    
    // 3. Migrar users
    console.log('🔄 Migrando users...');
    const { error: usersError } = await supabase
      .from('users')
      .update({ company_id: targetCompany.id })
      .is('company_id', null);
    
    if (usersError) {
      throw new Error(`Error migrando users: ${usersError.message}`);
    }
    console.log('✅ Users migrados exitosamente');
    
    // 4. Contar users sin company_id DESPUÉS
    const { data: usersAfter } = await supabase
      .from('users')
      .select('id')
      .is('company_id', null);
    
    const usersCountAfter = usersAfter?.length || 0;
    console.log(`📋 users sin company_id después: ${usersCountAfter}`);
    
    // 5. Obtener distribución final
    const { data: distributionData } = await supabase
      .from('users')
      .select(`
        company_id,
        companies!inner(name)
      `);
    
    const distribution = {};
    distributionData?.forEach(user => {
      const companyName = user.companies.name;
      distribution[companyName] = (distribution[companyName] || 0) + 1;
    });
    
    const result = {
      success: true,
      message: '✅ Migración de Usuarios Exitosa',
      targetCompany: targetCompany.name,
      before: {
        profiles: usersCountBefore,
        usersMigrated: usersBefore || []
      },
      after: {
        profiles: usersCountAfter
      },
      distribution
    };
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error migrando users:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint para arreglar recursión infinita en RLS (simplificado)
app.post('/api/fix-rls-recursion', async (req, res) => {
  try {
    console.log('🔧 Diagnóstico de RLS user_companies...');
    
    // Intentar hacer una consulta simple para probar RLS
    const { data: testData, error: testError } = await supabase
      .from('user_companies')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error de RLS confirmado:', testError.message);
      
      // Sugerir solución manual
      const manualFix = `
      -- Ejecutar en el SQL Editor de Supabase Dashboard:
      
      -- 1. Deshabilitar RLS temporalmente
      ALTER TABLE public.user_companies DISABLE ROW LEVEL SECURITY;
      
      -- 2. Eliminar políticas problemáticas
      DROP POLICY IF EXISTS "Users can view their own company relationships" ON public.user_companies;
      DROP POLICY IF EXISTS "Users can insert their own company relationships" ON public.user_companies;
      DROP POLICY IF EXISTS "Users can update their own company relationships" ON public.user_companies;
      DROP POLICY IF EXISTS "Users can delete their own company relationships" ON public.user_companies;
      DROP POLICY IF EXISTS "Enable read access for own user_companies" ON public.user_companies;
      DROP POLICY IF EXISTS "Enable insert for own user_companies" ON public.user_companies;
      DROP POLICY IF EXISTS "Enable update for own user_companies" ON public.user_companies;
      DROP POLICY IF EXISTS "Enable delete for own user_companies" ON public.user_companies;
      
      -- 3. Crear políticas simples
      CREATE POLICY "user_companies_select_policy" ON public.user_companies
          FOR SELECT USING (user_id = auth.uid());
      
      CREATE POLICY "user_companies_insert_policy" ON public.user_companies
          FOR INSERT WITH CHECK (user_id = auth.uid());
      
      CREATE POLICY "user_companies_update_policy" ON public.user_companies
          FOR UPDATE USING (user_id = auth.uid());
      
      CREATE POLICY "user_companies_delete_policy" ON public.user_companies
          FOR DELETE USING (user_id = auth.uid());
      
      -- 4. Rehabilitar RLS
      ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
      `;
      
      res.json({
        success: false,
        error: testError.message,
        diagnosis: 'RLS recursion confirmado',
        manualFix: manualFix.trim(),
        instructions: [
          '1. Ve a Supabase Dashboard > SQL Editor',
          '2. Copia y pega el SQL del campo "manualFix"',
          '3. Ejecuta el script completo',
          '4. Recarga la aplicación'
        ]
      });
    } else {
      res.json({
        success: true,
        message: '✅ RLS funciona correctamente',
        data: testData
      });
    }
    
  } catch (error) {
    console.error('❌ Error en diagnóstico RLS:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Usar el router de migración
app.use('/api', migrateRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor de API iniciado en el puerto ${PORT}`);
  if (process.send) {
    process.send('server-ready');
  }
});