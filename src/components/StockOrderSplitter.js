/**
 * @file StockOrderSplitter.js
 * @description Clase que encapsula la lógica para dividir órdenes agrupadas de Stock en órdenes independientes.
 *              Proporciona métodos para dividir todos los ítems de una orden, aceptar un ítem individual
 *              o eliminar un ítem específico, manteniendo la integridad de los datos en la base de datos
 *              mediante operaciones con Supabase.
 */

/**
 * @class StockOrderSplitter
 * @description Clase para gestionar la división de órdenes agrupadas de Stock en órdenes independientes.
 *              Utiliza Supabase como backend para realizar operaciones de inserción, actualización y eliminación.
 */
export default class StockOrderSplitter {

  /**
   * @constructor
   * @description Inicializa una instancia de StockOrderSplitter con un cliente de Supabase.
   * @param {Object} supabase - Cliente de Supabase para interactuar con la base de datos.
   */
  // Constructor que inicializa la clase con un cliente de Supabase
  constructor(supabase) {
    // Asigna el cliente de Supabase a una propiedad de la clase
    this.supabase = supabase;
  }

  /**
   * @async
   * @function splitAndAccept
   * @description Divide una orden agrupada de Stock en una orden independiente por cada ítem,
   *              cada una en estado 'in_process', y elimina la orden original.
   * @param {Object} order - La orden agrupada que contiene múltiples ítems.
   * @param {Object} user - El usuario que realiza la acción (no utilizado en la lógica actual).
   * @returns {Array} - Lista de ítems procesados con éxito.
   * @throws {Error} - Si la orden es inválida o ocurre un error en la base de datos.
   */
  // Método para dividir y aceptar todos los ítems de una orden
  async splitAndAccept(order, user) {
    // --- VALIDACIÓN INICIAL ---
    // Verifica que la orden exista y que sus ítems sean un arreglo
    if (!order || !Array.isArray(order.items)) throw new Error('Invalid order');

    // --- INICIALIZACIÓN DE RESULTADOS ---
    // Crea un arreglo para almacenar los ítems procesados
    const results = [];

    // --- PROCESAMIENTO DE ÍTEMS ---
    // Itera sobre cada ítem de la orden
    for (const item of order.items) {
      // Inserta una nueva orden en la base de datos con un solo ítem
      const { error } = await this.supabase.from('orders').insert({
        // Establece el nombre del cliente como 'Stock'
        client_name: 'Stock',
        // Define el ID de usuario como nulo (no se utiliza en esta lógica)
        user_id: null,
        // Establece el estado de la nueva orden como 'in_process'
        status: 'in_process',
        // Incluye solo el ítem actual en la nueva orden
        items: [item],
        // Conserva la fecha de creación de la orden original
        created_at: order.created_at,
        // Registra la fecha actual como fecha de aceptación
        accepted_at: new Date().toISOString(),
        // Registra la fecha actual como fecha de actualización
        updated_at: new Date().toISOString(),
        // Conserva la fecha límite de la orden original
        deadline: order.deadline,
        // Conserva las observaciones de la orden original
        observations: order.observations,
      });

      // --- MANEJO DE ERRORES ---
      // Lanza el error si la inserción falla
      if (error) throw error;
      // Agrega el ítem procesado al arreglo de resultados
      results.push(item);
    }

    // --- ELIMINACIÓN DE LA ORDEN ORIGINAL ---
    // Elimina la orden agrupada original de la base de datos
    await this.supabase.from('orders').delete().eq('id', order.id);

    // --- RETORNO DE RESULTADOS ---
    // Devuelve el arreglo de ítems procesados
    return results;
  }

