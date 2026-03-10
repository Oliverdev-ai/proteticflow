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

export const pricingService = {
  getAllItems: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pricing/items/`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar itens de preço:', error);
      throw error;
    }
  },

  getItemById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/api/pricing/items/${id}/`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar item de preço ${id}:`, error);
      throw error;
    }
  },

  createItem: async (itemData) => {
    try {
      const response = await axios.post(`${API_URL}/api/pricing/items/`, itemData, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Erro ao criar item de preço:', error);
      throw error;
    }
  },

  updateItem: async (id, itemData) => {
    try {
      const response = await axios.put(`${API_URL}/api/pricing/items/${id}/`, itemData, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar item de preço ${id}:`, error);
      throw error;
    }
  },

  deleteItem: async (id) => {
    try {
      await axios.delete(`${API_URL}/api/pricing/items/${id}/`, getAuthHeader());
      return true;
    } catch (error) {
      console.error(`Erro ao excluir item de preço ${id}:`, error);
      throw error;
    }
  },

  getAllTables: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pricing/tables/`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar tabelas de preço:', error);
      throw error;
    }
  },

  getTableById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/api/pricing/tables/${id}/`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar tabela de preço ${id}:`, error);
      throw error;
    }
  },

  getActiveTable: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pricing/tables/active/`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar tabela de preço ativa:', error);
      throw error;
    }
  },

  calculatePrice: async (itemId, clientId, quantity = 1) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/pricing/calculate/`, 
        { item_id: itemId, client_id: clientId, quantity }, 
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao calcular preço:', error);
      throw error;
    }
  }
};

export default pricingService;
