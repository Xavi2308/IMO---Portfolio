const express = require('express');
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const cron = require('node-cron');

class WooCommerceSyncService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.activeJobs = new Map(); // Para rastrear trabajos activos por empresa
    this.init();
  }

  async init() {
    console.log('🚀 WooCommerce Sync Service iniciado');
    
    // Iniciar trabajos para todas las empresas con integraciones activas
    await this.startAllCompanySyncJobs();
    
    // Revisar cada 5 minutos si hay nuevas integraciones
    cron.schedule('*/5 * * * *', async () => {
      await this.checkForNewIntegrations();
    });
  }

  // Obtener configuración de mapeo para una empresa
  async getMappingConfig(companyId) {
    const { data: company, error } = await this.supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (error || !company) {
      console.warn(`No se pudo obtener configuración para empresa ${companyId}`);
      return this.getDefaultMappingConfig();
    }

    const settings = company.settings || {};
    return {
      // Método de mapeo: 'sku', 'name', 'custom_id'
      mappingMethod: settings.woocommerce_mapping_method || 'sku',
      
      // Campo personalizado si usa custom_id
      customField: settings.woocommerce_custom_field || 'meta._custom_id',
      
      // Configuración de sincronización
      syncInterval: settings.woocommerce_sync_interval || 15, // minutos
      syncDirection: settings.woocommerce_sync_direction || 'both', // 'imo_to_woo', 'woo_to_imo', 'both'
      
      // Productos a sincronizar
      syncAllProducts: settings.woocommerce_sync_all !== false,
      productCategories: settings.woocommerce_categories || [],
      
      // Configuración de stock
      stockThreshold: settings.woocommerce_stock_threshold || 0,
      outOfStockStatus: settings.woocommerce_out_of_stock_status || 'outofstock',
      
      // Precios
      syncPrices: settings.woocommerce_sync_prices !== false,
      priceMultiplier: settings.woocommerce_price_multiplier || 1,
      
      // Crear productos automáticamente
      autoCreateProducts: settings.woocommerce_auto_create !== false
    };
  }

  getDefaultMappingConfig() {
    return {
      mappingMethod: 'sku',
      customField: 'meta._custom_id',
      syncInterval: 15,
      syncDirection: 'both',
      syncAllProducts: true,
      productCategories: [],
      stockThreshold: 0,
      outOfStockStatus: 'outofstock',
      syncPrices: true,
      priceMultiplier: 1,
      autoCreateProducts: true
    };
  }

  // Crear cliente WooCommerce para una empresa
  async createWooClient(companyId) {
    const { data: integration, error } = await this.supabase
      .from('web_integrations')
      .select('config, enabled, status')
      .eq('company_id', companyId)
      .eq('platform', 'wordpress')
      .eq('enabled', true)
      .single();

    if (error || !integration || integration.status !== 'connected') {
      throw new Error(`No hay integración WooCommerce activa para empresa ${companyId}`);
    }

    const config = JSON.parse(integration.config);
    
    return new WooCommerceRestApi({
      url: config.url,
      consumerKey: config.consumerKey,
      consumerSecret: config.consumerSecret,
      version: 'wc/v3',
      queryStringAuth: true
    });
  }

  // Iniciar trabajos de sincronización para todas las empresas
  async startAllCompanySyncJobs() {
    const { data: integrations, error } = await this.supabase
      .from('web_integrations')
      .select('company_id, config')
      .eq('platform', 'wordpress')
      .eq('enabled', true)
      .eq('status', 'connected');

    if (error) {
      console.error('Error obteniendo integraciones:', error);
      return;
    }

    for (const integration of integrations) {
      await this.startCompanySyncJob(integration.company_id);
    }
  }

  // Iniciar trabajo de sincronización para una empresa específica
  async startCompanySyncJob(companyId) {
    if (this.activeJobs.has(companyId)) {
      console.log(`⚠️ Trabajo ya activo para empresa ${companyId}`);
      return;
    }

    try {
      const config = await this.getMappingConfig(companyId);
      
      console.log(`🔄 Iniciando sync job para empresa ${companyId} cada ${config.syncInterval} minutos`);
      
      // Crear trabajo cron
      const cronPattern = `*/${config.syncInterval} * * * *`;
      const job = cron.schedule(cronPattern, async () => {
        await this.syncCompany(companyId);
      }, {
        scheduled: true,
        timezone: 'America/Bogota'
      });

      this.activeJobs.set(companyId, job);
      
      // Ejecutar una sincronización inmediata
      setTimeout(() => this.syncCompany(companyId), 5000);
      
    } catch (error) {
      console.error(`Error iniciando sync job para empresa ${companyId}:`, error);
    }
  }

  // Sincronizar una empresa específica
  async syncCompany(companyId) {
    const startTime = Date.now();
    console.log(`🔄 Iniciando sincronización para empresa ${companyId}`);
    
    try {
      const wooClient = await this.createWooClient(companyId);
      const config = await this.getMappingConfig(companyId);
      
      const results = {
        company_id: companyId,
        started_at: new Date(),
        products_processed: 0,
        products_updated: 0,
        products_created: 0,
        errors: []
      };

      // Obtener productos de IMO
      const imoProducts = await this.getIMOProducts(companyId, config);
      console.log(`📦 Encontrados ${imoProducts.length} productos en IMO`);

      for (const imoProduct of imoProducts) {
        try {
          await this.syncProduct(wooClient, imoProduct, config, results);
          results.products_processed++;
        } catch (error) {
          console.error(`Error sincronizando producto ${imoProduct.id}:`, error);
          results.errors.push({
            product_id: imoProduct.id,
            error: error.message
          });
        }
      }

      // Guardar log de sincronización
      await this.saveSyncLog(results);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Sincronización completada para empresa ${companyId} en ${duration}ms`);
      console.log(`📊 Procesados: ${results.products_processed}, Actualizados: ${results.products_updated}, Creados: ${results.products_created}, Errores: ${results.errors.length}`);

    } catch (error) {
      console.error(`❌ Error en sincronización para empresa ${companyId}:`, error);
      await this.saveSyncLog({
        company_id: companyId,
        started_at: new Date(),
        products_processed: 0,
        products_updated: 0,
        products_created: 0,
        errors: [{ error: error.message }]
      });
    }
  }

  // Obtener productos de IMO para sincronizar
  async getIMOProducts(companyId, config) {
    let query = this.supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId);

    // Filtrar por categorías si está configurado
    if (!config.syncAllProducts && config.productCategories.length > 0) {
      query = query.in('category', config.productCategories);
    }

    const { data: products, error } = await query;

    if (error) {
      throw new Error(`Error obteniendo productos IMO: ${error.message}`);
    }

    return products || [];
  }

  // Sincronizar un producto específico
  async syncProduct(wooClient, imoProduct, config, results) {
    // Buscar producto en WooCommerce según método de mapeo
    const wooProduct = await this.findWooProduct(wooClient, imoProduct, config);
    
    if (wooProduct) {
      // Actualizar producto existente
      await this.updateWooProduct(wooClient, wooProduct, imoProduct, config);
      results.products_updated++;
    } else if (config.autoCreateProducts) {
      // Crear nuevo producto
      await this.createWooProduct(wooClient, imoProduct, config);
      results.products_created++;
    }
  }

  // Buscar producto en WooCommerce
  async findWooProduct(wooClient, imoProduct, config) {
    let searchParams = {};
    
    switch (config.mappingMethod) {
      case 'sku':
        if (!imoProduct.sku) return null;
        searchParams.sku = imoProduct.sku;
        break;
        
      case 'name':
        searchParams.search = imoProduct.name;
        break;
        
      case 'custom_id':
        // Para campos personalizados, necesitamos usar meta_query
        searchParams.meta_key = config.customField.replace('meta.', '');
        searchParams.meta_value = imoProduct.id;
        break;
        
      default:
        searchParams.sku = imoProduct.sku;
    }

    try {
      const response = await wooClient.get('products', searchParams);
      const products = response.data;
      
      if (config.mappingMethod === 'name') {
        // Para búsqueda por nombre, buscar coincidencia exacta
        return products.find(p => p.name.toLowerCase().trim() === imoProduct.name.toLowerCase().trim());
      }
      
      return products.length > 0 ? products[0] : null;
    } catch (error) {
      console.warn(`Error buscando producto en WooCommerce:`, error.message);
      return null;
    }
  }

  // Actualizar producto en WooCommerce
  async updateWooProduct(wooClient, wooProduct, imoProduct, config) {
    const updateData = {};
    
    // Actualizar stock
    const totalStock = this.calculateTotalStock(imoProduct);
    updateData.stock_quantity = totalStock;
    updateData.manage_stock = true;
    updateData.stock_status = totalStock > config.stockThreshold ? 'instock' : config.outOfStockStatus;
    
    // Actualizar precios si está habilitado
    if (config.syncPrices && imoProduct.price) {
      const price = (parseFloat(imoProduct.price) * config.priceMultiplier).toString();
      updateData.regular_price = price;
      updateData.price = price;
    }
    
    // Actualizar descripción si ha cambiado
    if (imoProduct.description && wooProduct.description !== imoProduct.description) {
      updateData.description = imoProduct.description;
    }

    // Solo actualizar si hay cambios
    if (Object.keys(updateData).length === 0) return;

    await wooClient.put(`products/${wooProduct.id}`, updateData);
    console.log(`📝 Actualizado producto WooCommerce ${wooProduct.id} (${wooProduct.name})`);
  }

  // Crear producto en WooCommerce
  async createWooProduct(wooClient, imoProduct, config) {
    const totalStock = this.calculateTotalStock(imoProduct);
    const price = imoProduct.price ? (parseFloat(imoProduct.price) * config.priceMultiplier).toString() : '0';
    
    const productData = {
      name: imoProduct.name,
      type: 'simple',
      regular_price: price,
      price: price,
      description: imoProduct.description || '',
      short_description: imoProduct.short_description || '',
      sku: imoProduct.sku || '',
      stock_quantity: totalStock,
      manage_stock: true,
      stock_status: totalStock > config.stockThreshold ? 'instock' : config.outOfStockStatus,
      status: 'publish'
    };

    // Agregar campo personalizado si se usa
    if (config.mappingMethod === 'custom_id') {
      productData.meta_data = [
        {
          key: config.customField.replace('meta.', ''),
          value: imoProduct.id
        }
      ];
    }

    const response = await wooClient.post('products', productData);
    console.log(`✨ Creado nuevo producto WooCommerce ${response.data.id} (${imoProduct.name})`);
    
    return response.data;
  }

  // Calcular stock total (suma de todas las tallas)
  calculateTotalStock(imoProduct) {
    if (!imoProduct.stock || typeof imoProduct.stock !== 'object') {
      return 0;
    }
    
    return Object.values(imoProduct.stock).reduce((total, sizeStock) => {
      return total + (parseInt(sizeStock) || 0);
    }, 0);
  }

  // Guardar log de sincronización
  async saveSyncLog(results) {
    const { error } = await this.supabase
      .from('sync_logs')
      .insert({
        company_id: results.company_id,
        platform: 'woocommerce',
        started_at: results.started_at,
        completed_at: new Date(),
        products_processed: results.products_processed,
        products_updated: results.products_updated,
        products_created: results.products_created,
        errors: results.errors,
        status: results.errors.length === 0 ? 'success' : 'partial_success'
      });

    if (error) {
      console.error('Error guardando log de sincronización:', error);
    }
  }

  // Verificar nuevas integraciones
  async checkForNewIntegrations() {
    const { data: integrations, error } = await this.supabase
      .from('web_integrations')
      .select('company_id')
      .eq('platform', 'wordpress')
      .eq('enabled', true)
      .eq('status', 'connected');

    if (error) return;

    for (const integration of integrations) {
      if (!this.activeJobs.has(integration.company_id)) {
        console.log(`🔍 Nueva integración detectada para empresa ${integration.company_id}`);
        await this.startCompanySyncJob(integration.company_id);
      }
    }
  }

  // Detener trabajo de sincronización
  stopCompanySyncJob(companyId) {
    if (this.activeJobs.has(companyId)) {
      this.activeJobs.get(companyId).stop();
      this.activeJobs.delete(companyId);
      console.log(`⏹️ Detenido sync job para empresa ${companyId}`);
    }
  }

  // Obtener estadísticas de sincronización
  async getSyncStats(companyId) {
    const { data: logs, error } = await this.supabase
      .from('sync_logs')
      .select('*')
      .eq('company_id', companyId)
      .eq('platform', 'woocommerce')
      .order('started_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }

    return logs || [];
  }
}

module.exports = { WooCommerceSyncService };
