import axios from 'axios';
import { API_URL } from './api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const deliveryService = {
  getAll: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/financial/delivery-schedules/`, getAuthHeader());
      return response.data.results || response.data;
    } catch (error) {
      console.error('Erro ao buscar roteiros de entrega:', error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/api/financial/delivery-schedules/${id}/`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar roteiro de entrega ${id}:`, error);
      throw error;
    }
  },

  create: async (deliveryData) => {
    try {
      const response = await axios.post(`${API_URL}/api/financial/delivery-schedules/`, deliveryData, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Erro ao criar roteiro de entrega:', error);
      throw error;
    }
  },

  update: async (id, deliveryData) => {
    try {
      const response = await axios.put(`${API_URL}/api/financial/delivery-schedules/${id}/`, deliveryData, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar roteiro de entrega ${id}:`, error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      await axios.delete(`${API_URL}/api/financial/delivery-schedules/${id}/`, getAuthHeader());
      return true;
    } catch (error) {
      console.error(`Erro ao excluir roteiro de entrega ${id}:`, error);
      throw error;
    }
  },

  getToday: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/financial/delivery-schedules/today/`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar roteiros de hoje:', error);
      throw error;
    }
  },

  getWeek: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/financial/delivery-schedules/week/`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar roteiros da semana:', error);
      throw error;
    }
  },

  printRoute: async (id) => {
    try {
      const response = await axios.post(`${API_URL}/api/financial/delivery-schedules/${id}/print_route/`, {}, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Erro ao gerar impressão do roteiro ${id}:`, error);
      throw error;
    }
  },

  generatePDF: async (id) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/financial/delivery-schedules/${id}/generate_pdf/`, 
        {}, 
        {
          ...getAuthHeader(),
          responseType: 'blob'
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Erro ao gerar PDF do roteiro ${id}:`, error);
      throw error;
    }
  }
};

export default deliveryService;
