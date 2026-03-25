import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, UserCog, ArrowLeft, AlertCircle } from 'lucide-react';

export default function Login() {
  const [flow, setFlow] = useState(null); // null | 'client' | 'rep'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const DEMO = {
    client: [
      { label: 'Darnell Williams (Client)', email: 'client@demo.com' },
      { label: 'Maria Gonzalez (Client)', email: 'client2@demo.com' },
    ],
    rep: [
      { label: 'Sarah Mitchell (Rep)', email: 'rep@demo.com' },
      { label: 'James Carter (Rep)', email: 'rep2@demo.com' },
      { label: 'Admin User', email: 'admin@demo.com' },
    ],
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!flow) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CI</span>
              </div>
              <span className="text-white text-xl font-bold tracking-tight">Capital Infusion</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-slate-400">Select your login type to continue</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => { setFlow('client'); setEmail('client@demo.com'); setPassword('password'); }}
              className="group bg-slate-900 border border-slate-700 hover:border-blue-500 rounded-2xl p-8 text-left transition-all hover:bg-slate-800"
            >
              <div className="w-12 h-12 bg-blue-900/40 border border-blue-800 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-600 transition">
                <Building2 size={22} className="text-blue-400 group-hover:text-white" />
              </div>
              <h2 className="text-white text-lg font-semibold mb-2">Client / Merchant Login</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Access your application, upload documents, and track your funding status.
              </p>
              <div className="mt-5 text-blue-400 text-sm font-medium group-hover:text-blue-300">
                Continue as Client →
              </div>
            </button>

            <button
              onClick={() => { setFlow('rep'); setEmail('rep@demo.com'); setPassword('password'); }}
              className="group bg-slate-900 border border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-left transition-all hover:bg-slate-800"
            >
              <div className="w-12 h-12 bg-indigo-900/40 border border-indigo-800 rounded-xl flex items-center justify-center mb-5 group-hover:bg-indigo-600 transition">
                <UserCog size={22} className="text-indigo-400 group-hover:text-white" />
              </div>
              <h2 className="text-white text-lg font-semibold mb-2">Rep / Admin Login</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Manage clients, review documents, track pipeline, and oversee operations.
              </p>
              <div className="mt-5 text-indigo-400 text-sm font-medium group-hover:text-indigo-300">
                Continue as Rep / Admin →
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isClient = flow === 'client';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => { setFlow(null); setError(''); }}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition"
        >
          <ArrowLeft size={15} /> Back
        </button>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">CI</span>
            </div>
            <span className="text-slate-400 text-sm">Capital Infusion</span>
          </div>
          <h2 className="text-white text-2xl font-bold mt-3 mb-1">
            {isClient ? 'Client Portal' : 'Rep & Admin Portal'}
          </h2>
          <p className="text-slate-400 text-sm mb-7">
            {isClient ? 'Sign in to manage your application and documents.' : 'Sign in to access your client workspace.'}
          </p>

          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3 mb-5">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-lg font-medium text-sm transition ${
                isClient
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              } disabled:opacity-50`}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Demo Accounts</p>
            <div className="space-y-1">
              {DEMO[flow].map(d => (
                <button
                  key={d.email}
                  onClick={() => { setEmail(d.email); setPassword('password'); }}
                  className="w-full text-left text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded hover:bg-slate-800 transition"
                >
                  {d.label} — <span className="text-slate-500">{d.email}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-2">All demo passwords: <span className="text-slate-500">password</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
