import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import OrbitLogo from '../assets/OrbitLogo.png';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');

    setLoading(true);
    try {
      const API = process.env.REACT_APP_API_URL || 'http://capital-infusion-api-prod.eba-wqytrheg.us-east-1.elasticbeanstalk.com/api';
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Reset failed');
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <img src={OrbitLogo} alt="Orbit" className="h-40 w-auto mx-auto mb-6 object-contain" />
          <div className="flex items-center gap-2 justify-center bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
            <AlertCircle size={14} className="shrink-0" /> Invalid reset link
          </div>
          <button onClick={() => navigate('/login')} className="text-blue-600 text-sm hover:opacity-70">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <img src={OrbitLogo} alt="Orbit" className="h-40 w-auto mx-auto mb-6 object-contain" />
          <div className="inline-flex items-center justify-center w-11 h-11 bg-green-50 rounded-2xl mb-4">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Reset</h2>
          <p className="text-gray-400 text-sm mb-6">Your password has been updated successfully.</p>
          <button onClick={() => navigate('/login')}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-all">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <img src={OrbitLogo} alt="Orbit" className="h-40 w-auto mx-auto mb-4 object-contain" />
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-11 h-11 bg-blue-50 rounded-2xl mb-4">
              <Lock size={20} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Set New Password</h2>
            <p className="text-gray-400 text-sm mt-1">{email}</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                placeholder="Minimum 8 characters" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                placeholder="Re-enter password" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-all disabled:opacity-50">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
