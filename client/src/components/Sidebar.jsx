import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, FolderOpen, FileText, Bell,
  StickyNote, Activity, Settings, Upload, User, CheckSquare,
  Zap, BarChart2, TrendingUp
} from 'lucide-react';

const REP_LINKS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/reps', label: 'Rep Info', icon: Users },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/deals', label: 'Deal Log', icon: TrendingUp },
  { path: '/upload', label: 'Secure Upload', icon: Upload },
  { path: '/documents', label: 'Documents', icon: FolderOpen },
  { path: '/underwriting', label: 'Underwriting', icon: Zap },
  { path: '/analytics', label: 'Analytics', icon: BarChart2 },
  { path: '/requests', label: 'Requests', icon: Bell },
  { path: '/notes', label: 'Notes', icon: StickyNote },
  { path: '/activity', label: 'Activity', icon: Activity },
  { path: '/users', label: 'User Management', icon: Users },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const CLIENT_LINKS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/my-documents', label: 'My Documents', icon: FileText },
  { path: '/upload', label: 'Upload Center', icon: Upload },
  { path: '/requests', label: 'Requests', icon: Bell },
  { path: '/status', label: 'Status', icon: CheckSquare },
  { path: '/profile', label: 'Profile', icon: User },
];

export default function Sidebar() {
  const { viewMode } = useAuth();
  const location = useLocation();
  const links = viewMode === 'client' ? CLIENT_LINKS : REP_LINKS;

  return (
    <div className="w-52 bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="flex-1 overflow-y-auto py-4 px-2">
        <nav className="space-y-0.5">
          {links.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-sm ${
                  active
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon size={15} className={active ? 'text-blue-600' : 'text-gray-400'} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
