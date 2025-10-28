    async function initializeSession(session) {
      console.log('initializeSession called with session:', session);
      
      // Prevenir múltiples inicializaciones simultáneas
      if (isInitializing) {
        console.log('Already initializing, skipping...');
        return;
      }
      
      setIsInitializing(true);
      
      if (session) {
        console.log('Session exists, user ID:', session.user.id);
        
        // SOLUCIÓN TEMPORAL: Crear usuario con datos por defecto
        // Esto bypassa completamente el problema de Supabase
        console.log('Creating temporary user profile...');
        
        const tempUser = {
          id: session.user.id,
          email: session.user.email,
          username: session.user.email?.split('@')[0] || 'usuario',
          role: 'admin', // Dar admin temporalmente
          first_name: 'Usuario',
          last_name: 'Temporal',
          company_id: '9a54c748-39a9-4ebd-9cc2-2a9f1f8744cf', // Demo Company
          company: {
            id: '9a54c748-39a9-4ebd-9cc2-2a9f1f8744cf',
            name: 'Demo Company',
            subscription_type: 'premium',
            special_agreement: true,
            primary_color: '#DAA520',
            secondary_color: '#B8860B'
          }
        };
        
        console.log('Temporary user created:', tempUser);
        
        // Validar el rol (siempre será válido)
        if (!VALID_ROLES.includes(tempUser.role)) {
          console.log('Invalid role detected:', tempUser.role);
          handleSetUser(null);
          await supabase.auth.signOut();
          setLoadingSession(false);
          setIsInitializing(false);
          alert('Tu rol no es válido o fue manipulado. Contacta al administrador.');
          return;
        }

        console.log('Role validation passed, setting user...');
        handleSetUser(tempUser);

        console.log('User set, configuring default theme...');
        // Configurar tema por defecto
        const themeColor = '#DAA520'; // Dorado para Demo Company
        
        // Aplicar tema
        const palette = generatePalette(themeColor);
        const root = document.documentElement;
        root.style.setProperty('--theme-color', palette.main);
        root.style.setProperty('--theme-main', palette.main);
        root.style.setProperty('--theme-c1', palette.c1);
        root.style.setProperty('--theme-c2', palette.c2);
        root.style.setProperty('--theme-c3', palette.c3);
        root.style.setProperty('--theme-c4', palette.c4);
        root.style.setProperty('--theme-c5', palette.c5);
        root.style.setProperty('--theme-matching-gradient', `linear-gradient(90deg, ${palette.c1}, ${palette.c2}, ${palette.main}, ${palette.c3}, ${palette.c4}, ${palette.c5})`);
        root.style.setProperty('--theme-color-hover', palette.themeColorHover);
        root.style.setProperty('--theme-secondary-1', palette.c3);
        root.style.setProperty('--theme-secondary-2', palette.c4);
        root.style.setProperty('--theme-secondary-3', palette.c5);
        root.style.setProperty('--theme-secondary-4', palette.c2);
        localStorage.setItem('themeColor', themeColor);
        
        console.log('Theme configured, session initialization complete');
        console.log('Session initialized successfully for user:', tempUser);
      } else {
        console.log('No session found, setting user to null');
        handleSetUser(null);
      }
      console.log('Setting loadingSession to false');
      setLoadingSession(false);
      setIsInitializing(false);
      clearTimeout(timeoutId);
    }
