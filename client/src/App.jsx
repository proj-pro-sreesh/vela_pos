import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './context/AuthContext';

// Layout
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Tables from './pages/Tables';
import Biller from './pages/Biller';
import Admin from './pages/Admin';
import QuickOrderBill from './pages/QuickOrderBill';
import MenuManagement from './pages/admin/MenuManagement';
import UserManagement from './pages/admin/UserManagement';
import TableManagement from './pages/admin/TableManagement';
import Settings from './pages/admin/Settings';
import Reports from './pages/admin/Reports';
import VendorDashboard from './pages/VendorDashboard';

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Role-based redirect
const RoleRedirect = () => {
  const { user } = useAuth();
  
  switch (user?.role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'biller':
      return <Navigate to="/biller" replace />;
    default:
      return <Navigate to="/tables" replace />;
  }
};

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
      />

      {/* Protected routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<RoleRedirect />} />
        
        {/* All authenticated users */}
        <Route 
          path="tables" 
          element={
            <ProtectedRoute>
              <Tables />
            </ProtectedRoute>
          } 
        />
        
        {/* POS - Redirect to Tables (features integrated) */}
        <Route 
          path="pos" 
          element={<Navigate to="/tables" replace />} 
        />
        
        {/* Biller Dashboard */}
        <Route 
          path="biller" 
          element={
            <ProtectedRoute roles={['admin', 'biller']}>
              <Biller />
            </ProtectedRoute>
          } 
        />
        
        {/* Quick Order & Bill Dashboard */}
        <Route 
          path="quick-order" 
          element={
            <ProtectedRoute roles={['admin', 'biller']}>
              <QuickOrderBill />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Dashboard */}
        <Route 
          path="admin" 
          element={
            <ProtectedRoute roles={['admin']}>
              <Admin />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin sub-routes */}
        <Route 
          path="admin/menu" 
          element={
            <ProtectedRoute roles={['admin']}>
              <MenuManagement />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="admin/users" 
          element={
            <ProtectedRoute roles={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="admin/tables" 
          element={
            <ProtectedRoute roles={['admin']}>
              <TableManagement />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="admin/settings" 
          element={
            <ProtectedRoute roles={['admin']}>
              <Settings />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="admin/reports" 
          element={
            <ProtectedRoute roles={['admin']}>
              <Reports />
            </ProtectedRoute>
          } 
        />
        
        {/* Vendor Dashboard - accessible to admin and biller */}
        <Route 
          path="vendors" 
          element={
            <ProtectedRoute roles={['admin', 'biller']}>
              <VendorDashboard />
            </ProtectedRoute>
          } 
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
