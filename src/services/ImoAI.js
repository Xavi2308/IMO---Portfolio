// Servicio de IA para asistente IMO - Basado en Manual Completo
import ImoManual from './ImoManual';

// Función simple para normalizar texto
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Función para buscar en el manual
function searchInManual(query) {
  const normalizedQuery = normalizeText(query);
  const manual = ImoManual.es;
  
  // Buscar coincidencia exacta primero
  for (const [key, content] of Object.entries(manual)) {
    if (normalizedQuery === normalizeText(key)) {
      return content;
    }
  }
  
  // Buscar coincidencias parciales
  for (const [key, content] of Object.entries(manual)) {
    if (normalizedQuery.includes(normalizeText(key)) || normalizeText(key).includes(normalizedQuery)) {
      return content;
    }
  }
  
  // Buscar por palabras clave en el contenido
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [key, content] of Object.entries(manual)) {
    let score = 0;
    const queryWords = normalizedQuery.split(' ');
    
    // Revisar título
    const titleWords = normalizeText(content.titulo).split(' ');
    for (const qWord of queryWords) {
      for (const tWord of titleWords) {
        if (qWord === tWord) score += 3;
        else if (qWord.includes(tWord) || tWord.includes(qWord)) score += 1;
      }
    }
    
    // Revisar pasos
    for (const paso of content.pasos) {
      const pasoWords = normalizeText(paso).split(' ');
      for (const qWord of queryWords) {
        for (const pWord of pasoWords) {
          if (qWord === pWord) score += 1;
        }
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = content;
    }
  }
  
  return bestScore > 2 ? bestMatch : null;
}

// Respuestas de cortesía
const courtesyResponses = {
  greetings: ["hola", "buenos dias", "buenas tardes", "buenas noches", "hey", "hi"],
  thanks: ["gracias", "muchas gracias", "excelente", "perfecto", "genial"],
  goodbye: ["adios", "hasta luego", "nos vemos", "bye", "chao"]
};

// CLASE COMPATIBLE con el código existente
class ImoAI {
  constructor() {
    this.conversationHistory = [];
    this.userContext = {};
    this.lastInteractionTime = Date.now();
  }

