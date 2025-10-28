import React, { useState, useContext, useEffect } from 'react';
import LanguageContext from '../context/LanguageContext';
import ImoSPEAK from '../logo/ImoSPEAK.png';
import userManual from '../manual/userManual';

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
    () => `¡Hola, soy IMO! ¿Con qué te puedo ayudar hoy?`,
    () => {
      const h = new Date().getHours();
      if (h < 12) return '¡Buenos días! IMO está listo para asistirte.';
      if (h < 19) return '¡Buenas tardes! IMO está listo para asistirte.';
      return '¡Buenas noches! IMO está listo para asistirte.';
    },
    () => '¡Bienvenido! Pregúntame cualquier cosa sobre el software.'
  ],
  en: [
    () => `Hi, I'm IMO! How can I help you today?`,
    () => {
      const h = new Date().getHours();
      if (h < 12) return 'Good morning! IMO is ready to assist you.';
      if (h < 19) return 'Good afternoon! IMO is ready to assist you.';
      return 'Good evening! IMO is ready to assist you.';
    },
    () => 'Welcome! Ask me anything about the software.'
  ],
  fr: [
    () => `Bonjour, je suis IMO ! Comment puis-je vous aider aujourd'hui ?`,
    () => {
      const h = new Date().getHours();
      if (h < 12) return 'Bonjour ! IMO est prêt à vous aider.';
      if (h < 19) return 'Bon après-midi ! IMO est prêt à vous aider.';
      return 'Bonsoir ! IMO est prêt à vous aider.';
    },
    () => 'Bienvenue ! Posez-moi toutes vos questions sur le logiciel.'
  ],
  de: [
    () => `Hallo, ich bin IMO! Wie kann ich Ihnen heute helfen?`,
    () => {
      const h = new Date().getHours();
      if (h < 12) return 'Guten Morgen! IMO ist bereit, Ihnen zu helfen.';
      if (h < 19) return 'Guten Tag! IMO ist bereit, Ihnen zu helfen.';
      return 'Guten Abend! IMO ist bereit, Ihnen zu helfen.';
    },
    () => 'Willkommen! Fragen Sie mich alles über die Software.'
  ],
  pt: [
    () => `Olá, sou o IMO! Como posso te ajudar hoje?`,
    () => {
      const h = new Date().getHours();
      if (h < 12) return 'Bom dia! O IMO está pronto para te ajudar.';
      if (h < 19) return 'Boa tarde! O IMO está pronto para te ajudar.';
      return 'Boa noite! O IMO está pronto para te ajudar.';
    },
    () => 'Bem-vindo! Pergunte-me qualquer coisa sobre o software.'
  ],
  it: [
    () => `Ciao, sono IMO! Come posso aiutarti oggi?`,
    () => {
      const h = new Date().getHours();
      if (h < 12) return 'Buongiorno! IMO è pronto ad aiutarti.';
      if (h < 19) return 'Buon pomeriggio! IMO è pronto ad aiutarti.';
      return 'Buona sera! IMO è pronto ad aiutarti.';
    },
    () => 'Benvenuto! Chiedimi qualsiasi cosa sul software.'
  ],
};

