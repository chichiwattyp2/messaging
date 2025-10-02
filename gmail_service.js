const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 
                'https://www.googleapis.com/auth/gmail.send'];
const TOKEN_PATH = path.join(app.getPath('userData'), 'gmail-token.json');
const CREDENTIALS_PATH = path.join(app.getPath('userData'), 'gmail-credentials.json');

async function initGmail() {
  // Load client secrets
  let credentials;
  try {
    const content = await fs.readFile(CREDENTIALS_PATH);
    credentials = JSON.parse(content);
  } catch (err) {
    throw new Error('Gmail credentials not found. Please add gmail-credentials.json to app data folder');
  }

  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check for existing token
  try {
    const token = await fs.readFile(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
  } catch (err) {
    // Need to get new token
    await getNewToken(oAuth2Client);
  }

  return oAuth2Client;
}

async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('Authorize this app by visiting this url:', authUrl);
  // In production, open this URL in browser and handle callback
  // For now, user needs to manually complete OAuth flow
  
  throw new Error('OAuth flow not complete. Please implement OAuth callback handling');
}

async function fetchGmailMessages(auth, maxResults = 50) {
  const gmail = google.gmail({ version: 'v1', auth });
  
  const res = await gmail.users.messages.list({
    userId: 'me',
    maxResults: maxResults,
    q: 'in:inbox'
  });

  const messages = res.data.messages || [];
  const detailedMessages = [];

  for (const message of messages) {
    const msg = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
      format: 'full'
    });

    const headers = msg.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
    const from = headers.find(h => h.name === 'From')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';

    // Get email body
    let body = '';
    if (msg.data.payload.body.data) {
      body = Buffer.from(msg.data.payload.body.data, 'base64').toString();
    } else if (msg.data.payload.parts) {
      const textPart = msg.data.payload.parts.find(part => part.mimeType === 'text/plain');
      if (textPart && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString();
      }
    }

    detailedMessages.push({
      id: msg.data.id,
      platform: 'gmail',
      from: from,
      fromId: from,
      to: to,
      body: body.substring(0, 500), // Truncate for preview
      subject: subject,
      timestamp: new Date(date).getTime(),
      isFromMe: false,
      threadId: msg.data.threadId,
      labelIds: msg.data.labelIds,
      type: 'email'
    });
  }

  return detailedMessages;
}

async function sendGmailMessage(auth, to, subject, body) {
  const gmail = google.gmail({ version: 'v1', auth });
  
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    '',
    body
  ].join('\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage
    }
  });

  return res.data;
}

module.exports = {
  initGmail,
  fetchGmailMessages,
  sendGmailMessage
};