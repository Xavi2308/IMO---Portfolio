#!/bin/bash
# Script para reemplazar useCompany por useAuth en todos los componentes

echo "🔧 Actualizando imports de useCompany a useAuth..."

# Lista de archivos que necesitan ser actualizados
files=(
  "src/components/AccountsStatsCard.jsx"
  "src/components/AdvancedCustomerAccountsManager.jsx"
  "src/components/CompanySetup.jsx"
  "src/components/CustomerAccountsManager.jsx"
  "src/components/DeliveryModule.jsx"
  "src/components/DispatchRemissionGenerator.jsx"
  "src/components/EnhancedSales.jsx"
  "src/components/Home.jsx"
  "src/components/Movements.jsx"
  "src/components/PaymentReceipts.jsx"
  "src/components/Production.jsx"
  "src/components/Reports.jsx"
  "src/components/Sales.jsx"
  "src/components/SalesHistoryManager.jsx"
  "src/components/StockView.jsx"
  "src/components/SubInventoryManagement.jsx"
  "src/components/UserManagement.jsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Actualizando $file..."
    
    # Reemplazar import
    sed -i "s/import { useCompany } from '..\/context\/CompanyContext'/import { useAuth } from '..\/contexts\/AuthContext'/g" "$file"
    sed -i "s/import { useCompany } from '..\/context\/CompanyContext.js'/import { useAuth } from '..\/contexts\/AuthContext'/g" "$file"
    
    # Reemplazar uso del hook
    sed -i "s/const { company } = useCompany();/const { company } = useAuth();/g" "$file"
    
    echo "✅ $file actualizado"
  else
    echo "⚠️ $file no encontrado"
  fi
done

echo "🎉 ¡Actualización completada!"