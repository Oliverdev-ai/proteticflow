import axios from 'axios';
import { enqueueSnackbar } from 'notistack';

const api = axios.create({ baseURL: '/api' });

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.data && error.response.data.error) {
      enqueueSnackbar(error.response.data.error, { variant: 'error' });
    } else {
      enqueueSnackbar('Erro inesperado. Tente novamente.', { variant: 'error' });
    }
    return Promise.reject(error);
  }
);

export default api; 