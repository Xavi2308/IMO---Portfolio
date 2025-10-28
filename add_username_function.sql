-- Función para agregar columna username si no existe
CREATE OR REPLACE FUNCTION add_username_column()
RETURNS void AS $$
BEGIN
  -- Verificar si la columna existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'username'
  ) THEN
    -- Agregar la columna
    ALTER TABLE user_profiles ADD COLUMN username VARCHAR(50);
    
    -- Actualizar usuarios existentes con username basado en su email
    UPDATE user_profiles 
    SET username = SPLIT_PART((SELECT email FROM auth.users WHERE id = user_profiles.id), '@', 1)
    WHERE username IS NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