const manual = {
  es: `Manual de Usuario IMO\n\n1. Gestión de Inventarios: Permite agregar, editar y eliminar productos, gestionar tallas, colores y líneas.\n2. Escaneo de Códigos: Usa el campo de escaneo para cargar o descargar inventario rápidamente.\n3. Filtros: Filtra productos por referencia, color, talla, línea o fecha de creación.\n4. Subida de Imágenes: Haz clic en la imagen de un producto para subir o cambiar la foto.\n5. Inventariado: Realiza inventarios escaneando productos y confirma los cambios antes de aplicarlos.\n6. Notificaciones: Recibe alertas sobre movimientos, ventas o cambios importantes.\n7. Gestión de Usuarios: Administra permisos y roles de los usuarios.\n8. Pedidos y Ventas: Visualiza, edita y gestiona pedidos y ventas.\n9. Configuración: Personaliza la aplicación según tus necesidades.\n\n¿Tienes dudas? ¡Pregúntame lo que quieras sobre el software!`,
  en: `IMO User Manual\n\n1. Inventory Management: Add, edit, and delete products, manage sizes, colors, and lines.\n2. Barcode Scanning: Use the scan field to quickly load or unload inventory.\n3. Filters: Filter products by reference, color, size, line, or creation date.\n4. Image Upload: Click a product image to upload or change the photo.\n5. Inventory: Perform inventory by scanning products and confirm changes before applying.\n6. Notifications: Receive alerts about movements, sales, or important changes.\n7. User Management: Manage user permissions and roles.\n8. Orders and Sales: View, edit, and manage orders and sales.\n9. Settings: Customize the app to your needs.\n\nQuestions? Ask me anything about the software!`,
  fr: `Manuel d'utilisation IMO\n\n1. Gestion des stocks : Ajoutez, modifiez et supprimez des produits, gérez les tailles, couleurs et lignes.\n2. Scan de codes-barres : Utilisez le champ de scan pour charger ou décharger rapidement le stock.\n3. Filtres : Filtrez les produits par référence, couleur, taille, ligne ou date de création.\n4. Téléchargement d'images : Cliquez sur l'image d'un produit pour la télécharger ou la modifier.\n5. Inventaire : Réalisez l'inventaire en scannant les produits et confirmez les modifications avant de les appliquer.\n6. Notifications : Recevez des alertes sur les mouvements, ventes ou changements importants.\n7. Gestion des utilisateurs : Gérez les autorisations et rôles des utilisateurs.\n8. Commandes et ventes : Visualisez, modifiez et gérez les commandes et ventes.\n9. Paramètres : Personnalisez l'application selon vos besoins.\n\nDes questions ? Demandez-moi tout sur le logiciel !`,
  de: `IMO Benutzerhandbuch\n\n1. Inventarverwaltung: Produkte hinzufügen, bearbeiten und löschen, Größen, Farben und Linien verwalten.\n2. Barcode-Scan: Verwenden Sie das Scan-Feld, um Inventar schnell zu laden oder zu entladen.\n3. Filter: Filtern Sie Produkte nach Referenz, Farbe, Größe, Linie oder Erstellungsdatum.\n4. Bild-Upload: Klicken Sie auf ein Produktbild, um das Foto hochzuladen oder zu ändern.\n5. Inventur: Führen Sie eine Inventur durch Scannen der Produkte durch und bestätigen Sie die Änderungen.\n6. Benachrichtigungen: Erhalten Sie Benachrichtigungen über Bewegungen, Verkäufe oder wichtige Änderungen.\n7. Benutzerverwaltung: Verwalten Sie Benutzerberechtigungen und -rollen.\n8. Bestellungen und Verkäufe: Anzeigen, bearbeiten und verwalten Sie Bestellungen und Verkäufe.\n9. Einstellungen: Passen Sie die App an Ihre Bedürfnisse an.\n\nFragen? Fragen Sie mich alles über die Software!`,
  pt: `Manual do Usuário IMO\n\n1. Gestão de Inventário: Adicione, edite e exclua produtos, gerencie tamanhos, cores e linhas.\n2. Leitura de Código de Barras: Use o campo de leitura para carregar ou descarregar inventário rapidamente.\n3. Filtros: Filtre produtos por referência, cor, tamanho, linha ou data de criação.\n4. Upload de Imagem: Clique na imagem de um produto para fazer upload ou alterar a foto.\n5. Inventário: Realize inventário escaneando produtos e confirme as alterações antes de aplicar.\n6. Notificações: Receba alertas sobre movimentos, vendas ou mudanças importantes.\n7. Gestão de Usuários: Gerencie permissões e funções dos usuários.\n8. Pedidos e Vendas: Visualize, edite e gerencie pedidos e vendas.\n9. Configurações: Personalize o aplicativo conforme suas necessidades.\n\nDúvidas? Pergunte-me qualquer coisa sobre o software!`,
  it: `Manuale Utente IMO\n\n1. Gestione Inventario: Aggiungi, modifica ed elimina prodotti, gestisci taglie, colori e linee.\n2. Scansione Codici a Barre: Usa il campo di scansione per caricare o scaricare rapidamente l'inventario.\n3. Filtri: Filtra i prodotti per riferimento, colore, taglia, linea o data di creazione.\n4. Caricamento Immagini: Clicca sull'immagine di un prodotto per caricare o cambiare la foto.\n5. Inventario: Esegui l'inventario scansionando i prodotti e conferma le modifiche prima di applicarle.\n6. Notifiche: Ricevi avvisi su movimenti, vendite o cambiamenti importanti.\n7. Gestione Utenti: Gestisci permessi e ruoli degli utenti.\n8. Ordini e Vendite: Visualizza, modifica e gestisci ordini e vendite.\n9. Impostazioni: Personalizza l'app secondo le tue esigenze.\n\nDomande? Chiedimi qualsiasi cosa sul software!`,
};


