import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Eye, EyeOff, Shield, MessageSquare, Zap, ArrowRight, AlertCircle } from 'lucide-react';
import OrbitLogo from '../assets/OrbitLogo.png';

const API_FORGOT = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

/* ── Header ── */
function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 lg:px-10 py-5">
      <img src={OrbitLogo} alt="Capital Infusion Orbit" className="h-16 w-auto object-contain" />
      <div className="hidden sm:flex items-center gap-2.5">
        <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
          <Lock size={14} className="text-green-600" />
        </div>
        <div>
          <p className="text-gray-700 text-xs font-semibold leading-tight">Your information is 100% secure</p>
          <p className="text-gray-400 text-xs leading-tight">Bank-level encryption and protection</p>
        </div>
      </div>
    </header>
  );
}

/* ── Feature highlights ── */
function FeatureHighlights() {
  const items = [
    { icon: Shield, title: 'Secure & Encrypted', desc: 'Bank-level encryption' },
    { icon: MessageSquare, title: 'Direct Communication', desc: 'Message your advisor' },
    { icon: Zap, title: 'Faster Reviews', desc: 'Documents reviewed quickly' },
  ];
  return (
    <div className="grid grid-cols-3 gap-4 mt-10">
      {items.map(f => (
        <div key={f.title} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center mb-3">
            <f.icon size={16} className="text-blue-300" />
          </div>
          <p className="text-white text-sm font-semibold">{f.title}</p>
          <p className="text-blue-200/60 text-xs mt-0.5">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Login card ── */
function LoginCard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter both email and password.'); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await fetch(`${API_FORGOT}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
    } catch {}
    setForgotMsg('If an account exists with that email, a reset link has been sent.');
    setForgotLoading(false);
  };

  if (forgotMode) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail size={20} className="text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
          <p className="text-gray-400 text-sm mt-1">Enter your email and we'll send a reset link</p>
        </div>
        {forgotMsg && (
          <div className="bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl px-4 py-3 mb-4">{forgotMsg}</div>
        )}
        <form onSubmit={handleForgot} className="space-y-4">
          <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            placeholder="you@example.com" />
          <button type="submit" disabled={forgotLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl disabled:opacity-50 transition-colors">
            {forgotLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <button type="button" onClick={() => { setForgotMode(false); setForgotMsg(''); }}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700">Back to login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-md">
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Log In to Orbit</h2>
        <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">Access your secure portal to upload documents and check your application status.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Email address</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              placeholder="you@example.com" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Password</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full pl-10 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              placeholder="••••••••" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20" />
            <span className="text-gray-500 text-xs">Remember me</span>
          </label>
          <button type="button" onClick={() => setForgotMode(true)} className="text-blue-600 text-xs font-medium hover:opacity-70 transition-opacity">
            Forgot password?
          </button>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #4f46e5 100%)' }}>
          {loading ? 'Signing in...' : 'Log In to Orbit →'}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
        <p className="text-gray-400 text-xs">Need help logging in?</p>
        <a href="mailto:support@capital-infusion.com" className="text-blue-600 text-xs font-medium hover:opacity-70 inline-flex items-center gap-1 mt-1">
          Contact Support <ArrowRight size={11} />
        </a>
      </div>
    </div>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer className="absolute bottom-0 left-0 right-0 py-4 text-center">
      <p className="text-gray-400 text-xs">Your information is 100% secure and confidential.</p>
      <p className="text-gray-300 text-xs mt-0.5">Capital Infusion · Inc 5000 Company · Encrypted Software</p>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CLIENT LOGIN PAGE — /client-login
   Uses the same useAuth().login as the original Login.jsx
   ══════════════════════════════════════════════════════════════════════════════ */
export default function ClientLogin() {
  return (
    <div className="min-h-screen relative flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* ── Left panel ── */}
        <div className="relative lg:w-[60%] flex items-center justify-center p-8 lg:p-16 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)' }}>
          {/* subtle city skyline bg */}
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 800 200\'%3E%3Crect x=\'50\' y=\'60\' width=\'40\' height=\'140\' fill=\'%23fff\'/%3E%3Crect x=\'100\' y=\'30\' width=\'50\' height=\'170\' fill=\'%23fff\'/%3E%3Crect x=\'160\' y=\'80\' width=\'35\' height=\'120\' fill=\'%23fff\'/%3E%3Crect x=\'210\' y=\'20\' width=\'45\' height=\'180\' fill=\'%23fff\'/%3E%3Crect x=\'270\' y=\'50\' width=\'55\' height=\'150\' fill=\'%23fff\'/%3E%3Crect x=\'340\' y=\'10\' width=\'40\' height=\'190\' fill=\'%23fff\'/%3E%3Crect x=\'395\' y=\'70\' width=\'50\' height=\'130\' fill=\'%23fff\'/%3E%3Crect x=\'460\' y=\'40\' width=\'35\' height=\'160\' fill=\'%23fff\'/%3E%3Crect x=\'510\' y=\'25\' width=\'60\' height=\'175\' fill=\'%23fff\'/%3E%3Crect x=\'585\' y=\'55\' width=\'40\' height=\'145\' fill=\'%23fff\'/%3E%3Crect x=\'640\' y=\'35\' width=\'50\' height=\'165\' fill=\'%23fff\'/%3E%3Crect x=\'705\' y=\'65\' width=\'45\' height=\'135\' fill=\'%23fff\'/%3E%3C/svg%3E")', backgroundPosition: 'bottom', backgroundRepeat: 'repeat-x', backgroundSize: '800px 200px' }} />

          <div className="relative z-10 max-w-lg">
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">Welcome to Orbit</h1>
            <p className="text-blue-200/80 text-lg leading-relaxed mb-10">
              Your secure portal to upload documents, communicate with your advisor, and move your funding forward — <span className="text-green-400 font-semibold">quickly and safely</span>.
            </p>

            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-2">
              <h3 className="text-white font-bold text-lg mb-1.5">Final Step: Upload Your Documents</h3>
              <p className="text-blue-200/70 text-sm leading-relaxed">
                You're almost done! This is the last step in your application process. It takes about 2 minutes.
              </p>
            </div>

            <FeatureHighlights />
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="lg:w-[40%] flex items-center justify-center p-8 lg:p-12 bg-gray-50/50">
          <LoginCard />
        </div>
      </div>

      <Footer />
    </div>
  );
}