  /**
   * @async
   * @function splitAndAcceptOne
   * @description Divide un ítem específico de una orden agrupada de Stock, lo mueve a una nueva orden
   *              en estado 'in_process', y actualiza o elimina la orden original según corresponda.
   * @param {Object} order - La orden agrupada que contiene múltiples ítems.
   * @param {Object} itemToAccept - El ítem específico a extraer y aceptar.
   * @returns {boolean} - Verdadero si la operación se completa con éxito.
   * @throws {Error} - Si la orden es inválida o ocurre un error en la base de datos.
   */
  // Método para dividir y aceptar un ítem específico de una orden
  async splitAndAcceptOne(order, itemToAccept) {
    // --- VALIDACIÓN INICIAL ---
    // Verifica que la orden exista y que sus ítems sean un arreglo
    if (!order || !Array.isArray(order.items)) throw new Error('Invalid order');

    // --- CREACIÓN DE NUEVA ORDEN ---
    // Inserta una nueva orden en la base de datos para el ítem aceptado
    const { error: insertError } = await this.supabase.from('orders').insert({
      // Establece el nombre del cliente como 'Stock'
      client_name: 'Stock',
      // Define el ID de usuario como nulo (no se utiliza en esta lógica)
      user_id: null,
      // Establece el estado de la nueva orden como 'in_process'
      status: 'in_process',
      // Incluye solo el ítem aceptado en la nueva orden
      items: [itemToAccept],
      // Conserva la fecha de creación de la orden original
      created_at: order.created_at,
      // Registra la fecha actual como fecha de aceptación
      accepted_at: new Date().toISOString(),
      // Registra la fecha actual como fecha de actualización
      updated_at: new Date().toISOString(),
      // Conserva la fecha límite de la orden original
      deadline: order.deadline,
      // Conserva las observaciones de la orden original
      observations: order.observations,
    });

    // --- MANEJO DE ERRORES ---
    // Lanza el error si la inserción falla
    if (insertError) throw insertError;

    // --- FILTRADO DE ÍTEMS RESTANTES ---
    // Filtra los ítems de la orden original, excluyendo el ítem aceptado
    const remainingItems = order.items.filter(
      // Compara múltiples propiedades para identificar el ítem único
      i => !(i.reference === itemToAccept.reference && 
             i.color === itemToAccept.color && 
             JSON.stringify(i.sizes) === JSON.stringify(itemToAccept.sizes) && 
             (i.observation || '') === (itemToAccept.observation || ''))
      
    );

    // --- ACTUALIZACIÓN O ELIMINACIÓN DE LA ORDEN ORIGINAL ---
    // Verifica si quedan ítems en la orden original
    if (remainingItems.length > 0) {
      // Actualiza la orden original con los ítems restantes
      await this.supabase.from('orders').update({ 
        // Asigna los ítems restantes a la orden
        items: remainingItems, 
        // Actualiza la fecha de modificación
        updated_at: new Date().toISOString() 
      }).eq('id', order.id);
    } else {
      // Elimina la orden original si no quedan ítems
      await this.supabase.from('orders').delete().eq('id', order.id);
    }

    // --- RETORNO DE RESULTADOS ---
    // Devuelve verdadero para confirmar el éxito
    return true;
  }

  /**
   * @async
   * @function deleteOne
   * @description Elimina un ítem específico de una orden agrupada de Stock, actualizando la orden original
   *              con los ítems restantes o eliminándola si no quedan ítems.
   * @param {Object} order - La orden agrupada que contiene múltiples ítems.
   * @param {Object} itemToDelete - El ítem específico a eliminar.
   * @returns {boolean} - True si la eliminación se realiza correctamente.
   * @throws {Error} - Si la orden es inválida o ocurre un error en la base de datos.
   */
  // Método para eliminar un ítem específico de una orden
  async deleteOne(order, itemToDelete) {
    // --- VALIDACIÓN INICIAL ---
    // Verifica que la orden exista y que sus ítems sean un arreglo
    if (!order || !Array.isArray(order.items)) throw new Error('Invalid order');

    // --- FILTRADO DE ÍTEMS RESTANTES ---
    // Filtra los ítems de la orden original, excluyendo el ítem a eliminar
    const remainingItems = order.items.filter(
      // Compara múltiples propiedades para identificar el ítem único
      i => !(i.reference === itemToDelete.reference && 
             i.color === itemToDelete.color && 
             JSON.stringify(i.sizes) === JSON.stringify(itemToDelete.sizes) && 
             (i.observation || '') === (itemToDelete.observation || ''))
      
    );

    // --- ACTUALIZACIÓN O ELIMINACIÓN DE LA ORDEN ORIGINAL ---
    // Verifica si quedan ítems en la orden original
    if (remainingItems.length > 0) {
      // Actualiza la orden original con los ítems restantes
      await this.supabase.from('orders').update({ 
        // Asigna los ítems restantes a la orden
        items: remainingItems, 
        // Actualiza la fecha de modificación
        updated_at: new Date().toISOString() 
      }).eq('id', order.id);
    } else {
      // Elimina la orden original si no quedan ítems
      await this.supabase.from('orders').delete().eq('id', order.id);
    }

    // --- RETORNO DE RESULTADOS ---
    // Devuelve true para confirmar el éxito
    return true;
  }
}
