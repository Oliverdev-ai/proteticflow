// src/pages/PlansPage.jsx
import React, { useState, useEffect } from 'react';
import licenseService from '../services/licenseService';
import './PlansPage.css';

const PlansPage = () => {
  const [plans, setPlans] = useState([]);
  const [currentLicense, setCurrentLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansData, licenseData] = await Promise.all([
        licenseService.getAvailablePlans(),
        licenseService.getLimitsStatus()
      ]);
      setPlans(plansData.results || plansData);
      setCurrentLicense(licenseData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planName) => {
    if (!currentLicense) return;
    
    setUpgrading(true);
    try {
      // Em produção, aqui seria integrado com gateway de pagamento
      const result = await licenseService.upgradePlan(currentLicense.id, planName);
      alert(`✅ ${result.message}`);
      await loadData(); // Recarregar dados
    } catch (error) {
      alert('❌ Erro ao fazer upgrade. Tente novamente.');
      console.error('Erro no upgrade:', error);
    } finally {
      setUpgrading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatLimit = (limit) => {
    return limit === null ? 'Ilimitado' : limit.toString();
  };

  const getPlanIcon = (planName) => {
    switch (planName) {
      case 'FREE': return '🆓';
      case 'BASIC': return '💼';
      case 'PREMIUM': return '🚀';
      default: return '📋';
    }
  };

  const getPlanColor = (planName) => {
    switch (planName) {
      case 'FREE': return '#10b981';
      case 'BASIC': return '#3b82f6';
      case 'PREMIUM': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const isCurrentPlan = (planName) => {
    return currentLicense && currentLicense.plan.includes(planName);
  };

  if (loading) {
    return (
      <div className="plans-page loading">
        <div className="loading-spinner"></div>
        <h2>Carregando planos...</h2>
      </div>
    );
  }

  return (
    <div className="plans-page">
      <div className="plans-header">
        <h1>🚀 Escolha seu Plano</h1>
        <p>Selecione o plano ideal para o seu laboratório</p>
        {currentLicense && (
          <div className="current-plan-info">
            <span>Plano atual: <strong>{currentLicense.plan}</strong></span>
          </div>
        )}
      </div>

      <div className="plans-grid">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`plan-card ${isCurrentPlan(plan.name) ? 'current' : ''} ${plan.name.toLowerCase()}`}
            style={{ borderColor: getPlanColor(plan.name) }}
          >
            <div className="plan-header">
              <div className="plan-icon" style={{ color: getPlanColor(plan.name) }}>
                {getPlanIcon(plan.name)}
              </div>
              <h3>{plan.display_name}</h3>
              <p className="plan-description">{plan.description}</p>
            </div>

            <div className="plan-pricing">
              <div className="price-monthly">
                <span className="price">{formatPrice(plan.price_monthly)}</span>
                <span className="period">/mês</span>
              </div>
              {plan.price_yearly > 0 && (
                <div className="price-yearly">
                  <span className="price-small">{formatPrice(plan.price_yearly)}/ano</span>
                  <span className="savings">
                    (Economize {Math.round((1 - (plan.price_yearly / (plan.price_monthly * 12))) * 100)}%)
                  </span>
                </div>
              )}
            </div>

            <div className="plan-features">
              <h4>📋 Limites</h4>
              <ul>
                <li>
                  <span className="feature-icon">👥</span>
                  <span>Clientes: {formatLimit(plan.max_clients)}</span>
                </li>
                <li>
                  <span className="feature-icon">🦷</span>
                  <span>Trabalhos/mês: {formatLimit(plan.max_jobs_per_month)}</span>
                </li>
                <li>
                  <span className="feature-icon">💰</span>
                  <span>Tabelas de preços: {formatLimit(plan.max_price_tables)}</span>
                </li>
                <li>
                  <span className="feature-icon">👤</span>
                  <span>Usuários: {plan.max_users}</span>
                </li>
              </ul>

              <h4>🚀 Funcionalidades</h4>
              <ul>
                <li className={plan.has_advanced_reports ? 'enabled' : 'disabled'}>
                  <span className="feature-icon">{plan.has_advanced_reports ? '✅' : '❌'}</span>
                  <span>Relatórios Avançados</span>
                </li>
                <li className={plan.has_client_portal ? 'enabled' : 'disabled'}>
                  <span className="feature-icon">{plan.has_client_portal ? '✅' : '❌'}</span>
                  <span>Portal do Cliente</span>
                </li>
                <li className={plan.has_api_access ? 'enabled' : 'disabled'}>
                  <span className="feature-icon">{plan.has_api_access ? '✅' : '❌'}</span>
                  <span>Acesso à API</span>
                </li>
                <li className={plan.has_priority_support ? 'enabled' : 'disabled'}>
                  <span className="feature-icon">{plan.has_priority_support ? '✅' : '❌'}</span>
                  <span>Suporte Prioritário</span>
                </li>
              </ul>
            </div>

            <div className="plan-action">
              {isCurrentPlan(plan.name) ? (
                <button className="plan-button current" disabled>
                  ✅ Plano Atual
                </button>
              ) : (
                <button 
                  className="plan-button"
                  style={{ backgroundColor: getPlanColor(plan.name) }}
                  onClick={() => handleUpgrade(plan.name)}
                  disabled={upgrading}
                >
                  {upgrading ? '⏳ Processando...' : 
                   plan.name === 'FREE' ? '🆓 Usar Gratuito' : '🚀 Fazer Upgrade'}
                </button>
              )}
            </div>

            {plan.name === 'PREMIUM' && (
              <div className="plan-badge">
                <span>🌟 Mais Popular</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="plans-footer">
        <div className="guarantee">
          <h3>🛡️ Garantia de 30 dias</h3>
          <p>Não ficou satisfeito? Devolvemos seu dinheiro em até 30 dias.</p>
        </div>
        
        <div className="support">
          <h3>💬 Precisa de ajuda?</h3>
          <p>Entre em contato conosco: <a href="mailto:suporte@labmanager.com">suporte@labmanager.com</a></p>
        </div>
      </div>
    </div>
  );
};

export default PlansPage;

