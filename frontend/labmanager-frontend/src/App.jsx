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
import LabSettingsPage from './pages/LabSettingsPage';
import PlansPage from './pages/PlansPage';
import CollaboratorManagementPage from './pages/CollaboratorManagementPage';
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
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/new" element={<ClientFormPage />} />
          <Route path="clients/:id" element={<ClientFormPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/new" element={<JobFormPage />} />
          <Route path="jobs/:id" element={<JobFormPage />} />
          <Route path="jobs/:id/edit" element={<JobFormPage />} />
          <Route path="delivery-schedule" element={<DeliverySchedulePage />} />
          <Route path="financial-closing" element={<FinancialClosingPage />} />
          <Route path="lab-settings" element={<LabSettingsPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="collaborators" element={<CollaboratorManagementPage />} />
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
