// src/components/LicenseIndicator.jsx
import React, { useState, useEffect } from 'react';
import licenseService from '../services/licenseService';
import './LicenseIndicator.css';

const LicenseIndicator = () => {
  const [licenseData, setLicenseData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLicenseData();
  }, []);

  const loadLicenseData = async () => {
    try {
      const data = await licenseService.getLimitsStatus();
      setLicenseData(data);
    } catch (error) {
      console.error('Erro ao carregar dados de licença:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressBarColor = (percentage) => {
    if (percentage >= 90) return '#ef4444'; // Vermelho
    if (percentage >= 70) return '#f59e0b'; // Amarelo
    return '#10b981'; // Verde
  };

  const formatLimit = (limit) => {
    return limit === null ? 'Ilimitado' : limit.toString();
  };

  if (loading) {
    return (
      <div className="license-indicator loading">
        <div className="loading-spinner"></div>
        <span>Carregando informações de licença...</span>
      </div>
    );
  }

  if (!licenseData) {
    return (
      <div className="license-indicator error">
        <span>⚠️ Erro ao carregar licença</span>
      </div>
    );
  }

  return (
    <div className="license-indicator">
      <div className="license-header">
        <h3>📋 {licenseData.plan}</h3>
        <span className={`status ${licenseData.status.toLowerCase()}`}>
          {licenseData.status === 'ACTIVE' ? '✅ Ativa' : '❌ Inativa'}
        </span>
      </div>

      <div className="limits-grid">
        {/* Clientes */}
        <div className="limit-item">
          <div className="limit-header">
            <span className="limit-icon">👥</span>
            <span className="limit-title">Clientes</span>
          </div>
          <div className="limit-usage">
            <span className="usage-text">
              {licenseData.limits.clients.current} / {formatLimit(licenseData.limits.clients.limit)}
            </span>
            {licenseData.limits.clients.limit && (
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{
                    width: `${licenseData.limits.clients.percentage}%`,
                    backgroundColor: getProgressBarColor(licenseData.limits.clients.percentage)
                  }}
                ></div>
              </div>
            )}
          </div>
        </div>

        {/* Trabalhos */}
        <div className="limit-item">
          <div className="limit-header">
            <span className="limit-icon">🦷</span>
            <span className="limit-title">Trabalhos/Mês</span>
          </div>
          <div className="limit-usage">
            <span className="usage-text">
              {licenseData.limits.jobs.current} / {formatLimit(licenseData.limits.jobs.limit)}
            </span>
            {licenseData.limits.jobs.limit && (
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{
                    width: `${licenseData.limits.jobs.percentage}%`,
                    backgroundColor: getProgressBarColor(licenseData.limits.jobs.percentage)
                  }}
                ></div>
              </div>
            )}
          </div>
        </div>

        {/* Tabelas de Preços */}
        <div className="limit-item">
          <div className="limit-header">
            <span className="limit-icon">💰</span>
            <span className="limit-title">Tabelas</span>
          </div>
          <div className="limit-usage">
            <span className="usage-text">
              {licenseData.limits.price_tables.current} / {formatLimit(licenseData.limits.price_tables.limit)}
            </span>
            {licenseData.limits.price_tables.limit && (
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{
                    width: `${licenseData.limits.price_tables.percentage}%`,
                    backgroundColor: getProgressBarColor(licenseData.limits.price_tables.percentage)
                  }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Funcionalidades */}
      <div className="features-section">
        <h4>🚀 Funcionalidades</h4>
        <div className="features-grid">
          <div className={`feature-item ${licenseData.features.advanced_reports ? 'enabled' : 'disabled'}`}>
            <span>{licenseData.features.advanced_reports ? '✅' : '❌'}</span>
            <span>Relatórios Avançados</span>
          </div>
          <div className={`feature-item ${licenseData.features.client_portal ? 'enabled' : 'disabled'}`}>
            <span>{licenseData.features.client_portal ? '✅' : '❌'}</span>
            <span>Portal do Cliente</span>
          </div>
          <div className={`feature-item ${licenseData.features.api_access ? 'enabled' : 'disabled'}`}>
            <span>{licenseData.features.api_access ? '✅' : '❌'}</span>
            <span>Acesso à API</span>
          </div>
          <div className={`feature-item ${licenseData.features.priority_support ? 'enabled' : 'disabled'}`}>
            <span>{licenseData.features.priority_support ? '✅' : '❌'}</span>
            <span>Suporte Prioritário</span>
          </div>
        </div>
      </div>

      {licenseData.plan !== 'Plano Premium' && (
        <div className="upgrade-section">
          <button className="upgrade-button" onClick={() => window.location.href = '/plans'}>
            🚀 Fazer Upgrade
          </button>
        </div>
      )}
    </div>
  );
};

export default LicenseIndicator;

