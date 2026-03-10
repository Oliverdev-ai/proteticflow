// src/contexts/LicenseContext.jsx
import React, { createContext, useContext, useState } from 'react';
import useLicense from '../hooks/useLicense';

const LicenseContext = createContext();

export const LicenseProvider = ({ children }) => {
  const license = useLicense();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalData, setLimitModalData] = useState({});

  // Função para verificar limite antes de uma ação
  const checkAndProceed = async (action, onSuccess, onLimitReached) => {
    try {
      const result = await license.checkLimit(action);
      
      if (result.can_perform) {
        // Pode realizar a ação
        if (onSuccess) onSuccess();
        return true;
      } else {
        // Limite atingido
        setLimitModalData({
          limitType: action,
          currentPlan: license.licenseData?.plan || 'Plano Gratuito',
          reason: result.reason
        });
        setShowLimitModal(true);
        
        if (onLimitReached) onLimitReached(result);
        return false;
      }
    } catch (error) {
      console.error('Erro ao verificar limite:', error);
      return false;
    }
  };

  // Função para fechar modal de limite
  const closeLimitModal = () => {
    setShowLimitModal(false);
    setLimitModalData({});
  };

  // Função para ir para página de planos
  const goToPlans = () => {
    closeLimitModal();
    window.location.href = '/plans';
  };

  const value = {
    ...license,
    showLimitModal,
    limitModalData,
    checkAndProceed,
    closeLimitModal,
    goToPlans
  };

  return (
    <LicenseContext.Provider value={value}>
      {children}
    </LicenseContext.Provider>
  );
};

export const useLicenseContext = () => {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicenseContext deve ser usado dentro de LicenseProvider');
  }
  return context;
};

export default LicenseContext;

