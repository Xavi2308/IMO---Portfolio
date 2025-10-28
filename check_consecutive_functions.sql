-- Script para verificar funciones get_next_consecutive existentes
SELECT 'FUNCIONES get_next_consecutive EXISTENTES:' as info;

SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type,
    prosrc as source_code
FROM pg_proc 
WHERE proname = 'get_next_consecutive'
ORDER BY oid;

-- También verificar si hay otras funciones relacionadas con consecutivos
SELECT 'OTRAS FUNCIONES DE CONSECUTIVOS:' as info;

SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname LIKE '%consecutive%'
ORDER BY proname;