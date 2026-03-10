// src/components/withLicenseCheck.jsx
import React from 'react';
import { useLicenseContext } from '../contexts/LicenseContext';
import LimitReachedModal from './LimitReachedModal';

const withLicenseCheck = (WrappedComponent, requiredFeature = null) => {
  return function LicenseProtectedComponent(props) {
    const {
      licenseData,
      loading,
      isFeatureAvailable,
      showLimitModal,
      limitModalData,
      closeLimitModal,
      goToPlans
    } = useLicenseContext();

    // Se está carregando, mostrar loading
    if (loading) {
      return (
        <div className="license-loading">
          <div className="loading-spinner"></div>
          <p>Verificando licença...</p>
        </div>
      );
    }

    // Se não há licença válida
    if (!licenseData) {
      return (
        <div className="license-error">
          <h3>⚠️ Erro de Licenciamento</h3>
          <p>Não foi possível verificar sua licença. Entre em contato com o suporte.</p>
          <button onClick={() => window.location.reload()}>
            Tentar Novamente
          </button>
        </div>
      );
    }

    // Se uma funcionalidade específica é requerida e não está disponível
    if (requiredFeature && !isFeatureAvailable(requiredFeature)) {
      return (
        <div className="feature-unavailable">
          <h3>🚀 Funcionalidade Premium</h3>
          <p>Esta funcionalidade está disponível apenas em planos pagos.</p>
          <button onClick={goToPlans} className="upgrade-button">
            Ver Planos
          </button>
        </div>
      );
    }

    return (
      <>
        <WrappedComponent {...props} />
        
        {/* Modal de limite atingido */}
        <LimitReachedModal
          isOpen={showLimitModal}
          onClose={closeLimitModal}
          limitType={limitModalData.limitType}
          currentPlan={limitModalData.currentPlan}
          onUpgrade={goToPlans}
        />
      </>
    );
  };
};

export default withLicenseCheck;

