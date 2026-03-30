import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

import UserManagement from './pages/RepPortal/UserManagement';

import Login from './pages/Login';
import Register from './pages/Register';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Rep / Admin pages
import RepDashboard from './pages/RepPortal/Dashboard';
import RepInfo from './pages/RepPortal/RepInfo';
import ClientsPage from './pages/RepPortal/Clients';
import ClientDetail from './pages/RepPortal/ClientDetail';
import SecureUpload from './pages/RepPortal/SecureUpload';
import DocumentCenter from './pages/RepPortal/DocumentCenter';
import AutoUnderwriting from './pages/RepPortal/Underwriting/AutoUnderwriting';
import Analytics from './pages/RepPortal/Analytics';
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
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-apple-gray9 overflow-hidden">
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
  return (
    <Routes>
      <Route path="/" element={<RepDashboard />} />
      <Route path="/reps" element={<RepInfo />} />
      <Route path="/clients" element={<ClientsPage />} />
      <Route path="/clients/:id" element={<ClientDetail />} />
      <Route path="/upload" element={<SecureUpload />} />
      <Route path="/documents" element={<DocumentCenter />} />
      <Route path="/underwriting" element={<AutoUnderwriting />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/requests" element={<RequestsPage />} />
      <Route path="/notes" element={<NotesPage />} />
      <Route path="/activity" element={<ActivityPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/users" element={<UserManagement />} />
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

function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-apple-gray1 tracking-tight mb-2">Settings</h1>
      <p className="text-apple-gray4 text-sm">Settings panel — coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#fff', color: '#1d1d1f', border: '1px solid #e5e5ea', borderRadius: '12px', fontSize: '13px' },
          }}
        />
        <AppShell />
      </Router>
    </AuthProvider>
  );
}
