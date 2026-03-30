import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, AlertCircle, Building2, UserCog } from 'lucide-react';

export default function Login() {
  const [flow, setFlow] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const DEMO = {
    client: [
      { label: 'Darnell Williams', sub: 'Williams Auto Repair', email: 'client@demo.com', pw: 'password' },
      { label: 'Maria Gonzalez', sub: 'Gonzalez Catering', email: 'client2@demo.com', pw: 'password' },
    ],
    rep: [
      { label: 'Alex Stetkevych', sub: 'Admin', email: 'alexs@capital-infusion.com', pw: 'CapitalAdmin2024!' },
      { label: 'Chris', sub: 'Rep', email: 'chris@capital-infusion.com', pw: '' },
      { label: 'Sarah Mitchell', sub: 'Rep — Demo', email: 'rep@demo.com', pw: 'password' },
    ],
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!flow) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl mb-5">
              <span className="text-white font-bold text-base">CI</span>
            </div>
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Capital Infusion</h1>
            <p className="text-gray-400 mt-2 text-sm">Merchant Cash Advance Platform</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => { setFlow('client'); setEmail('client@demo.com'); setPassword('password'); }}
              className="group bg-white border border-gray-200 hover:border-blue-300 rounded-2xl p-7 text-left transition-all hover:shadow-md"
            >
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-600 transition-colors">
                <Building2 size={18} className="text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-gray-900 font-semibold text-base mb-1.5">Client Login</h2>
              <p className="text-gray-400 text-sm leading-relaxed">Access your application, upload documents, and track funding status.</p>
              <p className="text-blue-600 text-sm font-medium mt-5">Continue →</p>
            </button>

            <button
              onClick={() => { setFlow('rep'); setEmail('alexs@capital-infusion.com'); setPassword('CapitalAdmin2024!'); }}
              className="group bg-white border border-gray-200 hover:border-gray-400 rounded-2xl p-7 text-left transition-all hover:shadow-md"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-gray-900 transition-colors">
                <UserCog size={18} className="text-gray-600 group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-gray-900 font-semibold text-base mb-1.5">Rep / Admin Login</h2>
              <p className="text-gray-400 text-sm leading-relaxed">Manage clients, review documents, and oversee operations.</p>
              <p className="text-gray-700 text-sm font-medium mt-5">Continue →</p>
            </button>
          </div>

          <p className="text-center text-gray-300 text-xs mt-8">Secure · Encrypted · AWS Infrastructure</p>
        </div>
      </div>
    );
  }

  const isClient = flow === 'client';

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <button onClick={() => { setFlow(null); setError(''); }} className="flex items-center gap-1.5 text-blue-600 text-sm mb-8 hover:opacity-70 transition-opacity">
          <ArrowLeft size={14} /> Back
        </button>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-7">
            <div className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl mb-4 ${isClient ? 'bg-blue-50' : 'bg-gray-100'}`}>
              {isClient ? <Building2 size={20} className="text-blue-600" /> : <UserCog size={20} className="text-gray-600" />}
            </div>
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
              {isClient ? 'Client Portal' : 'Operations Portal'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {isClient ? 'Sign in to manage your application' : 'Sign in to access your workspace'}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className={`w-full py-2.5 rounded-xl font-medium text-sm text-white transition-all disabled:opacity-50 ${
                isClient ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-gray-800'
              }`}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Quick Access</p>
            <div className="space-y-1">
              {DEMO[flow].map(d => (
                <button
                  key={d.email}
                  onClick={() => { setEmail(d.email); if (d.pw) setPassword(d.pw); }}
                  className="w-full text-left text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {d.label} <span className="text-gray-300">— {d.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
