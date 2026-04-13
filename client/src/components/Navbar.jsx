import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, viewMode, canSwitchView, switchView, logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">CI</span>
        </div>
        <span className="text-gray-900 font-semibold text-sm">Capital Infusion</span>
        <span className="text-gray-300 text-sm">·</span>
        <span className="text-gray-400 text-xs font-medium">
          {viewMode === 'client' ? 'Client Portal' : 'Operations'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {canSwitchView && (
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => switchView('rep')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'rep' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >Rep View</button>
            <button
              onClick={() => switchView('client')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'client' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >Client View</button>
          </div>
        )}
        <div className="flex items-center gap-2.5 pl-3 border-l border-gray-100">
          <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-xs font-semibold text-white">
            {user?.name?.[0] || '?'}
          </div>
          <div className="hidden sm:block">
            <p className="text-gray-800 text-xs font-medium leading-tight">{user?.name}</p>
            <p className="text-gray-400 text-xs leading-tight capitalize">{user?.email === 'matthew@capital-infusion.com' ? 'CEO' : user?.role}</p>
          </div>
          <button onClick={onLogout} className="ml-1 p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700" title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </nav>
  );
}
