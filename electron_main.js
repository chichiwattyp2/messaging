const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { initWhatsApp, initWhatsAppBusiness } = require('./services/whatsapp');
const { initGmail, fetchGmailMessages } = require('./services/gmail');
const { initDatabase, saveMessage, getMessages } = require('./services/database');

const store = new Store();
let mainWindow;
let whatsappClient;
let whatsappBusinessClient;
let gmailClient;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  initDatabase();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('init-whatsapp', async () => {
  try {
    whatsappClient = await initWhatsApp(mainWindow, 'whatsapp');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('init-whatsapp-business', async () => {
  try {
    whatsappBusinessClient = await initWhatsAppBusiness(mainWindow, 'whatsapp-business');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('init-gmail', async () => {
  try {
    gmailClient = await initGmail();
    const messages = await fetchGmailMessages(gmailClient);
    
    // Save to database
    for (const msg of messages) {
      await saveMessage(msg);
    }
    
    return { success: true, messages };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-messages', async (event, filters) => {
  try {
    const messages = await getMessages(filters);
    return { success: true, messages };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-message', async (event, { platform, to, message }) => {
  try {
    let result;
    
    switch(platform) {
      case 'whatsapp':
        if (!whatsappClient) throw new Error('WhatsApp not connected');
        result = await whatsappClient.sendMessage(to, message);
        break;
      case 'whatsapp-business':
        if (!whatsappBusinessClient) throw new Error('WhatsApp Business not connected');
        result = await whatsappBusinessClient.sendMessage(to, message);
        break;
      case 'gmail':
        if (!gmailClient) throw new Error('Gmail not connected');
        // Implement Gmail send
        break;
      default:
        throw new Error('Unknown platform');
    }
    
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});