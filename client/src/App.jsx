import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

import Login from './pages/Login';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Rep / Admin pages
import RepDashboard from './pages/RepPortal/Dashboard';
import RepsPage from './pages/RepPortal/Reps';
import ClientsPage from './pages/RepPortal/Clients';
import ClientDetail from './pages/RepPortal/ClientDetail';
import DocumentCenter from './pages/RepPortal/DocumentCenter';
import RequestsPage from './pages/RepPortal/Requests';
import NotesPage from './pages/RepPortal/Notes';
import ActivityPage from './pages/RepPortal/Activity';

// Client pages
import ClientDashboard from './pages/ClientPortal/Dashboard';
import MyDocuments from './pages/ClientPortal/MyDocuments';
import UploadCenter from './pages/ClientPortal/UploadCenter';
import ClientRequests from './pages/ClientPortal/Requests';
import ClientStatus from './pages/ClientPortal/Status';
import ClientProfile from './pages/ClientPortal/Profile';

function AppShell() {
  const { user, viewMode } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          {viewMode === 'client' ? <ClientRoutes /> : <RepRoutes />}
        </main>
      </div>
    </div>
  );
}

function RepRoutes() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  return (
    <Routes>
      <Route path="/" element={<RepDashboard />} />
      {isAdmin && <Route path="/reps" element={<RepsPage />} />}
      <Route path="/clients" element={<ClientsPage />} />
      <Route path="/clients/:id" element={<ClientDetail />} />
      <Route path="/documents" element={<DocumentCenter />} />
      <Route path="/requests" element={<RequestsPage />} />
      <Route path="/notes" element={<NotesPage />} />
      <Route path="/activity" element={<ActivityPage />} />
      <Route path="/settings" element={<SettingsPlaceholder />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ClientRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ClientDashboard />} />
      <Route path="/my-documents" element={<MyDocuments />} />
      <Route path="/upload" element={<UploadCenter />} />
      <Route path="/requests" element={<ClientRequests />} />
      <Route path="/status" element={<ClientStatus />} />
      <Route path="/profile" element={<ClientProfile />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function SettingsPlaceholder() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-white mb-2">Settings</h1>
      <p className="text-slate-400 text-sm">Settings panel — coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' } }} />
        <AppShell />
      </Router>
    </AuthProvider>
  );
}
