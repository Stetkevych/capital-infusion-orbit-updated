import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, FolderOpen, FileText, Bell,
  StickyNote, Activity, Settings, Upload, User, CheckSquare
} from 'lucide-react';

const REP_LINKS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/reps', label: 'Reps', icon: Users },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/documents', label: 'Document Center', icon: FolderOpen },
  { path: '/requests', label: 'Requests', icon: Bell },
  { path: '/notes', label: 'Notes', icon: StickyNote },
  { path: '/activity', label: 'Activity', icon: Activity },
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
    <div className="w-56 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-0.5">
          {links.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm ${
                  active
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-600/25'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon size={16} className={active ? 'text-blue-400' : 'text-slate-500'} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
