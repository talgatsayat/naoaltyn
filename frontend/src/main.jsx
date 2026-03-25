import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './i18n';
import './styles/variables.css';
import { AuthProvider } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Apply from './pages/Apply';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminApplicationDetail from './pages/admin/AdminApplicationDetail';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/applications/:id" element={<AdminApplicationDetail />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);
