import { api } from './axios';

export const getPaiements = async () => {
  const response = await api.get('/paiements/');
  return response.data;
};

export const createPaiement = async (payload) => {
  const response = await api.post('/paiements/', payload);
  return response.data;
};
