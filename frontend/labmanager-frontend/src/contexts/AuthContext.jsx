import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (authService.isAuthenticated()) {
        const userData = authService.getCurrentUser();
        setUser(userData);
        
        // Busca permissões do usuário
        const perms = await authService.getUserPermissions();
        setPermissions(perms);
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      
      // Busca permissões após login
      const perms = await authService.getUserPermissions();
      setPermissions(perms);
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setPermissions(null);
  };

  const isAdmin = () => {
    return permissions?.is_admin || false;
  };

  const isCollaborator = () => {
    return permissions?.is_collaborator || false;
  };

  const canAccessFinancialReports = () => {
    return permissions?.can_access_financial_reports || false;
  };

  const canModifySettings = () => {
    return permissions?.can_modify_settings || false;
  };

  const canDeleteRecords = () => {
    return permissions?.can_delete_records || false;
  };

  const canAccessAIAssistant = () => {
    return permissions?.can_access_ai_assistant || false;
  };

  const canUseAIForReports = () => {
    return permissions?.can_use_ai_for_reports || false;
  };

  const value = {
    user,
    permissions,
    isLoading,
    login,
    logout,
    isAdmin,
    isCollaborator,
    canAccessFinancialReports,
    canModifySettings,
    canDeleteRecords,
    canAccessAIAssistant,
    canUseAIForReports,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

