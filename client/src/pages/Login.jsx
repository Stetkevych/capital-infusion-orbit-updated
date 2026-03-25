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
      { label: 'Darnell Williams', sub: 'Williams Auto Repair', email: 'client@demo.com' },
      { label: 'Maria Gonzalez', sub: 'Gonzalez Catering Co.', email: 'client2@demo.com' },
    ],
    rep: [
      { label: 'Sarah Mitchell', sub: 'Rep — East Coast', email: 'rep@demo.com' },
      { label: 'James Carter', sub: 'Rep — West Coast', email: 'rep2@demo.com' },
      { label: 'Admin User', sub: 'Full Access', email: 'admin@demo.com' },
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
      <div className="min-h-screen bg-apple-gray9 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-apple-blue rounded-2xl shadow-apple mb-5">
              <span className="text-white font-bold text-xl tracking-tight">CI</span>
            </div>
            <h1 className="text-3xl font-semibold text-apple-gray1 tracking-tight">Capital Infusion</h1>
            <p className="text-apple-gray4 mt-2 text-base">Merchant Cash Advance Platform</p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => { setFlow('client'); setEmail('client@demo.com'); setPassword('password'); }}
              className="group bg-white rounded-apple-lg p-7 text-left shadow-apple hover:shadow-apple-lg transition-all duration-200 border border-apple-gray7 hover:border-apple-blue/30"
            >
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-apple-blue transition-colors duration-200">
                <Building2 size={20} className="text-apple-blue group-hover:text-white transition-colors duration-200" />
              </div>
              <h2 className="text-apple-gray1 font-semibold text-base mb-1.5">Client Login</h2>
              <p className="text-apple-gray4 text-sm leading-relaxed">Access your application, upload documents, and track funding status.</p>
              <p className="text-apple-blue text-sm font-medium mt-5 group-hover:translate-x-0.5 transition-transform duration-200">Continue →</p>
            </button>

            <button
              onClick={() => { setFlow('rep'); setEmail('rep@demo.com'); setPassword('password'); }}
              className="group bg-white rounded-apple-lg p-7 text-left shadow-apple hover:shadow-apple-lg transition-all duration-200 border border-apple-gray7 hover:border-indigo-300"
            >
              <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-indigo-600 transition-colors duration-200">
                <UserCog size={20} className="text-indigo-500 group-hover:text-white transition-colors duration-200" />
              </div>
              <h2 className="text-apple-gray1 font-semibold text-base mb-1.5">Rep / Admin Login</h2>
              <p className="text-apple-gray4 text-sm leading-relaxed">Manage clients, review documents, and oversee operations.</p>
              <p className="text-indigo-500 text-sm font-medium mt-5 group-hover:translate-x-0.5 transition-transform duration-200">Continue →</p>
            </button>
          </div>

          <p className="text-center text-apple-gray5 text-xs mt-8">
            Secure · Encrypted · FDIC Compliant
          </p>
        </div>
      </div>
    );
  }

  const isClient = flow === 'client';

  return (
    <div className="min-h-screen bg-apple-gray9 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <button
          onClick={() => { setFlow(null); setError(''); }}
          className="flex items-center gap-1.5 text-apple-blue text-sm mb-8 hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="bg-white rounded-apple-xl shadow-apple-lg p-8 border border-apple-gray7">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 ${isClient ? 'bg-blue-50' : 'bg-indigo-50'}`}>
              {isClient
                ? <Building2 size={22} className="text-apple-blue" />
                : <UserCog size={22} className="text-indigo-500" />
              }
            </div>
            <h2 className="text-xl font-semibold text-apple-gray1 tracking-tight">
              {isClient ? 'Client Portal' : 'Operations Portal'}
            </h2>
            <p className="text-apple-gray4 text-sm mt-1">
              {isClient ? 'Sign in to manage your application' : 'Sign in to access your workspace'}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-apple-gray2 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-apple-gray8 border border-apple-gray7 rounded-xl text-apple-gray1 placeholder-apple-gray5 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue transition-all"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-apple-gray2 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-apple-gray8 border border-apple-gray7 rounded-xl text-apple-gray1 placeholder-apple-gray5 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-xl font-medium text-sm text-white transition-all duration-200 ${
                isClient
                  ? 'bg-apple-blue hover:bg-apple-bluehov active:scale-[0.98]'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
              } disabled:opacity-50 shadow-apple-sm`}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-apple-gray7">
            <p className="text-xs text-apple-gray5 font-medium uppercase tracking-wider mb-3">Demo Accounts</p>
            <div className="space-y-1">
              {DEMO[flow].map(d => (
                <button
                  key={d.email}
                  onClick={() => { setEmail(d.email); setPassword('password'); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-apple-gray8 transition-colors group"
                >
                  <span className="text-apple-gray2 text-xs font-medium group-hover:text-apple-gray1">{d.label}</span>
                  <span className="text-apple-gray5 text-xs ml-2">{d.sub}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-apple-gray6 mt-2 px-3">Password: <span className="font-mono">password</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
