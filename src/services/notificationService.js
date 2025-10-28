import supabase from '../supabaseClient';

/**
 * Servicio para gestionar notificaciones push
 */
class NotificationService {
  constructor() {
    this.subscriptions = new Map();
  }

  /**
   * Crear una nueva notificación
   * @param {Object} notification - Datos de la notificación
   * @param {string} notification.user_id - ID del usuario destinatario
   * @param {string} notification.message - Mensaje de la notificación
   * @param {string} notification.type - Tipo de notificación
   * @param {Object} notification.data - Datos adicionales (opcional)
   * @returns {Promise<Object>} - Respuesta de la inserción
   */
  async createNotification(notification) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.user_id,
          message: notification.message,
          type: notification.type || 'info',
          sale_id: notification.sale_id || null,
          order_id: notification.order_id || null,
          created_at: new Date().toISOString(),
          read: false,
          data: notification.data || null
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error };
    }
  }

  /**
   * Crear notificación para múltiples usuarios
   * @param {string[]} userIds - Array de IDs de usuarios
   * @param {string} message - Mensaje de la notificación
   * @param {string} type - Tipo de notificación
   * @param {Object} data - Datos adicionales (opcional)
   * @returns {Promise<Object>} - Respuesta de la inserción
   */
  async createBulkNotifications(userIds, message, type = 'info', data = {}) {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        message,
        type,
        sale_id: data.sale_id || null,
        order_id: data.order_id || null,
        created_at: new Date().toISOString(),
        read: false,
        data: data.additionalData || null
      }));

      const { data: insertedData, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) throw error;
      return { success: true, data: insertedData };
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      return { success: false, error };
    }
  }

  /**
   * Notificar a todos los usuarios con roles específicos
   * @param {string[]} roles - Array de roles a notificar
   * @param {string} message - Mensaje de la notificación
   * @param {string} type - Tipo de notificación
   * @param {Object} data - Datos adicionales (opcional)
   * @returns {Promise<Object>} - Respuesta de la operación
   */
  async notifyByRoles(roles, message, type = 'info', data = {}) {
    try {
      // Obtener usuarios con los roles especificados
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .in('role', roles);

      if (usersError) throw usersError;

      const userIds = users.map(user => user.id);
      return await this.createBulkNotifications(userIds, message, type, data);
    } catch (error) {
      console.error('Error notifying by roles:', error);
      return { success: false, error };
    }
  }

  /**
   * Crear notificación de venta pendiente
   * @param {string} saleId - ID de la venta
   * @param {string} customerName - Nombre del cliente
   * @param {string} createdBy - ID del usuario que creó la venta
   * @returns {Promise<Object>} - Respuesta de la operación
   */
  async createSalePendingNotification(saleId, customerName, createdBy) {
    try {
      // Obtener información del usuario creador
      const { data: creator, error: creatorError } = await supabase
        .from('users')
        .select('username')
        .eq('id', createdBy)
        .single();

      if (creatorError) throw creatorError;

      const message = `🔔 Nueva venta pendiente de ${customerName} creada por ${creator.username}`;
      
      return await this.notifyByRoles(
        ['admin', 'produccion'],
        message,
        'sale_pending',
        { sale_id: saleId }
      );
    } catch (error) {
      console.error('Error creating sale pending notification:', error);
      return { success: false, error };
    }
  }

  /**
   * Crear notificación de pedido nuevo
   * @param {string} orderId - ID del pedido
   * @param {string} supplierName - Nombre del proveedor
   * @param {string} createdBy - ID del usuario que creó el pedido
   * @returns {Promise<Object>} - Respuesta de la operación
   */
  async createOrderNotification(orderId, supplierName, createdBy) {
    try {
      // Obtener información del usuario creador
      const { data: creator, error: creatorError } = await supabase
        .from('users')
        .select('username')
        .eq('id', createdBy)
        .single();

      if (creatorError) throw creatorError;

      const message = `📦 Nuevo pedido a ${supplierName} creado por ${creator.username}`;
      
      return await this.notifyByRoles(
        ['admin', 'produccion'],
        message,
        'order_created',
        { order_id: orderId }
      );
    } catch (error) {
      console.error('Error creating order notification:', error);
      return { success: false, error };
    }
  }

  /**
   * Reproducir sonido de notificación
   */
  playNotificationSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }

  /**
   * Limpiar suscripciones
   */
  cleanup() {
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
  }
}

// Crear instancia singleton
const notificationService = new NotificationService();

export default notificationService;
