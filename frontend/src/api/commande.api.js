import { api } from './axios';

export const getCommandes = async (search = '') => {
  const response = await api.get('/commandes/', {
    params: search.trim() ? { search: search.trim() } : {},
  });
  return response.data;
};

export const createCommande = async (payload) => {
  const response = await api.post('/commandes/', payload);
  return response.data;
};
