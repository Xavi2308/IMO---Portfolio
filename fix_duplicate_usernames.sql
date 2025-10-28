-- Script para actualizar usernames evitando duplicados
DO $$
DECLARE
    user_record RECORD;
    base_username TEXT;
    final_username TEXT;
    counter INTEGER;
BEGIN
    -- Actualizar usuarios que no tienen username o tienen username vacío
    FOR user_record IN 
        SELECT up.id, au.email 
        FROM user_profiles up
        JOIN auth.users au ON au.id = up.id
        WHERE up.username IS NULL OR up.username = ''
    LOOP
        -- Extraer la parte antes del @ del email
        base_username := SPLIT_PART(user_record.email, '@', 1);
        final_username := base_username;
        counter := 1;
        
        -- Verificar si el username ya existe y agregar número si es necesario
        WHILE EXISTS (SELECT 1 FROM user_profiles WHERE username = final_username) LOOP
            final_username := base_username || counter;
            counter := counter + 1;
        END LOOP;
        
        -- Actualizar el usuario con el username único
        UPDATE user_profiles 
        SET username = final_username 
        WHERE id = user_record.id;
        
        RAISE NOTICE 'Usuario % actualizado con username: %', user_record.email, final_username;
    END LOOP;
END $$;
