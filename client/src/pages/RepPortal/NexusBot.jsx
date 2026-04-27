import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Send, Bot, User, Loader2, Brain, MessageSquare, Search, Save,
  X, Copy, Download, Trash2, Edit3, CheckCircle2, AlertTriangle, Filter, BookOpen
} from 'lucide-react';

const NEXUS_CHAT = 'https://nexus-1-hd6i.onrender.com/chat';
const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const TONES = ['professional', 'aggressive sales', 'friendly', 'concise', 'MCA expert'];
const CATEGORIES = ['cold outreach', 'follow-up', 'objection handling', 'renewal', 'underwriting explanation', 'funding offer', 'general'];

/* ══════════════════════════════════════════════════════════════════════════════
   CHAT TAB — original Nexus chat, fully preserved
   ══════════════════════════════════════════════════════════════════════════════ */
function ChatTab({ token }) {
  const { user } = useAuth();
  const userId = user?.id || 'anonymous';
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLog, setChatLog] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(NEXUS_CHAT, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(NEXUS_CHAT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'bot' && (
              <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-indigo-600" />
              </div>
            )}
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'
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
            <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0"><Bot size={14} className="text-indigo-600" /></div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3"><Loader2 size={16} className="text-gray-400 animate-spin" /></div>
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

/* ══════════════════════════════════════════════════════════════════════════════
   TRAINING TAB — Trainable Conscience
   ══════════════════════════════════════════════════════════════════════════════ */
function TrainingTab({ token }) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('professional');
  const [category, setCategory] = useState('cold outreach');
  const [generated, setGenerated] = useState('');
  const [edited, setEdited] = useState('');
  const [examples, setExamples] = useState([]);
  const [library, setLibrary] = useState([]);
  const [libSearch, setLibSearch] = useState('');
  const [libCat, setLibCat] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const loadLibrary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (libCat) params.set('category', libCat);
      if (libSearch) params.set('q', libSearch);
      const res = await fetch(`${API}/nexus/training-library?${params}`, { headers });
      if (res.ok) setLibrary(await res.json());
    } catch {}
  }, [token, libCat, libSearch]);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/nexus/generate-response`, {
        method: 'POST', headers,
        body: JSON.stringify({ prompt, category, tone }),
      });
      const data = await res.json();
      setGenerated(data.generated_response || '');
      setEdited(data.generated_response || '');
      setExamples(data.examples_used || []);
    } catch {
      setGenerated('Failed to generate. Try again.');
      setEdited('');
      setExamples([]);
    }
    setGenerating(false);
  };

  const saveApproved = async () => {
    if (!edited.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API}/nexus/save-training-response`, {
        method: 'POST', headers,
        body: JSON.stringify({
          original_prompt: prompt,
          original_bot_response: generated,
          improved_response: edited,
          category, tone,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          notes,
        }),
      });
      setMsg({ type: 'ok', text: 'Response saved to training library.' });
      setPrompt(''); setGenerated(''); setEdited(''); setExamples([]); setTags(''); setNotes('');
      loadLibrary();
    } catch {
      setMsg({ type: 'err', text: 'Failed to save.' });
    }
    setSaving(false);
  };

  const deleteEntry = async (id) => {
    try {
      await fetch(`${API}/nexus/training-response/${id}`, { method: 'DELETE', headers });
      loadLibrary();
    } catch {}
  };

  const copyText = (t) => { navigator.clipboard.writeText(t).catch(() => {}); };

  const exportCSV = () => {
    if (!library.length) return;
    const cols = ['original_prompt', 'improved_response', 'category', 'tone', 'tags', 'approved_by', 'created_at', 'usage_count'];
    const rows = library.map(r => cols.map(c => `"${String(c === 'tags' ? (r[c] || []).join(';') : r[c] ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [cols.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `nexus-training-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Prompt + Controls ── */}
      <div className="w-80 border-r border-gray-100 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-gray-900 font-semibold text-sm mb-3">Prompt</h3>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
            placeholder="Enter a sales scenario or prompt..."
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
        </div>
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tags (comma-separated)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="mca, bank statements, follow-up"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Compliance notes..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>
        <div className="p-4 space-y-2">
          <button onClick={generate} disabled={generating || !prompt.trim()}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
            {generating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Brain size={14} /> Generate Response</>}
          </button>
          <button onClick={saveApproved} disabled={saving || !edited.trim()}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
            <Save size={14} /> Save Approved
          </button>
          <button onClick={() => { setGenerated(''); setEdited(''); setExamples([]); setMsg(null); }}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
            <X size={14} /> Reject / Clear
          </button>
        </div>
        {/* Compliance */}
        <div className="p-4 mt-auto">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-amber-700 text-xs leading-relaxed flex items-start gap-1.5">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              Do not promise approvals, fabricate rates/terms, or make misleading claims. Keep all responses compliant.
            </p>
          </div>
        </div>
      </div>

      {/* ── Center: Generated Response ── */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-gray-900 font-semibold text-sm">Generated Response</h3>
          {generated && (
            <button onClick={() => copyText(edited || generated)} className="text-gray-400 hover:text-gray-600 transition-colors" title="Copy">
              <Copy size={14} />
            </button>
          )}
        </div>
        <div className="flex-1 p-5">
          {msg && (
            <div className={`flex items-center gap-2 text-sm rounded-xl px-4 py-3 mb-4 ${
              msg.type === 'ok' ? 'bg-green-50 border border-green-100 text-green-700' : 'bg-red-50 border border-red-100 text-red-600'
            }`}>
              {msg.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {msg.text}
            </div>
          )}
          {!generated && !generating && (
            <div className="text-center py-16 text-gray-300">
              <Brain size={32} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm">Enter a prompt and click Generate</p>
            </div>
          )}
          {generating && (
            <div className="text-center py-16">
              <Loader2 size={24} className="mx-auto mb-3 text-indigo-400 animate-spin" />
              <p className="text-gray-400 text-sm">Generating response...</p>
            </div>
          )}
          {generated && !generating && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Edit response below</label>
                <textarea value={edited} onChange={e => setEdited(e.target.value)} rows={10}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 leading-relaxed" />
              </div>
              {examples.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1"><BookOpen size={11} /> Influenced by {examples.length} saved example{examples.length > 1 ? 's' : ''}</p>
                  <div className="space-y-2">
                    {examples.map(ex => (
                      <div key={ex.id} className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                        <p className="text-indigo-800 text-xs font-medium mb-0.5">{ex.original_prompt}</p>
                        <p className="text-indigo-600 text-xs truncate">{ex.improved_response}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-indigo-400 text-xs">{ex.category}</span>
                          <span className="text-indigo-400 text-xs">· {ex.tone}</span>
                          <span className="text-indigo-400 text-xs">· used {ex.usage_count}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Library ── */}
      <div className="w-80 border-l border-gray-100 flex flex-col shrink-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-900 font-semibold text-sm">Response Library</h3>
            <div className="flex gap-1">
              <button onClick={exportCSV} disabled={!library.length} title="Export CSV"
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-30">
                <Download size={13} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={libSearch} onChange={e => setLibSearch(e.target.value)} placeholder="Search..."
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <select value={libCat} onChange={e => setLibCat(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none">
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {library.length === 0 ? (
            <div className="text-center py-12 text-gray-300 text-xs">No saved responses yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {library.map(r => (
                <div key={r.id} className="p-3 hover:bg-gray-50/50 transition-colors group">
                  <p className="text-gray-800 text-xs font-medium mb-0.5 line-clamp-1">{r.original_prompt}</p>
                  <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">{r.improved_response}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{r.category}</span>
                    <span className="text-xs text-gray-400">{r.tone}</span>
                    <span className="text-xs text-gray-300">· {r.usage_count}x</span>
                    <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setPrompt(r.original_prompt); setEdited(r.improved_response); setGenerated(r.improved_response); setTone(r.tone); setCategory(r.category); setTags((r.tags || []).join(', ')); }}
                        title="Load into editor" className="p-1 hover:bg-gray-200 rounded text-gray-400"><Edit3 size={11} /></button>
                      <button onClick={() => copyText(r.improved_response)} title="Copy" className="p-1 hover:bg-gray-200 rounded text-gray-400"><Copy size={11} /></button>
                      <button onClick={() => deleteEntry(r.id)} title="Delete" className="p-1 hover:bg-red-100 rounded text-red-400"><Trash2 size={11} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-3 border-t border-gray-100 text-center">
          <p className="text-gray-300 text-xs">{library.length} saved response{library.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN — Tab switcher
   ══════════════════════════════════════════════════════════════════════════════ */
export default function NexusBot() {
  const { token } = useAuth();
  const [tab, setTab] = useState('chat');

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
          <Bot size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-gray-900 font-semibold text-sm">Nexus Bot</h1>
          <p className="text-gray-400 text-xs">AI assistant & trainable conscience</p>
        </div>
        <div className="ml-auto flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === 'chat' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}><MessageSquare size={13} /> Chat</button>
          <button onClick={() => setTab('training')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === 'training' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}><Brain size={13} /> Training</button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'chat' ? <ChatTab token={token} /> : <TrainingTab token={token} />}
      </div>
    </div>
  );
}
