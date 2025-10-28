-- ========================================
-- VERIFICAR ESTRUCTURA ACTUAL DE USERS
-- ========================================

-- Ver estructura actual de users
SELECT 
    'ESTRUCTURA ACTUAL DE USERS' as info,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
