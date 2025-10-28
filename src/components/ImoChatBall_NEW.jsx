import React, { useState, useContext, useEffect, useRef } from 'react';
import LanguageContext from '../context/LanguageContext';
import ImoSPEAK from '../logo/ImoSPEAK.png';

const languages = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
];

const greetings = {
  es: [
    () => `¡Hola, soy IMO! 🤖 Ahora soy inteligente y puedo ayudarte con todo lo relacionado al software. ¿En qué puedo asistirte?`,
    () => {
      const h = new Date().getHours();
      if (h < 12) return '¡Buenos días! 🌅 IMO IA está listo para resolver todas tus dudas.';
      if (h < 19) return '¡Buenas tardes! ☀️ IMO IA está aquí para ayudarte.';
      return '¡Buenas noches! 🌙 IMO IA está disponible para asistirte.';
    },
    () => '¡Bienvenido! 🚀 Pregúntame cualquier cosa sobre inventarios, ventas, integraciones o el software en general.'
  ],
  en: [
    () => `Hi, I'm IMO! 🤖 I'm now AI-powered and can help you with everything related to the software. How can I assist you?`,
    () => {
      const h = new Date().getHours();
      if (h < 12) return 'Good morning! 🌅 IMO AI is ready to solve all your questions.';
      if (h < 19) return 'Good afternoon! ☀️ IMO AI is here to help you.';
      return 'Good evening! 🌙 IMO AI is available to assist you.';
    },
    () => 'Welcome! 🚀 Ask me anything about inventory, sales, integrations or the software in general.'
  ],
  fr: [
    () => `Bonjour, je suis IMO ! 🤖 Je suis maintenant alimenté par l'IA et je peux vous aider avec tout ce qui concerne le logiciel. Comment puis-je vous aider ?`,
    () => {
      const h = new Date().getHours();
      if (h < 12) return 'Bonjour ! 🌅 IMO IA est prêt à résoudre toutes vos questions.';
      if (h < 19) return 'Bon après-midi ! ☀️ IMO IA est là pour vous aider.';
      return 'Bonsoir ! 🌙 IMO IA est disponible pour vous assister.';
    },
    () => 'Bienvenue ! 🚀 Posez-moi toutes vos questions sur l\'inventaire, les ventes, les intégrations ou le logiciel en général.'
  ],
  de: [
    () => `Hallo, ich bin IMO! 🤖 Ich bin jetzt KI-gestützt und kann Ihnen bei allem helfen, was mit der Software zu tun hat. Wie kann ich Ihnen helfen?`,
    () => {
      const h = new Date().getHours();
      if (h < 12) return 'Guten Morgen! 🌅 IMO KI ist bereit, alle Ihre Fragen zu lösen.';
      if (h < 19) return 'Guten Tag! ☀️ IMO KI ist hier, um Ihnen zu helfen.';
      return 'Guten Abend! 🌙 IMO KI steht Ihnen zur Verfügung.';
    },
    () => 'Willkommen! 🚀 Fragen Sie mich alles über Inventar, Verkäufe, Integrationen oder die Software im Allgemeinen.'
  ],
  pt: [
    () => `Olá, sou o IMO! 🤖 Agora sou alimentado por IA e posso ajudá-lo com tudo relacionado ao software. Como posso ajudá-lo?`,
    () => {
      const h = new Date().getHours();
      if (h < 12) return 'Bom dia! 🌅 IMO IA está pronto para resolver todas as suas dúvidas.';
      if (h < 19) return 'Boa tarde! ☀️ IMO IA está aqui para ajudá-lo.';
      return 'Boa noite! 🌙 IMO IA está disponível para assisti-lo.';
    },
    () => 'Bem-vindo! 🚀 Pergunte-me qualquer coisa sobre inventário, vendas, integrações ou o software em geral.'
  ],
  it: [
    () => `Ciao, sono IMO! 🤖 Ora sono alimentato dall'IA e posso aiutarti con tutto ciò che riguarda il software. Come posso aiutarti?`,
    () => {
      const h = new Date().getHours();
      if (h < 12) return 'Buongiorno! 🌅 IMO IA è pronto a risolvere tutte le tue domande.';
      if (h < 19) return 'Buon pomeriggio! ☀️ IMO IA è qui per aiutarti.';
      return 'Buonasera! 🌙 IMO IA è disponibile per assisterti.';
    },
    () => 'Benvenuto! 🚀 Chiedimi qualsiasi cosa su inventario, vendite, integrazioni o il software in generale.'
  ]
};

