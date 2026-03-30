import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, FolderOpen, FileText, Bell,
  StickyNote, Activity, Settings, Upload, User, CheckSquare,
  Zap, BarChart2
} from 'lucide-react';

const REP_LINKS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/reps', label: 'Rep Info', icon: Users },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/upload', label: 'Secure Upload', icon: Upload },
  { path: '/documents', label: 'Document Center', icon: FolderOpen },
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
    <div className="w-52 bg-white border-r border-apple-gray7 flex flex-col shrink-0">
      <div className="flex-1 overflow-y-auto py-5 px-3">
        <nav className="space-y-0.5">
          {links.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-sm ${
                  active
                    ? 'bg-apple-blue/10 text-apple-blue font-medium'
                    : 'text-apple-gray3 hover:bg-apple-gray8 hover:text-apple-gray1'
                }`}
              >
                <Icon size={15} className={active ? 'text-apple-blue' : 'text-apple-gray5'} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
