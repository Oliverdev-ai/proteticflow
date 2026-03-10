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

export const labSettingsService = {
  getCurrent: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/financial/lab-settings/current/`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar configurações do laboratório:', error);
      throw error;
    }
  },

  update: async (id, settingsData) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      Object.keys(settingsData).forEach(key => {
        if (key === 'logo' && settingsData[key] instanceof File) {
          formData.append('logo', settingsData[key]);
        } else if (key !== 'logo' || settingsData[key] === null) {
          formData.append(key, settingsData[key]);
        }
      });

      const response = await axios.patch(
        `${API_URL}/api/financial/lab-settings/${id}/`, 
        formData,
        {
          ...getAuthHeader(),
          headers: {
            ...getAuthHeader().headers,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar configurações do laboratório ${id}:`, error);
      throw error;
    }
  },

  create: async (settingsData) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      Object.keys(settingsData).forEach(key => {
        if (key === 'logo' && settingsData[key] instanceof File) {
          formData.append('logo', settingsData[key]);
        } else if (key !== 'logo' || settingsData[key] === null) {
          formData.append(key, settingsData[key]);
        }
      });

      const response = await axios.post(
        `${API_URL}/api/financial/lab-settings/`, 
        formData,
        {
          ...getAuthHeader(),
          headers: {
            ...getAuthHeader().headers,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao criar configurações do laboratório:', error);
      throw error;
    }
  },

  applyToDocument: async (documentType, documentId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/financial/lab-settings/apply_to_document/`,
        {
          document_type: documentType,
          document_id: documentId
        },
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao aplicar configurações ao documento:', error);
      throw error;
    }
  }
};

export default labSettingsService;
