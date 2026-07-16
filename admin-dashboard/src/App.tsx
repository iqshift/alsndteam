import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SearchProvider } from './hooks/useSearch';
import Layout from './components/common/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import OrdersPage from './pages/OrdersPage';
import ZonesPage from './pages/ZonesPage';
import DriversPage from './pages/DriversPage';
import TrackingPage from './pages/TrackingPage';
import RestaurantsPage from './pages/RestaurantsPage';
import RestaurantDetailPage from './pages/RestaurantDetailPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import WalletPage from './pages/WalletPage';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import SupportPage from './pages/SupportPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogPage from './pages/AuditLogPage';
import SettingsPage from './pages/SettingsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import DeleteAccountPage from './pages/DeleteAccountPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">جاري التحميل...</div>;
  if (!user) return <Navigate to="/home" />;
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/home" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfUsePage />} />
            <Route path="/delete-account" element={<DeleteAccountPage />} />
            <Route path="/delate-account" element={<DeleteAccountPage />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<OrdersPage />} />
              <Route path="zones" element={<ZonesPage />} />
              <Route path="drivers" element={<DriversPage />} />
              <Route path="tracking" element={<TrackingPage />} />
              <Route path="restaurants" element={<RestaurantsPage />} />
              <Route path="restaurants/:id" element={<RestaurantDetailPage />} />
              <Route path="subscriptions" element={<SubscriptionsPage />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="employees/:id" element={<EmployeeDetailPage />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="audit" element={<AuditLogPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="/tracking-fullscreen" element={<ProtectedRoute><TrackingPage fullscreen={true} /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/home" />} />
          </Routes>
        </BrowserRouter>
      </SearchProvider>
    </AuthProvider>
  );
}

export default App;
