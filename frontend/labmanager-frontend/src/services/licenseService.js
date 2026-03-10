// src/services/licenseService.js
import api from './api';

class LicenseService {
  // Obter licença atual
  async getCurrentLicense() {
    try {
      const response = await api.get('/api/v1/licensing/licenses/current/');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter licença atual:', error);
      throw error;
    }
  }

  // Obter status dos limites
  async getLimitsStatus() {
    try {
      const response = await api.get('/api/v1/licensing/licenses/limits/');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter status dos limites:', error);
      throw error;
    }
  }

  // Verificar se pode realizar uma ação
  async checkLimit(action) {
    try {
      const response = await api.post('/api/v1/licensing/licenses/check_limit/', {
        action: action
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao verificar limite:', error);
      throw error;
    }
  }

  // Obter planos disponíveis
  async getAvailablePlans() {
    try {
      const response = await api.get('/api/v1/licensing/plans/');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter planos:', error);
      throw error;
    }
  }

  // Simular upgrade de plano
  async upgradePlan(licenseId, planName) {
    try {
      const response = await api.post(`/api/v1/licensing/licenses/${licenseId}/upgrade_plan/`, {
        plan: planName
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao fazer upgrade:', error);
      throw error;
    }
  }

  // Verificar se uma funcionalidade está disponível
  isFeatureAvailable(feature, licenseData) {
    if (!licenseData || !licenseData.features) return false;
    return licenseData.features[feature] || false;
  }

  // Calcular porcentagem de uso
  getUsagePercentage(current, limit) {
    if (!limit) return 0; // Ilimitado
    return Math.round((current / limit) * 100);
  }

  // Verificar se está próximo do limite
  isNearLimit(current, limit, threshold = 80) {
    if (!limit) return false; // Ilimitado
    const percentage = this.getUsagePercentage(current, limit);
    return percentage >= threshold;
  }

  // Verificar se atingiu o limite
  hasReachedLimit(current, limit) {
    if (!limit) return false; // Ilimitado
    return current >= limit;
  }
}

export default new LicenseService();

