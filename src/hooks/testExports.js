// Test de exports
import { 
  getStockViewData, 
  getSubInventoryData, 
  getSubInventoryStats,
  getHomeDashboardData,
  getSalesData,
  getProductionData,
  getProductLines,
  getAvailableLines
} from './optimizedQueries';

console.log('Todas las funciones importadas correctamente:', {
  getStockViewData: typeof getStockViewData,
  getSubInventoryData: typeof getSubInventoryData,
  getSubInventoryStats: typeof getSubInventoryStats,
  getHomeDashboardData: typeof getHomeDashboardData,
  getSalesData: typeof getSalesData,
  getProductionData: typeof getProductionData,
  getProductLines: typeof getProductLines,
  getAvailableLines: typeof getAvailableLines
});
