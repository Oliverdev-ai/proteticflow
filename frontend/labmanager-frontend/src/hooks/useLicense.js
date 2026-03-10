// src/hooks/useLicense.js
import { useState, useEffect, useCallback } from 'react';
import licenseService from '../services/licenseService';

export const useLicense = () => {
  const [licenseData, setLicenseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar dados de licença
  const loadLicenseData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await licenseService.getLimitsStatus();
      setLicenseData(data);
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados de licença');
      console.error('Erro ao carregar licença:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar se pode realizar uma ação
  const checkLimit = useCallback(async (action) => {
    try {
      const result = await licenseService.checkLimit(action);
      return result;
    } catch (err) {
      console.error('Erro ao verificar limite:', err);
      return { can_perform: false, reason: 'Erro na verificação' };
    }
  }, []);

  // Verificar se uma funcionalidade está disponível
  const isFeatureAvailable = useCallback((feature) => {
    if (!licenseData || !licenseData.features) return false;
    return licenseData.features[feature] || false;
  }, [licenseData]);

  // Obter porcentagem de uso
  const getUsagePercentage = useCallback((limitType) => {
    if (!licenseData || !licenseData.limits) return 0;
    const limit = licenseData.limits[limitType];
    if (!limit || !limit.limit) return 0;
    return Math.round((limit.current / limit.limit) * 100);
  }, [licenseData]);

  // Verificar se está próximo do limite
  const isNearLimit = useCallback((limitType, threshold = 80) => {
    const percentage = getUsagePercentage(limitType);
    return percentage >= threshold;
  }, [getUsagePercentage]);

  // Verificar se atingiu o limite
  const hasReachedLimit = useCallback((limitType) => {
    if (!licenseData || !licenseData.limits) return false;
    const limit = licenseData.limits[limitType];
    if (!limit || !limit.limit) return false;
    return limit.current >= limit.limit;
  }, [licenseData]);

  // Atualizar dados automaticamente
  useEffect(() => {
    loadLicenseData();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(loadLicenseData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [loadLicenseData]);

  return {
    licenseData,
    loading,
    error,
    loadLicenseData,
    checkLimit,
    isFeatureAvailable,
    getUsagePercentage,
    isNearLimit,
    hasReachedLimit
  };
};

export default useLicense;

