import React, { createContext, useContext, useState } from 'react';
import { ROLES, CLIENTS, getUserByEmail } from '../data/mockData';

export const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

const API = process.env.REACT_APP_API_URL || 'https://api.orbit-technology.com/api';
const CAN_SWITCH_VIEW = [ROLES.ADMIN, ROLES.TEAM_LEAD, 'admin', 'team_lead'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mca_user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('mca_token') || null);
  const [viewMode, setViewMode] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('mca_user'));
      if (!u) return null;
      return (u.role === ROLES.CLIENT || u.role === 'client') ? 'client' : 'rep';
    } catch { return null; }
  });

  const canSwitchView = user && CAN_SWITCH_VIEW.includes(user.role);

  const login = async (email, password) => {
    // Try real server first
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const sessionUser = {
          id: data.user.id,
          name: data.user.full_name || data.user.name,
          email: data.user.email,
          role: data.user.role,
          repId: data.user.rep_id || null,
          clientId: data.user.client_id || null,
          token: data.token,
        };
        localStorage.setItem('mca_user', JSON.stringify(sessionUser));
        localStorage.setItem('mca_token', data.token);
        setUser(sessionUser);
        setToken(data.token);
        setViewMode((sessionUser.role === 'client') ? 'client' : 'rep');
        return sessionUser;
      }
    } catch {
      // Server offline — fall through to mock
    }

    // Fallback to mock users
    const found = getUserByEmail(email);
    if (!found || found.password !== password) throw new Error('Invalid email or password');
    const sessionUser = { id: found.id, name: found.name, email: found.email, role: found.role, repId: found.repId, clientId: found.clientId };
    localStorage.setItem('mca_user', JSON.stringify(sessionUser));
    setUser(sessionUser);
    setViewMode(sessionUser.role === ROLES.CLIENT ? 'client' : 'rep');
    return sessionUser;
  };

  const logout = () => {
    localStorage.removeItem('mca_user');
    localStorage.removeItem('mca_token');
    setUser(null);
    setToken(null);
    setViewMode(null);
  };

  const switchView = (mode) => { if (canSwitchView) setViewMode(mode); };

  const can = {
    seeAllReps: ['admin', 'team_lead'].includes(user?.role),
    seeAllClients: ['admin', 'team_lead'].includes(user?.role),
    seeClient: (clientId) => {
      if (!user) return false;
      if (user.role === ROLES.ADMIN || user.role === 'admin') return true;
      if (user.role === ROLES.REP || user.role === 'rep') {
        return CLIENTS.some(c => c.id === clientId && c.assignedRepId === user.repId);
      }
      return user.clientId === clientId;
    },
    seeInternalDocs: !['client'].includes(user?.role),
    uploadForClient: !['client'].includes(user?.role),
    requestDocs: !['client'].includes(user?.role),
    managePermissions: user?.role === 'admin',
    reassignClients: ['admin', 'team_lead'].includes(user?.role),
    manageUsers: user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={{ user, token, viewMode, canSwitchView, login, logout, switchView, can }}>
      {children}
    </AuthContext.Provider>
  );
}
