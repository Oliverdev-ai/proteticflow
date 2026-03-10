import axios from 'axios';
import logger from '../utils/logger.js';

// Exportando API_URL para uso em outros serviços
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
export const TOKEN_URL = import.meta.env.VITE_TOKEN_URL || 'http://localhost:8000/api/token/';

// Configuração do axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar o token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Serviço de autenticação
export const authService = {
  login: async (credentials) => {
    const startTime = performance.now();
    
    try {
      logger.auth('login_attempt', { username: credentials.username });
      
      const response = await axios.post(TOKEN_URL, credentials);
      
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      
      // Criar dados básicos do usuário baseado no username
      const userData = {
        username: credentials.username,
        is_authenticated: true
      };
      localStorage.setItem('user_data', JSON.stringify(userData));
      
      const endTime = performance.now();
      logger.performance('login_duration', endTime - startTime);
      logger.auth('login_success', { username: credentials.username });
      
      return {
        access: response.data.access,
        refresh: response.data.refresh,
        user: userData
      };
    } catch (error) {
      const endTime = performance.now();
      logger.performance('login_duration', endTime - startTime);
      logger.error('Login failed', {
        username: credentials.username,
        error: error.message,
        status: error.response?.status
      });
      throw error;
    }
  },
  logout: () => {
    const userData = authService.getCurrentUser();
    const username = userData?.username || 'unknown';
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    
    logger.auth('logout_success', { username });
  },
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },
  getCurrentUser: () => {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  },
  getUserPermissions: async () => {
    try {
      const response = await api.get('/permissions/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  createCollaborator: async (collaboratorData) => {
    try {
      const response = await api.post('/collaborators/', collaboratorData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Serviço de clientes
export const clientService = {
  getAll: async () => {
    try {
      const response = await api.get('/clients/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/clients/${id}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  create: async (client) => {
    try {
      const response = await api.post('/clients/', client);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  update: async (id, client) => {
    try {
      const response = await api.put(`/clients/${id}/`, client);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  delete: async (id) => {
    try {
      await api.delete(`/clients/${id}/`);
      return true;
    } catch (error) {
      throw error;
    }
  }
};

// Serviço de tabelas de preços
export const priceTableService = {
  getAll: async () => {
    try {
      const response = await api.get('/price-tables/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/price-tables/${id}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  create: async (priceTable) => {
    try {
      const response = await api.post('/price-tables/', priceTable);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  update: async (id, priceTable) => {
    try {
      const response = await api.put(`/price-tables/${id}/`, priceTable);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  delete: async (id) => {
    try {
      await api.delete(`/price-tables/${id}/`);
      return true;
    } catch (error) {
      throw error;
    }
  }
};

// Serviço de itens de serviço
export const serviceItemService = {
  getAll: async () => {
    try {
      const response = await api.get('/service-items/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/service-items/${id}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  create: async (serviceItem) => {
    try {
      const response = await api.post('/service-items/', serviceItem);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  update: async (id, serviceItem) => {
    try {
      const response = await api.put(`/service-items/${id}/`, serviceItem);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  delete: async (id) => {
    try {
      await api.delete(`/service-items/${id}/`);
      return true;
    } catch (error) {
      throw error;
    }
  }
};

// Serviço de trabalhos
export const jobService = {
  getAll: async () => {
    try {
      const response = await api.get('/jobs/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/jobs/${id}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  create: async (job) => {
    try {
      const response = await api.post('/jobs/', job);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  update: async (id, job) => {
    try {
      const response = await api.put(`/jobs/${id}/`, job);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  delete: async (id) => {
    try {
      await api.delete(`/jobs/${id}/`);
      return true;
    } catch (error) {
      throw error;
    }
  },
  uploadPhoto: async (jobId, formData) => {
    try {
      // Configuração especial para upload de arquivos
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      };
      const response = await axios.post(`${API_URL}/job-photos/`, formData, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default api;

// Serviço do assistente de IA
export const aiAssistantService = {
  sendMessage: async (message, sessionId = null) => {
    try {
      const payload = { message };
      if (sessionId) {
        payload.session_id = sessionId;
      }
      const response = await api.post('/ai-assistant/chat/', payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getAvailableCommands: async () => {
    try {
      const response = await api.get('/ai-assistant/available-commands/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getSessions: async () => {
    try {
      const response = await api.get('/ai-assistant/sessions/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getSessionMessages: async (sessionId) => {
    try {
      const response = await api.get(`/ai-assistant/sessions/${sessionId}/messages/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  quickCommand: async (command) => {
    try {
      const response = await api.post('/ai-assistant/quick-command/', { command });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

