import React, { useState, useEffect } from 'react';
import { MessageSquare, Mail, Send, Search, Settings, RefreshCw } from 'lucide-react';

export default function UnifiedInbox() {
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [connections, setConnections] = useState({
    whatsapp: { status: 'disconnected', qr: null },
    whatsappBusiness: { status: 'disconnected', qr: null },
    gmail: { status: 'disconnected' }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showSetup, setShowSetup] = useState(true);

  useEffect(() => {
    // Listen for new messages
    if (window.electron) {
      window.electron.onNewMessage((message) => {
        setMessages(prev => [message, ...prev]);
      });

      window.electron.onQRCode((data) => {
        setConnections(prev => ({
          ...prev,
          [data.platform]: { status: 'qr', qr: data.qr }
        }));
      });

      window.electron.onReady((data) => {
        setConnections(prev => ({
          ...prev,
          [data.platform]: { status: 'connected', qr: null }
        }));
      });
    }

    return () => {
      if (window.electron) {
        window.electron.removeAllListeners('new-message');
        window.electron.removeAllListeners('whatsapp-qr');
        window.electron.removeAllListeners('whatsapp-ready');
      }
    };
  }, []);

  const connectWhatsApp = async () => {
    setConnections(prev => ({
      ...prev,
      whatsapp: { status: 'connecting', qr: null }
    }));
    
    if (window.electron) {
      const result = await window.electron.initWhatsApp();
      if (!result.success) {
        alert('Failed to connect WhatsApp: ' + result.error);
        setConnections(prev => ({
          ...prev,
          whatsapp: { status: 'disconnected', qr: null }
        }));
      }
    }
  };

  const connectWhatsAppBusiness = async () => {
    setConnections(prev => ({
      ...prev,
      whatsappBusiness: { status: 'connecting', qr: null }
    }));
    
    if (window.electron) {
      const result = await window.electron.initWhatsAppBusiness();
      if (!result.success) {
        alert('Failed to connect WhatsApp Business: ' + result.error);
        setConnections(prev => ({
          ...prev,
          whatsappBusiness: { status: 'disconnected', qr: null }
        }));
      }
    }
  };

  const connectGmail = async () => {
    setConnections(prev => ({
      ...prev,
      gmail: { status: 'connecting' }
    }));
    
    if (window.electron) {
      const result = await window.electron.initGmail();
      if (result.success) {
        setConnections(prev => ({
          ...prev,
          gmail: { status: 'connected' }
        }));
        setMessages(result.messages || []);
      } else {
        alert('Failed to connect Gmail: ' + result.error);
        setConnections(prev => ({
          ...prev,
          gmail: { status: 'disconnected' }
        }));
      }
    }
  };

  const loadMessages = async () => {
    if (window.electron) {
      const result = await window.electron.getMessages({
        platform: activeFilter !== 'all' ? activeFilter : undefined,
        search: searchTerm || undefined
      });
      if (result.success) {
        setMessages(result.messages);
      }
    }
  };

  const getPlatformIcon = (platform) => {
    switch(platform) {
      case 'gmail': return <Mail size={16} className="text-red-500" />;
      case 'whatsapp': return <MessageSquare size={16} className="text-green-500" />;
      case 'whatsapp-business': return <MessageSquare size={16} className="text-emerald-600" />;
      default: return <MessageSquare size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'qr': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (activeFilter !== 'all' && msg.platform !== activeFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return msg.body?.toLowerCase().includes(search) ||
             msg.from?.toLowerCase().includes(search) ||
             msg.subject?.toLowerCase().includes(search);
    }
    return true;
  });

  if (showSetup && Object.values(connections).every(c => c.status === 'disconnected')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Unified Inbox</h1>
          <p className="text-gray-600 mb-8">Connect your messaging platforms to get started</p>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-6 hover:border-green-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="text-green-500" size={32} />
                  <div>
                    <h3 className="font-semibold text-lg">WhatsApp</h3>
                    <p className="text-sm text-gray-600">Personal account</p>
                  </div>
                </div>
                <button
                  onClick={connectWhatsApp}
                  disabled={connections.whatsapp.status !== 'disconnected'}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {connections.whatsapp.status === 'disconnected' ? 'Connect' : 'Connecting...'}
                </button>
              </div>
              {connections.whatsapp.qr && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Scan QR code with WhatsApp:</p>
                  <img src={connections.whatsapp.qr} alt="QR Code" className="mx-auto max-w-xs" />
                </div>
              )}
            </div>

            <div className="border rounded-lg p-6 hover:border-emerald-600 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="text-emerald-600" size={32} />
                  <div>
                    <h3 className="font-semibold text-lg">WhatsApp Business</h3>
                    <p className="text-sm text-gray-600">Business account</p>
                  </div>
                </div>
                <button
                  onClick={connectWhatsAppBusiness}
                  disabled={connections.whatsappBusiness.status !== 'disconnected'}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {connections.whatsappBusiness.status === 'disconnected' ? 'Connect' : 'Connecting...'}
                </button>
              </div>
              {connections.whatsappBusiness.qr && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Scan QR code with WhatsApp Business:</p>
                  <img src={connections.whatsappBusiness.qr} alt="QR Code" className="mx-auto max-w-xs" />
                </div>
              )}
            </div>

            <div className="border rounded-lg p-6 hover:border-red-500 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="text-red-500" size={32} />
                  <div>
                    <h3 className="font-semibold text-lg">Gmail</h3>
                    <p className="text-sm text-gray-600">Email account</p>
                  </div>
                </div>
                <button
                  onClick={connectGmail}
                  disabled={connections.gmail.status !== 'disconnected'}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {connections.gmail.status === 'disconnected' ? 'Connect' : 'Connecting...'}
                </button>
              </div>
            </div>
          </div>

          {Object.values(connections).some(c => c.status === 'connected') && (
            <button
              onClick={() => { setShowSetup(false); loadMessages(); }}
              className="w-full mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              Continue to Inbox
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Unified Inbox</h1>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-full text-sm ${activeFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('gmail')}
              className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${activeFilter === 'gmail' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              <Mail size={14} /> Gmail
            </button>
            <button
              onClick={() => setActiveFilter('whatsapp')}
              className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${activeFilter === 'whatsapp' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              <MessageSquare size={14} /> WA
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadMessages}
              className="flex-1 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              onClick={() => setShowSetup(true)}
              className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredMessages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No messages yet</p>
              <p className="text-sm mt-2">Connect your accounts to see messages</p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${selectedMessage?.id === msg.id ? 'bg-indigo-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(msg.platform)}
                    <span className="font-semibold text-gray-800">{msg.from || msg.chatName}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleDateString()}
                  </span>
                </div>
                {msg.subject && (
                  <div className="font-medium text-sm text-gray-700 mb-1">{msg.subject}</div>
                )}
                <div className="text-sm text-gray-600 truncate">{msg.body}</div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(connections.whatsapp.status)}`}></div>
              <span>WA</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(connections.whatsappBusiness.status)}`}></div>
              <span>WA Biz</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(connections.gmail.status)}`}></div>
              <span>Gmail</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedMessage ? (
          <>
            <div className="p-6 border-b">
              <div className="flex items-center gap-3 mb-2">
                {getPlatformIcon(selectedMessage.platform)}
                <h2 className="text-xl font-semibold">{selectedMessage.from || selectedMessage.chatName}</h2>
              </div>
              {selectedMessage.subject && (
                <h3 className="text-lg text-gray-700 mb-2">{selectedMessage.subject}</h3>
              )}
              <p className="text-sm text-gray-500">
                {new Date(selectedMessage.timestamp).toLocaleString()}
              </p>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{selectedMessage.body}</p>
              </div>
            </div>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a reply..."
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                  <Send size={16} /> Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a message to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}