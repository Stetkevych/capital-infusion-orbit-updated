import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Send, ChevronLeft, Search } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

export default function Messages() {
  const { user, token } = useAuth();
  const [convos, setConvos] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [showNewMsg, setShowNewMsg] = useState(false);
  const bottomRef = useRef(null);
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/messages/conversations`, { headers }).then(r => r.ok ? r.json() : []).then(setConvos).catch(() => {});
    fetch(`${API}/auth/users`, { headers }).then(r => r.ok ? r.json() : []).then(d => setUsers(Array.isArray(d) ? d.filter(u => u.id !== user.id && u.is_active) : [])).catch(() => {});
  }, []);

  const openConvo = async (userId, userName) => {
    setActiveConvo({ userId, userName });
    setShowNewMsg(false);
    const msgs = await (await fetch(`${API}/messages?with=${userId}`, { headers })).json();
    setMessages(Array.isArray(msgs) ? msgs : []);
    fetch(`${API}/messages/read`, { method: 'PATCH', headers, body: JSON.stringify({ fromId: userId }) }).catch(() => {});
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = async () => {
    if (!text.trim() || !activeConvo) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/messages`, {
        method: 'POST', headers,
        body: JSON.stringify({ toId: activeConvo.userId, toName: activeConvo.userName, text: text.trim() }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        setText('');
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    } catch {} finally { setSending(false); }
  };

  const filteredUsers = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
            <MessageSquare size={22} className="text-blue-600" /> Messages
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Inter-Orbit messaging center</p>
        </div>
        <button onClick={() => { setShowNewMsg(true); setActiveConvo(null); }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2.5 rounded-xl transition-colors font-medium">
          <MessageSquare size={14} /> New Message
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex" style={{ height: '500px' }}>
        {/* Left panel */}
        <div className="w-72 border-r border-gray-100 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-100">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide px-1 mb-2">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convos.length === 0 ? (
              <p className="text-gray-400 text-xs p-4 text-center">No conversations yet</p>
            ) : convos.map(c => (
              <button key={c.userId} onClick={() => openConvo(c.userId, c.userName)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${activeConvo?.userId === c.userId ? 'bg-blue-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <p className="text-gray-900 text-sm font-medium truncate">{c.userName}</p>
                  {c.unread > 0 && <span className="w-5 h-5 bg-blue-600 rounded-full text-white text-xs flex items-center justify-center">{c.unread}</span>}
                </div>
                <p className="text-gray-400 text-xs truncate mt-0.5">{c.lastMessage}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col">
          {showNewMsg && !activeConvo ? (
            <div className="flex-1 p-4">
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {filteredUsers.map(u => (
                  <button key={u.id} onClick={() => openConvo(u.id, u.full_name)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">{(u.full_name || '?')[0]}</div>
                    <div>
                      <p className="text-gray-900 text-sm font-medium">{u.full_name}</p>
                      <p className="text-gray-400 text-xs">{u.email} · {u.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : activeConvo ? (
            <>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                <button onClick={() => setActiveConvo(null)} className="text-gray-400 hover:text-gray-700 md:hidden"><ChevronLeft size={18} /></button>
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">{activeConvo.userName[0]}</div>
                <p className="text-gray-900 text-sm font-semibold">{activeConvo.userName}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(m => {
                  const isMe = m.fromId === user.id;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                        <p>{m.text}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t border-gray-100 flex items-center gap-2">
                <input value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                <button onClick={sendMessage} disabled={sending || !text.trim()}
                  className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl flex items-center justify-center text-white transition-colors">
                  <Send size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Select a conversation or start a new message
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
