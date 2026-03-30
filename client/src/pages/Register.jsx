import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    email: searchParams.get('email') || '',
    name: '',
    businessName: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const source = searchParams.get('source'); // 'docusign'
  const ref = searchParams.get('ref'); // envelopeId

  const validate = () => {
    if (!form.name) return 'Full name is required';
    if (!form.email) return 'Email is required';
    if (!form.businessName) return 'Business name is required';
    if (form.password.length < 8) return 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setError('');
    setLoading(true);

    try {
      // In production: POST /api/auth/register
      // For now simulate registration and auto-login with demo client account
      // The real implementation will create the user in DB and return a token
      await new Promise(r => setTimeout(r, 800));

      setSuccess(true);
      setTimeout(() => {
        // Auto-login as client after registration
        try {
          login('client@demo.com', 'password');
        } catch {}
        navigate('/');
      }, 1500);
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const requirements = [
    { label: 'At least 8 characters', met: form.password.length >= 8 },
    { label: 'Passwords match', met: form.password && form.password === form.confirmPassword },
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-apple-gray9 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-apple-gray1 mb-2">Account Created!</h2>
          <p className="text-apple-gray4 text-sm">Signing you in to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-apple-gray9 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-apple-blue rounded-2xl shadow-apple mb-4">
            <span className="text-white font-bold text-base">CI</span>
          </div>
          <h1 className="text-2xl font-semibold text-apple-gray1 tracking-tight">Create Your Account</h1>
          {source === 'docusign' ? (
            <p className="text-apple-gray4 text-sm mt-1">
              Your agreement is signed. Set up your portal access below.
            </p>
          ) : (
            <p className="text-apple-gray4 text-sm mt-1">Join the Capital Infusion platform</p>
          )}
        </div>

        <div className="bg-white rounded-apple-xl shadow-apple-lg border border-apple-gray7 p-8">
          {source === 'docusign' && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6">
              <CheckCircle2 size={15} className="text-green-600 shrink-0" />
              <p className="text-green-700 text-sm font-medium">Agreement signed successfully</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-apple-gray3 mb-1.5 uppercase tracking-wide">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2.5 bg-apple-gray9 border border-apple-gray7 rounded-xl text-apple-gray1 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue transition-all"
                placeholder="John Smith"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-apple-gray3 mb-1.5 uppercase tracking-wide">Business Name</label>
              <input
                type="text"
                value={form.businessName}
                onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                className="w-full px-4 py-2.5 bg-apple-gray9 border border-apple-gray7 rounded-xl text-apple-gray1 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue transition-all"
                placeholder="Acme LLC"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-apple-gray3 mb-1.5 uppercase tracking-wide">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-2.5 bg-apple-gray9 border border-apple-gray7 rounded-xl text-apple-gray1 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue transition-all"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-apple-gray3 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-10 bg-apple-gray9 border border-apple-gray7 rounded-xl text-apple-gray1 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray4 hover:text-apple-gray1"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-apple-gray3 mb-1.5 uppercase tracking-wide">Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full px-4 py-2.5 bg-apple-gray9 border border-apple-gray7 rounded-xl text-apple-gray1 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Password requirements */}
            {form.password && (
              <div className="space-y-1">
                {requirements.map(r => (
                  <div key={r.label} className="flex items-center gap-2">
                    <CheckCircle2 size={12} className={r.met ? 'text-green-500' : 'text-apple-gray6'} />
                    <span className={`text-xs ${r.met ? 'text-green-600' : 'text-apple-gray4'}`}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-apple-blue hover:bg-apple-bluehov text-white font-medium text-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-apple-sm mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-apple-gray4 text-xs mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-apple-blue font-medium hover:opacity-70">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
