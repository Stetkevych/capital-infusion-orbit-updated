import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Upload, MessageSquare, Menu } from 'lucide-react';

const TABS = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { path: '/clients', icon: Users, label: 'Clients' },
  { path: '/upload', icon: Upload, label: 'Upload' },
  { path: '/messages', icon: MessageSquare, label: 'Messages' },
];

export default function BottomNav({ onMenuTap }) {
  const location = useLocation();
  const { viewMode } = useAuth();

  if (viewMode === 'client') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {TABS.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <Link key={path} to={path} className="flex flex-col items-center justify-center flex-1 h-full">
              <Icon size={20} className={active ? 'text-blue-600' : 'text-gray-400'} />
              <span className={`text-[10px] mt-0.5 ${active ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{label}</span>
            </Link>
          );
        })}
        <button onClick={onMenuTap} className="flex flex-col items-center justify-center flex-1 h-full">
          <Menu size={20} className="text-gray-400" />
          <span className="text-[10px] mt-0.5 text-gray-400">More</span>
        </button>
      </div>
    </div>
  );
}
