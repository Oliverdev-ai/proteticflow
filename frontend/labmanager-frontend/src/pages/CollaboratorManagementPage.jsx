import React from 'react';
import CollaboratorManagement from '../components/admin/CollaboratorManagement';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const CollaboratorManagementPage = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Colaboradores</h1>
        <p className="text-gray-600 mt-2">
          Cadastre novos colaboradores com permissões limitadas para auxiliar nas operações do laboratório.
        </p>
      </div>
      
      <CollaboratorManagement />
    </div>
  );
};

export default CollaboratorManagementPage;