export default function ImoChatBall({ username }) {
  const { lang } = useContext(LanguageContext);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);

  // Saludo inicial al abrir la app o cambiar idioma
  useEffect(() => {
    const greetArr = greetings[lang] || greetings['es'];
    // Personalizar saludo con el nombre si está disponible
    const greetFn = greetArr[Math.floor(Math.random() * greetArr.length)];
    let greet = greetFn();
    if (username) {
      if (lang === 'es') greet = greet.replace('¡Hola, soy IMO!', `¡Hola ${username}! Soy IMO`);
      else if (lang === 'en') greet = greet.replace(`Hi, I'm IMO!`, `Hi ${username}! I'm IMO`);
      else if (lang === 'fr') greet = greet.replace('Bonjour, je suis IMO !', `Bonjour ${username} ! Je suis IMO !`);
      else if (lang === 'de') greet = greet.replace('Hallo, ich bin IMO!', `Hallo ${username}, ich bin IMO!`);
      else if (lang === 'pt') greet = greet.replace('Olá, sou o IMO!', `Olá ${username}, sou o IMO!`);
      else if (lang === 'it') greet = greet.replace('Ciao, sono IMO!', `Ciao ${username}, sono IMO!`);
      // Si el saludo no tiene el nombre, lo antepone
      if (!greet.includes(username)) greet = `${greet.split('!')[0]} ${username}!${greet.split('!').slice(1).join('!')}`;
    }
    setMessages([{ from: 'imo', text: greet }]);
    // eslint-disable-next-line
  }, [lang, username]);

  const handleSend = () => {
    if (!input.trim()) return;
    const question = input.trim().toLowerCase();
    setMessages(prev => [...prev, { from: 'user', text: input }]);
    setInput('');
    // Buscar respuesta en el manual (coincidencia flexible)
    const langManual = userManual[lang] || userManual['es'];
    let found = null;
    let foundKey = null;
    // 1. Coincidencia exacta de clave
    for (const key in langManual) {
      if (question === key) {
        found = langManual[key];
        foundKey = key;
        break;
      }
    }
    // 2. Coincidencia parcial de clave
    if (!found) {
      for (const key in langManual) {
        if (question.includes(key) || key.includes(question)) {
          found = langManual[key];
          foundKey = key;
          break;
        }
      }
    }
    // 3. Coincidencia por palabras clave
    if (!found) {
      for (const key in langManual) {
        const keyWords = key.split(/\s+/);
        if (keyWords.some(word => question.includes(word))) {
          found = langManual[key];
          foundKey = key;
          break;
        }
      }
    }
    if (found) {
      const answer = `<b>${found.title}</b><br>${found.steps.map(s => '- ' + s).join('<br>')}${found.notes ? `<br><br><i>Nota:</i> ${found.notes}` : ''}`;
      setTimeout(() => {
        setMessages(msgs => [...msgs, { from: 'imo', text: answer }]);
      }, 600);
    } else {
      setTimeout(() => {
        setMessages(msgs => [...msgs, { from: 'imo', text: lang === 'es' ? 'No encontré una respuesta para tu pregunta. ¿Puedes reformularla o ser más específico?' : lang === 'en' ? 'I could not find an answer to your question. Can you rephrase or be more specific?' : 'No answer found.' }]);
      }, 1000);
    }
  };

  return (
    <>
      <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1000 }}>
        {!open && (
          <button onClick={() => setOpen(true)} style={{ background: 'white', borderRadius: '50%', boxShadow: '0 2px 8px #0003', border: 'none', width: 64, height: 64, padding: 0, cursor: 'pointer' }}>
            <img src={ImoSPEAK} alt="IMO Chat" style={{ width: 48, height: 48, margin: 8 }} />
          </button>
        )}
        {open && (
          <div style={{
            width: 350,
            maxWidth: '90vw',
            background: 'var(--imo-chat-bg, rgba(255,255,255,0.97))',
            color: 'var(--imo-chat-text, #222)',
            borderRadius: 16,
            boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            transition: 'background 0.2s, color 0.2s'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--imo-chat-header-bg, rgba(245,245,245,0.95))',
              color: 'var(--imo-chat-header-text, #222)',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: '8px 16px',
              transition: 'background 0.2s, color 0.2s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={ImoSPEAK} alt="IMO Chat" style={{ width: 32, height: 32 }} />
                <b>IMO Chat</b>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 22,
                  cursor: 'pointer',
                  color: 'var(--imo-chat-header-text, #222)',
                  padding: 0,
                  marginLeft: 8,
                  borderRadius: 6,
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--imo-chat-close-hover, rgba(0,0,0,0.07))'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
                aria-label="Cerrar chat"
              >
                &times;
              </button>
            </div>
            <div style={{ flex: 1, padding: 16, overflowY: 'auto', minHeight: 200, maxHeight: 350 }}>
              {messages.map((msg, i) => {
                // IMO bubble and user bubble with CSS variables and fallbacks
                const imoBg = 'var(--imo-bubble-bg, #e6f0fa)';
                const imoText = 'var(--imo-bubble-text, #222)';
                const userBg = 'var(--user-bubble-bg, #d1ffd6)';
                const userText = 'var(--user-bubble-text, #1a3a1a)';
                return (
                  <div key={i} style={{ marginBottom: 12, textAlign: msg.from === 'imo' ? 'left' : 'right' }}>
                    {msg.from === 'imo' ? (
                      <span
                        style={{
                          background: imoBg,
                          color: imoText,
                          borderRadius: 12,
                          padding: '8px 12px',
                          display: 'inline-block',
                          maxWidth: '80%',
                          wordBreak: 'break-word',
                          transition: 'background 0.2s, color 0.2s'
                        }}
                        dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }}
                      />
                    ) : (
                      <span
                        style={{
                          background: userBg,
                          color: userText,
                          borderRadius: 12,
                          padding: '8px 12px',
                          display: 'inline-block',
                          maxWidth: '80%',
                          wordBreak: 'break-word',
                          transition: 'background 0.2s, color 0.2s'
                        }}
                      >
                        {msg.text}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', borderTop: '1px solid var(--imo-chat-border, #eee)', padding: 8 }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={lang === 'es' ? 'Escribe tu pregunta...' : lang === 'en' ? 'Type your question...' : ''}
                style={{ 
                  flex: 1, 
                  border: 'none', 
                  outline: 'none', 
                  padding: 8, 
                  borderRadius: 8, 
                  fontSize: 15,
                  background: 'var(--imo-input-bg, #fff)',
                  color: 'var(--imo-input-text, #222)'
                }}
              />
              <button onClick={handleSend} style={{ 
                marginLeft: 8, 
                background: 'var(--imo-send-button, #007bff)', 
                color: 'white', 
                border: 'none', 
                borderRadius: 8, 
                padding: '8px 16px', 
                fontWeight: 'bold', 
                cursor: 'pointer' 
              }}>
                {lang === 'es' ? 'Enviar' : lang === 'en' ? 'Send' : 'OK'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
