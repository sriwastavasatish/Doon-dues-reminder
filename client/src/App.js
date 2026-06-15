import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Campaigns from './pages/Campaigns';
import Send from './pages/Send';
import Users from './pages/Users';
import Reports from './pages/Reports';
import './index.css';

function ProtectedRoute({ children, adminOnly }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>📱</div>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--primary)' }}>Doon Dues Reminder</div>
        <div style={{ fontSize:13, color:'var(--text3)', marginTop:6 }}>Loading...</div>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><AppLayout><Students /></AppLayout></ProtectedRoute>} />
      <Route path="/campaigns" element={<ProtectedRoute adminOnly><AppLayout><Campaigns /></AppLayout></ProtectedRoute>} />
      <Route path="/send" element={<ProtectedRoute><AppLayout><Send /></AppLayout></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute adminOnly><AppLayout><Users /></AppLayout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ style: { borderRadius:10, fontFamily:'var(--font-body)', fontSize:13, fontWeight:600 }, success: { iconTheme: { primary:'#10B981', secondary:'white' } } }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