const ImoChatBall = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { language } = useContext(LanguageContext);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Obtener saludo aleatorio para el idioma actual
  const getRandomGreeting = () => {
    const langGreetings = greetings[language] || greetings.es;
    const randomGreeting = langGreetings[Math.floor(Math.random() * langGreetings.length)];
    return randomGreeting();
  };

  // Inicializar chat con saludo
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        text: getRandomGreeting(),
        isUser: false,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, language]);

  // Función para enviar mensaje a la IA
  const sendToAI = async (message) => {
    try {
      const response = await fetch('http://localhost:3001/api/chat/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          language: language
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error al conectar con IMO IA:', error);
      
      // Mensaje de fallback según idioma
      const fallbackMessages = {
        es: 'Disculpa, no puedo conectar con el servidor IA en este momento. Por favor, verifica que el servidor esté funcionando o intenta más tarde.',
        en: 'Sorry, I cannot connect to the AI server at the moment. Please check that the server is running or try again later.',
        fr: 'Désolé, je ne peux pas me connecter au serveur IA pour le moment. Veuillez vérifier que le serveur fonctionne ou réessayez plus tard.',
        de: 'Entschuldigung, ich kann derzeit nicht mit dem KI-Server verbinden. Bitte überprüfen Sie, ob der Server läuft, oder versuchen Sie es später erneut.',
        pt: 'Desculpe, não consigo conectar com o servidor IA no momento. Por favor, verifique se o servidor está funcionando ou tente novamente mais tarde.',
        it: 'Scusa, non riesco a connettermi al server IA al momento. Per favore verifica che il server sia in funzione o riprova più tardi.'
      };
      
      return fallbackMessages[language] || fallbackMessages.es;
    }
  };

  const handleSendMessage = async () => {
    if (currentMessage.trim() === '' || loading) return;

    const userMessage = {
      text: currentMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = currentMessage;
    setCurrentMessage('');
    setLoading(true);

    // Obtener respuesta de la IA
    const aiResponse = await sendToAI(messageToSend);

    const botMessage = {
      text: aiResponse,
      isUser: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMessage]);
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (text) => {
    // Convertir texto plano a JSX con formato básico
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat ball */}
      <div
        className={`w-16 h-16 rounded-full cursor-pointer transition-all duration-300 transform hover:scale-110 ${
          isOpen ? 'bg-blue-600' : 'bg-gradient-to-r from-blue-500 to-purple-600'
        } shadow-lg flex items-center justify-center`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <img src={ImoSPEAK} alt="IMO Chat" className="w-10 h-10 object-contain" />
      </div>

      {/* Chat window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-96 h-96 bg-white rounded-lg shadow-2xl flex flex-col border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src={ImoSPEAK} alt="IMO" className="w-8 h-8 object-contain" />
              <div>
                <h3 className="font-semibold text-sm">IMO IA Assistant</h3>
                <p className="text-xs opacity-90">🤖 Inteligencia Artificial</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 text-xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs p-3 rounded-lg text-sm ${
                    message.isUser
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <div>{formatMessage(message.text)}</div>
                  <div className={`text-xs mt-1 ${message.isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-lg rounded-bl-none p-3 text-sm">
                  <div className="flex items-center space-x-1">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-gray-500 ml-2">IMO IA está pensando...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Pregúntame cualquier cosa sobre el software..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={handleSendMessage}
                disabled={loading || currentMessage.trim() === ''}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                📤
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImoChatBall;