  async processQuery(userQuery) {
    try {
      const query = normalizeText(userQuery);
      
      // Manejo de saludos
      if (courtesyResponses.greetings.some(greeting => query.includes(greeting))) {
        return {
          response: "¡Hola! 👋 Soy tu asistente de IMO.\n\n¿En qué puedo ayudarte? Puedo guiarte paso a paso con cualquier función del sistema:\n\n• 📦 Crear productos e inventarios\n• 💰 Procesar ventas y devoluciones\n• 📊 Ver estadísticas y reportes\n• 👥 Crear usuarios\n• ⚙️ Configurar el sistema\n• 🔗 Conectar tienda online\n\n¡Pregúntame lo que necesites! 😊",
          type: "greeting",
          confidence: 1.0
        };
      }
      
      // Manejo de agradecimientos
      if (courtesyResponses.thanks.some(thanks => query.includes(thanks))) {
        return {
          response: "¡De nada! 😊 Me alegra poder ayudarte.\n\n¿Necesitas ayuda con algo más del sistema IMO?",
          type: "thanks",
          confidence: 1.0
        };
      }
      
      // Manejo de despedidas
      if (courtesyResponses.goodbye.some(bye => query.includes(bye))) {
        return {
          response: "¡Hasta luego! 👋 Aquí estaré cuando necesites ayuda con IMO. ¡Que tengas buen día! ✨",
          type: "goodbye",
          confidence: 1.0
        };
      }
      
      // Buscar en el manual
      const manualEntry = searchInManual(query);
      
      if (manualEntry) {
        const stepsText = manualEntry.pasos.map((paso, index) => `${paso}`).join('\n');
        
        let response = `## ${manualEntry.titulo}\n\n`;
        response += `${stepsText}\n\n`;
        response += `📍 **Ubicación**: ${manualEntry.ubicacion}`;
        
        if (manualEntry.notas) {
          response += `\n\n💡 **Nota importante**: ${manualEntry.notas}`;
        }
        
        return {
          response: response,
          type: "instruction",
          confidence: 0.9
        };
      }
      
      // Respuesta por defecto
      return {
        response: "🤔 No encontré información específica sobre tu consulta.\n\n**Te puedo ayudar con estas funciones:**\n\n📦 **Inventarios:**\n- Crear producto nuevo\n- Editar o eliminar productos\n- Buscar productos\n- Escanear códigos\n- Inventario físico\n\n💰 **Ventas:**\n- Hacer nueva venta\n- Procesar devoluciones\n- Crear clientes\n\n📊 **Reportes:**\n- Ver estadísticas (están en Home)\n- Generar reportes detallados\n\n👥 **Configuración:**\n- Crear usuarios nuevos\n- Configurar empresa\n- Cambiar tema\n\n🔗 **Integraciones:**\n- Conectar WooCommerce\n- Conectar tienda online\n\n💡 **Ejemplos de preguntas:**\n- \"¿Cómo creo un producto?\"\n- \"¿Dónde veo las estadísticas?\"\n- \"¿Cómo hago una venta?\"\n- \"¿Cómo creo un usuario?\"\n\n¡Pregúntame algo específico y te guiaré paso a paso! 😊",
        type: "fallback",
        confidence: 0.3
      };
      
    } catch (error) {
      console.error('Error en ImoAI:', error);
      return {
        response: "⚠️ Hubo un error. Por favor intenta de nuevo o contacta al administrador.",
        type: "error",
        confidence: 0.0
      };
    }
  }

  // Métodos adicionales para compatibilidad
  async generateResponse(query, lang = 'es', username = '') {
    // Agregar contexto de usuario
    this.setUserContext({ lang, username });
    const result = await this.processQuery(query);
    
    // Devolver solo el texto de la respuesta para compatibilidad
    return result.response || result.text || "Lo siento, no pude procesar tu consulta.";
  }

  generateProactiveQuestion(lang = 'es') {
    const proactiveMessages = {
      es: [
        "💡 ¿Sabías que puedes escanear códigos de barras para buscar productos más rápido?",
        "📊 ¿Te gustaría saber cómo ver las estadísticas de ventas de hoy?",
        "🚀 ¿Necesitas ayuda para crear un producto nuevo?",
        "💰 ¿Quieres que te muestre cómo procesar una venta rápida?",
        "👥 ¿Te ayudo a crear un usuario nuevo para el sistema?",
        "📦 ¿Sabías que puedes hacer inventario físico desde el sistema?",
        "🔗 ¿Te interesa conectar tu tienda online con IMO?",
        "⚡ ¿Alguna pregunta sobre el funcionamiento del sistema?"
      ],
      en: [
        "💡 Did you know you can scan barcodes to find products faster?",
        "📊 Would you like to know how to view today's sales statistics?",
        "🚀 Need help creating a new product?",
        "💰 Want me to show you how to process a quick sale?",
        "👥 Can I help you create a new user for the system?",
        "📦 Did you know you can do physical inventory from the system?",
        "🔗 Interested in connecting your online store with IMO?",
        "⚡ Any questions about how the system works?"
      ]
    };

    const messages = proactiveMessages[lang] || proactiveMessages['es'];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  setUserContext(context) {
    this.userContext = { ...this.userContext, ...context };
  }

  resetConversation() {
    this.conversationHistory = [];
    this.userContext = {};
  }
}

// Exportar la clase como default para compatibilidad
export default ImoAI;

// También exportar el servicio para uso opcional
export const ImoAIService = {
  async processQuery(userQuery) {
    const ai = new ImoAI();
    return await ai.processQuery(userQuery);
  }
};
