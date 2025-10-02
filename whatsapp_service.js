const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { saveMessage } = require('./database');

async function initWhatsApp(mainWindow, sessionName) {
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: sessionName }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', async (qr) => {
    console.log('QR Code received for', sessionName);
    const qrDataUrl = await qrcode.toDataURL(qr);
    mainWindow.webContents.send('whatsapp-qr', {
      platform: sessionName,
      qr: qrDataUrl
    });
  });

  client.on('ready', () => {
    console.log(sessionName, 'is ready!');
    mainWindow.webContents.send('whatsapp-ready', {
      platform: sessionName
    });
  });

  client.on('message', async (msg) => {
    const contact = await msg.getContact();
    const chat = await msg.getChat();
    
    const normalizedMessage = {
      id: msg.id._serialized,
      platform: sessionName,
      from: contact.pushname || contact.number,
      fromId: contact.id._serialized,
      to: msg.to,
      body: msg.body,
      timestamp: msg.timestamp * 1000,
      isFromMe: msg.fromMe,
      chatName: chat.name,
      hasMedia: msg.hasMedia,
      type: 'message'
    };

    await saveMessage(normalizedMessage);
    
    mainWindow.webContents.send('new-message', normalizedMessage);
  });

  client.on('authenticated', () => {
    console.log(sessionName, 'authenticated');
  });

  client.on('auth_failure', (msg) => {
    console.error(sessionName, 'authentication failure:', msg);
  });

  await client.initialize();
  return client;
}

async function initWhatsAppBusiness(mainWindow, sessionName) {
  return initWhatsApp(mainWindow, sessionName);
}

module.exports = {
  initWhatsApp,
  initWhatsAppBusiness
};