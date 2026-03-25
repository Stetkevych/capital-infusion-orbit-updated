import React, { createContext, useContext, useState } from 'react';
import { ROLES, CLIENTS, getUserByEmail } from '../data/mockData';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

const CAN_SWITCH_VIEW = [ROLES.ADMIN];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('mca_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [viewMode, setViewMode] = useState(() => {
    try {
      const stored = localStorage.getItem('mca_user');
      const u = stored ? JSON.parse(stored) : null;
      if (!u) return null;
      return u.role === ROLES.CLIENT ? 'client' : 'rep';
    } catch { return null; }
  });

  const canSwitchView = user && CAN_SWITCH_VIEW.includes(user.role);

  const login = (email, password) => {
    const found = getUserByEmail(email);
    if (!found || found.password !== password) {
      throw new Error('Invalid email or password');
    }
    const sessionUser = {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      repId: found.repId,
      clientId: found.clientId,
    };
    localStorage.setItem('mca_user', JSON.stringify(sessionUser));
    setUser(sessionUser);
    setViewMode(sessionUser.role === ROLES.CLIENT ? 'client' : 'rep');
    return sessionUser;
  };

  const logout = () => {
    localStorage.removeItem('mca_user');
    setUser(null);
    setViewMode(null);
  };

  const switchView = (mode) => {
    if (canSwitchView) setViewMode(mode);
  };

  const can = {
    seeAllReps: user?.role === ROLES.ADMIN,
    seeAllClients: user?.role === ROLES.ADMIN,
    seeClient: (clientId) => {
      if (!user) return false;
      if (user.role === ROLES.ADMIN) return true;
      if (user.role === ROLES.REP) {
        return CLIENTS.some(c => c.id === clientId && c.assignedRepId === user.repId);
      }
      return user.clientId === clientId;
    },
    seeInternalDocs: user?.role !== ROLES.CLIENT,
    uploadForClient: user?.role !== ROLES.CLIENT,
    requestDocs: user?.role !== ROLES.CLIENT,
    managePermissions: user?.role === ROLES.ADMIN,
    reassignClients: user?.role === ROLES.ADMIN,
  };

  return (
    <AuthContext.Provider value={{ user, viewMode, canSwitchView, login, logout, switchView, can }}>
      {children}
    </AuthContext.Provider>
  );
}
