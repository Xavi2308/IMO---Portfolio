const OpenAI = require('openai');

class IMOChatAI {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY no encontrada. El chat IA no funcionará.');
      this.openai = null;
      return;
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.systemPrompt = `Eres IMO, el asistente inteligente de un software de gestión de inventario y ventas.

PERSONALIDAD:
- Eres amigable, profesional y siempre útil
- Respondes en el idioma que te escriban
- Eres experto en inventarios, ventas, e-commerce y gestión de negocios
- Siempre tratas de dar respuestas prácticas y actionables

FUNCIONALIDADES DEL SOFTWARE IMO:
- Gestión de inventario (productos, stock, tallas)
- Registro de ventas y órdenes
- Integraciones con WooCommerce, Shopify, Magento
- Configuración de temas y colores
- Gestión de usuarios y roles
- Reportes de ventas
- Configuración de tallas sugeridas
- Sincronización automática

INSTRUCCIONES:
1. Si te preguntan sobre funcionalidades específicas del software, explica paso a paso
2. Si necesitan ayuda técnica, da instrucciones claras
3. Si preguntan sobre análisis de datos, sugiere cómo interpretar la información
4. Si es una consulta general de negocio, da consejos prácticos
5. Mantén las respuestas concisas pero completas
6. Si no tienes información específica, reconócelo y sugiere alternativas

Recuerda: Eres parte integral del software IMO y tu objetivo es hacer que los usuarios sean más exitosos en su negocio.`;
  }

  async getChatResponse(message, context = {}) {
    if (!this.openai) {
      return {
        success: false,
        message: 'El servicio de IA no está disponible. Verifica la configuración de OpenAI API key.',
        fallback: true
      };
    }

    try {
      // Construir contexto si está disponible
      let contextPrompt = '';
      if (context.user) {
        contextPrompt += `\nCONTEXTO DEL USUARIO:
- Rol: ${context.user.role}
- Empresa: ${context.user.company || 'No especificada'}`;
      }
      
      if (context.stats) {
        contextPrompt += `\nESTADÍSTICAS ACTUALES:
- Total de productos: ${context.stats.totalProducts || 0}
- Productos con stock bajo: ${context.stats.lowStock || 0}
- Ventas del mes: ${context.stats.monthlySales || 0}`;
      }

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: this.systemPrompt + contextPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return {
        success: true,
        message: completion.choices[0].message.content.trim(),
        fallback: false
      };

    } catch (error) {
      console.error('Error en OpenAI:', error);
      
      if (error.code === 'insufficient_quota') {
        return {
          success: false,
          message: 'El servicio de IA ha alcanzado su límite de uso. Por favor, contacta al administrador.',
          fallback: true
        };
      }
      
      return {
        success: false,
        message: 'Hubo un error procesando tu consulta. Inténtalo de nuevo en unos momentos.',
        fallback: true
      };
    }
  }

  // Método para generar contexto desde la base de datos
  async generateContext(userId, supabase) {
    if (!userId || !supabase) return {};

    try {
      // Obtener información del usuario
      const { data: user } = await supabase
        .from('users')
        .select('role, company_id')
        .eq('id', userId)
        .single();

      // Obtener estadísticas básicas
      const { data: products } = await supabase
        .from('products')
        .select('id, stock')
        .eq('company_id', user?.company_id);

      const { data: sales } = await supabase
        .from('sales')
        .select('total')
        .eq('company_id', user?.company_id)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      const totalProducts = products?.length || 0;
      const lowStock = products?.filter(p => (p.stock || 0) < 5).length || 0;
      const monthlySales = sales?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;

      return {
        user: {
          role: user?.role,
          company: user?.company_id
        },
        stats: {
          totalProducts,
          lowStock,
          monthlySales
        }
      };
    } catch (error) {
      console.error('Error generando contexto:', error);
      return {};
    }
  }
}

module.exports = { IMOChatAI };
