import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, viewMode, canSwitchView, switchView, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => { logout(); navigate('/login'); };

  const roleLabel = { client: 'Client', rep: 'Rep', admin: 'Admin' }[user?.role] || '';

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
          <span className="text-white font-bold text-xs">CI</span>
        </div>
        <span className="text-white font-semibold text-sm tracking-tight">Capital Infusion</span>
        <span className="text-slate-700 text-sm">|</span>
        <span className="text-slate-400 text-xs">
          {viewMode === 'client' ? 'Client Portal' : 'Operations Portal'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* View Switcher — admin only */}
        {canSwitchView && (
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => switchView('rep')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                viewMode === 'rep'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Rep View
            </button>
            <button
              onClick={() => switchView('client')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                viewMode === 'client'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Client View
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
          <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-slate-300">
            {user?.name?.[0] || '?'}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-slate-200 text-xs font-medium leading-tight">{user?.name}</p>
            <p className="text-slate-500 text-xs leading-tight">{roleLabel}</p>
          </div>
          <button
            onClick={onLogout}
            className="ml-1 p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-500 hover:text-white"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </nav>
  );
}
