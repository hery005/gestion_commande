import { api } from './axios';

export const getFournisseurs = async () => {
  const response = await api.get('/fournisseurs/');
  return response.data;
};

export const createFournisseur = async (payload) => {
  const response = await api.post('/fournisseurs/', payload);
  return response.data;
};
