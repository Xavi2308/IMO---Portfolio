# 🔧 Script para Preparar Versión Portfolio

import os
import shutil
import re
from pathlib import Path

class PortfolioPreparator:
    def __init__(self, source_dir, portfolio_dir):
        self.source_dir = Path(source_dir)
        self.portfolio_dir = Path(portfolio_dir)
        
        # Archivos a excluir completamente
        self.exclude_files = {
            '.env',
            '.env.local',
            '.env.production',
            'database_backup.sql',
            'real_data_dump.sql',
            '*.log',
            'node_modules',
            '.git',
            'dist',
            'build'
        }
        
        # Strings sensibles a reemplazar
        self.sensitive_replacements = {
            # URLs de Supabase reales
            'your-project.supabase.co': 'your-project.supabase.co',
            
            # Nombres de empresa reales
            'Demo Company': 'Demo Company',
            'Tech Solutions Demo': 'Tech Solutions Demo',
            
            # Datos sensibles de ejemplo
            'demo@company.com': 'demo@company.com',
            'admin@demo.com': 'admin@demo.com',
            'developer@demo.com': 'developer@demo.com',
            
            # Números de documento reales
            r'XXXXXXXXXX': 'XXXXXXXXXX',  # Cédulas/documentos
            
            # Direcciones específicas
            'Demo City, Demo State': 'Demo City, Demo State',
            
            # Keys y tokens (si aparecen en código)
            r'demo-jwt-token': 'demo-jwt-token',
        }
    
    def clean_and_copy(self):
        """Copia proyecto limpiando información sensible"""
        
        # Crear directorio portfolio
        if self.portfolio_dir.exists():
            shutil.rmtree(self.portfolio_dir)
        self.portfolio_dir.mkdir(parents=True)
        
        # Copiar estructura manteniendo organización
        for item in self.source_dir.rglob('*'):
            if self.should_exclude(item):
                continue
                
            relative_path = item.relative_to(self.source_dir)
            dest_path = self.portfolio_dir / relative_path
            
            if item.is_dir():
                dest_path.mkdir(parents=True, exist_ok=True)
            else:
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                self.copy_and_clean_file(item, dest_path)
    
    def should_exclude(self, path):
        """Determina si un archivo debe ser excluido"""
        name = path.name
        return any(
            exclude in str(path) or 
            (exclude.startswith('*') and name.endswith(exclude[1:]))
            for exclude in self.exclude_files
        )
    
    def copy_and_clean_file(self, source, dest):
        """Copia archivo reemplazando contenido sensible"""
        try:
            with open(source, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Aplicar reemplazos
            for pattern, replacement in self.sensitive_replacements.items():
                if pattern.startswith('r\''):  # Regex pattern
                    content = re.sub(pattern[2:-1], replacement, content)
                else:  # String literal
                    content = content.replace(pattern, replacement)
            
            with open(dest, 'w', encoding='utf-8') as f:
                f.write(content)
                
        except UnicodeDecodeError:
            # Para archivos binarios, copiar directamente
            shutil.copy2(source, dest)
    
    def create_demo_env(self):
        """Crea archivo .env.example para portfolio"""
        env_example = """# Environment Variables for Demo

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Development Configuration
NODE_ENV=development
REACT_APP_APP_NAME=Demo Inventory System
REACT_APP_VERSION=1.0.0

# Optional: Analytics
REACT_APP_ANALYTICS_ID=your-analytics-id

# Demo Data Configuration
REACT_APP_DEMO_MODE=true
REACT_APP_DEMO_USER=demo@company.com
"""
        
        with open(self.portfolio_dir / '.env.example', 'w', encoding='utf-8') as f:
            f.write(env_example)

# Uso del script
if __name__ == "__main__":
    preparator = PortfolioPreparator(
        source_dir="C:/Project/IMO",
        portfolio_dir="C:/Project/IMO-Portfolio"
    )
    
    print("Preparando versión portfolio...")
    preparator.clean_and_copy()
    preparator.create_demo_env()
    print("✓ Portfolio creado exitosamente en: C:/Project/IMO-Portfolio")
    print("✅ Portfolio preparado en: C:/Project/IMO-Portfolio")