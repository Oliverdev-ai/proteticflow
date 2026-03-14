import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { LicenseProvider } from './contexts/LicenseContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ClientFormPage from './pages/ClientFormPage';
import JobsPage from './pages/JobsPage';
import JobFormPage from './pages/JobFormPage';
import DeliverySchedulePage from './pages/DeliverySchedulePage';
import FinancialClosingPage from './pages/FinancialClosingPage';
import FinancialReportsPage from './pages/FinancialReportsPage';
import PayersReportPage from './pages/PayersReportPage';
import SuppliersPage from './pages/SuppliersPage';
import LabSettingsPage from './pages/LabSettingsPage';
import PlansPage from './pages/PlansPage';
import SettingsPage from './pages/SettingsPage';
import PrivateRoute from './components/layout/PrivateRoute';
import AIAssistant from './components/ai/AIAssistant';
import { Toaster } from './components/ui/toaster';
import { useAuth } from './contexts/AuthContext';
import './App.css';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [isAIOpen, setIsAIOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Rota pública */}
        <Route path="/login" element={
          user ? <Navigate to="/dashboard" /> : <LoginPage />
        } />

        {/* Rotas protegidas */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<PrivateRoute module="dashboard"><DashboardPage /></PrivateRoute>} />
          <Route path="clients" element={<PrivateRoute module="clients"><ClientsPage /></PrivateRoute>} />
          <Route path="clients/new" element={<PrivateRoute module="clients"><ClientFormPage /></PrivateRoute>} />
          <Route path="clients/:id" element={<PrivateRoute module="clients"><ClientFormPage /></PrivateRoute>} />
          <Route path="jobs" element={<PrivateRoute module="jobs"><JobsPage /></PrivateRoute>} />
          <Route path="jobs/new" element={<PrivateRoute module="jobs"><JobFormPage /></PrivateRoute>} />
          <Route path="jobs/:id" element={<PrivateRoute module="jobs"><JobFormPage /></PrivateRoute>} />
          <Route path="jobs/:id/edit" element={<PrivateRoute module="jobs"><JobFormPage /></PrivateRoute>} />
          <Route path="delivery-schedule" element={<PrivateRoute module="jobs"><DeliverySchedulePage /></PrivateRoute>} />
          <Route path="financial-closing" element={<PrivateRoute module="financial"><FinancialClosingPage /></PrivateRoute>} />
          <Route path="pricing" element={<PrivateRoute module="pricing"><PlansPage /></PrivateRoute>} />
          <Route path="financial-reports" element={<PrivateRoute module="financial"><FinancialReportsPage /></PrivateRoute>} />
          <Route path="payers-report" element={<PrivateRoute module="financial"><PayersReportPage /></PrivateRoute>} />
          <Route path="suppliers" element={<PrivateRoute module="materials"><SuppliersPage /></PrivateRoute>} />
          <Route path="lab-settings" element={<SettingsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Redirecionar para login se não estiver autenticado */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>

      {/* Assistente de IA */}
      {user && (
        <AIAssistant
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
          onOpen={() => setIsAIOpen(true)}
        />
      )}

      <Toaster />
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <LicenseProvider>
        <AppContent />
      </LicenseProvider>
    </AuthProvider>
  );
}

export default App;
