import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, FolderOpen, FileText, Bell,
  StickyNote, Activity, Settings, Upload, User, CheckSquare,
  Zap, BarChart2, TrendingUp, HelpCircle, Key, Building2, Calculator, GraduationCap, CreditCard, MessageSquare, Search
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';

const REP_LINKS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/reps', label: 'Teams', icon: Users },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/deals', label: 'Deal Log', icon: TrendingUp },
  { path: '/upload', label: 'Secure Upload', icon: Upload },
  { path: '/documents', label: 'Documents', icon: FolderOpen },
  { path: '/messages', label: 'Messages', icon: MessageSquare, badge: true },
  { path: '/underwriting', label: 'Underwriting', icon: Zap, adminOnly: true },
  { path: '/analytics', label: 'Analytics', icon: BarChart2, adminOnly: true },
  { path: '/commissions', label: 'Commissions', icon: Calculator, adminOnly: true },
  { path: '/activity', label: 'Activity', icon: Activity, adminOnly: true },
  { path: '/training', label: 'Training', icon: GraduationCap },
  { path: '/ci-loc', label: 'CI LOC', icon: CreditCard, adminOnly: true },
  { path: '/client-data', label: 'Client Data', icon: BarChart2, adminOnly: true },
  { path: '/users', label: 'User Management', icon: Users, adminOnly: true },
  { path: '/client-credentials', label: 'Client Credentials', icon: Key, adminOnly: true },
  { path: '/my-orbit', label: 'My Orbit', icon: User },
  { path: '/nexus-bot', label: 'Nexus Bot', icon: Zap, adminOnly: true },
  { path: '/lead-finder', label: 'Lead Finder', icon: Search, adminOnly: true },
];

const CLIENT_LINKS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/my-documents', label: 'My Documents', icon: FileText },
  { path: '/upload', label: 'Upload Center', icon: Upload },
  { path: '/requests', label: 'Requests', icon: Bell },
  { path: '/messages', label: 'Messages', icon: MessageSquare, badge: true },
  { path: '/my-loc', label: 'Line of Credit', icon: CreditCard, locOnly: true },
  { path: '/businesses', label: 'My Businesses', icon: Building2 },
  { path: '/profile', label: 'Profile', icon: User },
];

export default function Sidebar() {
  const { viewMode, user, token } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const baseLinks = viewMode === 'client' ? CLIENT_LINKS : REP_LINKS;
  const LOC_EMAILS = ['christopher.cranton@gmail.com'];
  const hasLoc = LOC_EMAILS.includes(user?.email?.toLowerCase());
  const links = baseLinks.filter(l => {
    if (l.adminOnly && !isAdmin) return false;
    if (l.locOnly && !hasLoc) return false;
    return true;
  });

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    const fetchUnread = () => {
      fetch(`${API}/messages/conversations`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(convos => {
          const total = (Array.isArray(convos) ? convos : []).reduce((sum, c) => sum + (c.unread || 0), 0);
          setUnreadCount(total);
        })
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [token]);

  const isClient = viewMode === 'client';

  return (
    <div className="w-52 bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="flex-1 overflow-y-auto py-4 px-2">
        <nav className="space-y-0.5">
          {links.map(({ path, label, icon: Icon, badge }) => {
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
                {badge && unreadCount > 0 && (
                  <span className="ml-auto w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-semibold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      {isClient && (
        <div className="mx-2 mb-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle size={13} className="text-blue-600" />
            <span className="text-gray-700 text-xs font-semibold">Need help?</span>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">Contact your rep or email support@capital-infusion.com</p>
        </div>
      )}
    </div>
  );
}
