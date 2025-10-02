const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'messages.db');
  db = new Database(dbPath);

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      from_name TEXT,
      from_id TEXT,
      to_address TEXT,
      body TEXT,
      subject TEXT,
      timestamp INTEGER,
      is_from_me INTEGER,
      chat_name TEXT,
      thread_id TEXT,
      type TEXT,
      has_media INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_platform ON messages(platform);
    CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp);
    CREATE INDEX IF NOT EXISTS idx_from_id ON messages(from_id);
    CREATE INDEX IF NOT EXISTS idx_thread_id ON messages(thread_id);
    
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      name TEXT,
      last_message_id TEXT,
      last_message_time INTEGER,
      unread_count INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  console.log('Database initialized at:', dbPath);
}

function saveMessage(message) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO messages 
    (id, platform, from_name, from_id, to_address, body, subject, timestamp, 
     is_from_me, chat_name, thread_id, type, has_media)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    message.id,
    message.platform,
    message.from,
    message.fromId,
    message.to,
    message.body,
    message.subject || null,
    message.timestamp,
    message.isFromMe ? 1 : 0,
    message.chatName || null,
    message.threadId || null,
    message.type,
    message.hasMedia ? 1 : 0
  );
}

function getMessages(filters = {}) {
  let query = 'SELECT * FROM messages WHERE 1=1';
  const params = [];

  if (filters.platform) {
    query += ' AND platform = ?';
    params.push(filters.platform);
  }

  if (filters.fromId) {
    query += ' AND from_id = ?';
    params.push(filters.fromId);
  }

  if (filters.threadId) {
    query += ' AND thread_id = ?';
    params.push(filters.threadId);
  }

  if (filters.search) {
    query += ' AND (body LIKE ? OR subject LIKE ? OR from_name LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(filters.limit || 100);

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

function getConversations() {
  const query = `
    SELECT 
      c.*,
      m.body as last_message,
      m.timestamp as last_timestamp
    FROM conversations c
    LEFT JOIN messages m ON c.last_message_id = m.id
    WHERE c.is_archived = 0
    ORDER BY last_timestamp DESC
  `;

  return db.prepare(query).all();
}

function searchMessages(searchTerm) {
  const query = `
    SELECT * FROM messages 
    WHERE body LIKE ? OR subject LIKE ? OR from_name LIKE ?
    ORDER BY timestamp DESC
    LIMIT 50
  `;
  
  const term = `%${searchTerm}%`;
  return db.prepare(query).all(term, term, term);
}

module.exports = {
  initDatabase,
  saveMessage,
  getMessages,
  getConversations,
  searchMessages
};