import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Send, Bot, User, Loader2 } from 'lucide-react';

const NEXUS_API = 'https://nexus-1-hd6i.onrender.com/chat';

export default function NexusBot() {
  const { user } = useAuth();
  const userId = user?.id || 'anonymous';
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLog, setChatLog] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Greeting on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(NEXUS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'Hello', user_id: userId, chat_log: null }),
        });
        const data = await res.json();
        if (data.bot_response) setMessages([{ role: 'bot', text: data.bot_response }]);
        if (data.chat_log) setChatLog(data.chat_log);
      } catch {
        setMessages([{ role: 'bot', text: 'Hey there! How can I help you today?' }]);
      }
      setLoading(false);
    })();
  }, [userId]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await fetch(NEXUS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, user_id: userId, chat_log: chatLog }),
      });
      const data = await res.json();
      if (data.bot_response) setMessages(prev => [...prev, { role: 'bot', text: data.bot_response }]);
      if (data.chat_log) setChatLog(data.chat_log);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Something went wrong. Please try again.' }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
          <Bot size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-gray-900 font-semibold text-sm">Nexus Bot</h1>
          <p className="text-gray-400 text-xs">AI-powered assistant</p>
        </div>
        {chatLog?.current_state && (
          <span className="ml-auto text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium">
            {chatLog.current_state.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'bot' && (
              <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-indigo-600" />
              </div>
            )}
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-gray-100 text-gray-800 rounded-bl-md'
            }`}>{m.text}</div>
            {m.role === 'user' && (
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-white" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
              <Bot size={14} className="text-indigo-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 size={16} className="text-gray-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-6 py-4 border-t border-gray-100 shrink-0">
        <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            placeholder="Type a message..." disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all disabled:opacity-50" />
          <button type="submit" disabled={loading || !input.trim()}
            className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl flex items-center justify-center text-white transition-colors shrink-0">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
