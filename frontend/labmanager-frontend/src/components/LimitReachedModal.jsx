// src/components/LimitReachedModal.jsx
import React from 'react';
import './LimitReachedModal.css';

const LimitReachedModal = ({ 
  isOpen, 
  onClose, 
  limitType, 
  currentPlan, 
  onUpgrade 
}) => {
  if (!isOpen) return null;

  const getLimitInfo = (type) => {
    switch (type) {
      case 'client':
        return {
          icon: '👥',
          title: 'Limite de Clientes Atingido',
          description: 'Você atingiu o limite máximo de clientes para o seu plano atual.',
          action: 'Para cadastrar mais clientes'
        };
      case 'job':
        return {
          icon: '🦷',
          title: 'Limite de Trabalhos Atingido',
          description: 'Você atingiu o limite máximo de trabalhos para este mês.',
          action: 'Para criar mais trabalhos'
        };
      case 'price_table':
        return {
          icon: '💰',
          title: 'Limite de Tabelas Atingido',
          description: 'Você atingiu o limite máximo de tabelas de preços.',
          action: 'Para criar mais tabelas'
        };
      default:
        return {
          icon: '⚠️',
          title: 'Limite Atingido',
          description: 'Você atingiu um limite do seu plano atual.',
          action: 'Para continuar'
        };
    }
  };

  const limitInfo = getLimitInfo(limitType);

  const getUpgradeRecommendation = () => {
    if (currentPlan === 'Plano Gratuito') {
      return {
        plan: 'Básico',
        price: 'R$ 49,90/mês',
        benefits: ['50 clientes', '200 trabalhos/mês', '5 tabelas de preços', 'Relatórios completos']
      };
    } else if (currentPlan === 'Plano Básico') {
      return {
        plan: 'Premium',
        price: 'R$ 99,90/mês',
        benefits: ['Clientes ilimitados', 'Trabalhos ilimitados', 'Tabelas ilimitadas', 'Portal do cliente']
      };
    }
    return null;
  };

  const recommendation = getUpgradeRecommendation();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="limit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="limit-icon">{limitInfo.icon}</div>
          <h2>{limitInfo.title}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <p className="limit-description">{limitInfo.description}</p>
          
          <div className="current-plan-info">
            <span className="plan-label">Plano atual:</span>
            <span className="plan-name">{currentPlan}</span>
          </div>

          {recommendation && (
            <div className="upgrade-recommendation">
              <h3>🚀 {limitInfo.action}, faça upgrade para o Plano {recommendation.plan}</h3>
              
              <div className="upgrade-benefits">
                <div className="price-highlight">
                  <span className="price">{recommendation.price}</span>
                </div>
                
                <ul className="benefits-list">
                  {recommendation.benefits.map((benefit, index) => (
                    <li key={index}>
                      <span className="benefit-icon">✅</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="modal-actions">
                <button className="upgrade-button" onClick={onUpgrade}>
                  🚀 Fazer Upgrade Agora
                </button>
                <button className="cancel-button" onClick={onClose}>
                  Continuar com Plano Atual
                </button>
              </div>
            </div>
          )}

          {!recommendation && (
            <div className="max-plan-info">
              <p>🌟 Você já está no nosso plano mais completo!</p>
              <p>Entre em contato conosco para soluções empresariais personalizadas.</p>
              
              <div className="modal-actions">
                <button className="contact-button" onClick={() => window.open('mailto:suporte@labmanager.com')}>
                  📧 Entrar em Contato
                </button>
                <button className="cancel-button" onClick={onClose}>
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="guarantee-note">
            <span className="guarantee-icon">🛡️</span>
            <span>Garantia de 30 dias - Cancele quando quiser</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LimitReachedModal;

