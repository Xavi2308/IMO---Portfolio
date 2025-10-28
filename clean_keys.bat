@echo off
echo Limpiando claves de Supabase del portfolio...

REM Reemplazar claves anon principales
powershell -Command "(Get-Content -Path '*.js' -Raw) -replace 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMjI1NzgsImV4cCI6MjA2MzU5ODU3OH0\.HAwUsqs5A5eIUivDxGuFR29Cm2RpdS1jwbltLrS46FQ', 'your-anon-key-here' | Set-Content -Path '*_temp.js'"

REM Reemplazar claves service role
powershell -Command "(Get-Content -Path '*.js' -Raw) -replace 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2FyYnVtemtxeXdvb3Ric2d5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODAyMjU3OCwiZXhwIjoyMDYzNTk4NTc4fQ\.tDy9qlbeW2RxP4YE_vb44vjZABcgkBWwhsQWhO-5U-k', 'your-service-role-key-here' | Set-Content -Path '*_temp.js'"

echo Limpieza completada