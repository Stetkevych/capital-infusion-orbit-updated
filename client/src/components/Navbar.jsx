import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, viewMode, canSwitchView, switchView, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-apple-gray7 px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 bg-apple-blue rounded-lg flex items-center justify-center shadow-apple-sm">
          <span className="text-white font-bold text-xs tracking-tight">CI</span>
        </div>
        <span className="text-apple-gray1 font-semibold text-sm tracking-tight">Capital Infusion</span>
        <span className="text-apple-gray6 text-sm">·</span>
        <span className="text-apple-gray4 text-xs font-medium">
          {viewMode === 'client' ? 'Client Portal' : 'Operations'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* View Switcher — admin only */}
        {canSwitchView && (
          <div className="flex items-center bg-apple-gray8 rounded-lg p-0.5 gap-0.5 border border-apple-gray7">
            <button
              onClick={() => switchView('rep')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                viewMode === 'rep'
                  ? 'bg-white text-apple-gray1 shadow-apple-sm'
                  : 'text-apple-gray4 hover:text-apple-gray2'
              }`}
            >
              Rep View
            </button>
            <button
              onClick={() => switchView('client')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                viewMode === 'client'
                  ? 'bg-white text-apple-gray1 shadow-apple-sm'
                  : 'text-apple-gray4 hover:text-apple-gray2'
              }`}
            >
              Client View
            </button>
          </div>
        )}

        <div className="flex items-center gap-2.5 pl-3 border-l border-apple-gray7">
          <div className="w-7 h-7 bg-apple-blue rounded-full flex items-center justify-center text-xs font-semibold text-white shadow-apple-sm">
            {user?.name?.[0] || '?'}
          </div>
          <div className="hidden sm:block">
            <p className="text-apple-gray1 text-xs font-medium leading-tight">{user?.name}</p>
            <p className="text-apple-gray4 text-xs leading-tight capitalize">{user?.role}</p>
          </div>
          <button
            onClick={onLogout}
            className="ml-1 p-1.5 hover:bg-apple-gray8 rounded-lg transition-colors text-apple-gray4 hover:text-apple-gray1"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </nav>
  );
}
