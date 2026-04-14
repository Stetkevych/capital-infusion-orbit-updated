import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

import UserManagement from './pages/RepPortal/UserManagement';

import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
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
import DealLog from './pages/RepPortal/DealLog';
import CommissionCalculator from './pages/RepPortal/CommissionCalculator';
import HelpPage from './pages/RepPortal/Help';
import Analytics from './pages/RepPortal/Analytics';
import RequestsPage from './pages/RepPortal/Requests';
import NotesPage from './pages/RepPortal/Notes';
import ActivityPage from './pages/RepPortal/Activity';
import Training from './pages/RepPortal/Training';
import CILoc from './pages/RepPortal/CILoc';
import ClientData from './pages/RepPortal/ClientData';

// Client pages
import ClientDashboard from './pages/ClientPortal/Dashboard';
import MyDocuments from './pages/ClientPortal/MyDocuments';
import UploadCenter from './pages/ClientPortal/UploadCenter';
import ClientRequests from './pages/ClientPortal/Requests';
import ClientStatus from './pages/ClientPortal/Status';
import ClientProfile from './pages/ClientPortal/Profile';
import MyBusinesses from './pages/ClientPortal/MyBusinesses';
import ClientCredentials from './pages/RepPortal/ClientCredentials';

function AppShell() {
  const { user, viewMode } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
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
      <Route path="/deals" element={<DealLog />} />
      <Route path="/commissions" element={<CommissionCalculator />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/requests" element={<RequestsPage />} />
      <Route path="/notes" element={<NotesPage />} />
      <Route path="/activity" element={<ActivityPage />} />
      <Route path="/training" element={<Training />} />
      <Route path="/ci-loc" element={<CILoc />} />
      <Route path="/client-data" element={<ClientData />} />
      <Route path="/my-orbit" element={<MyOrbitPage />} />
      <Route path="/users" element={<UserManagement />} />
      <Route path="/client-credentials" element={<ClientCredentials />} />
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
      <Route path="/businesses" element={<MyBusinesses />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function MyOrbitPage() {
  const { user } = useAuth();
  const [pic, setPic] = useState(localStorage.getItem('orbit_pic') || '');
  const handlePic = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const url = ev.target.result; setPic(url); localStorage.setItem('orbit_pic', url); };
    reader.readAsDataURL(file);
  };
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">My Orbit</h1>
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-2xl overflow-hidden">
            {pic ? <img src={pic} alt="" className="w-full h-full object-cover" /> : (user?.name?.[0] || '?')}
          </div>
          <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
            <span className="text-white text-xs">✎</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePic} />
          </label>
        </div>
        <div>
          <p className="text-gray-900 font-semibold text-lg">{user?.name}</p>
          <p className="text-gray-400 text-sm">{user?.email}</p>
          <p className="text-gray-500 text-xs mt-1 capitalize">{user?.email === 'matthew@capital-infusion.com' ? 'CEO' : user?.role} · Active</p>
        </div>
      </div>
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
