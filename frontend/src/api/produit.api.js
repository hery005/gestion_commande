import { api } from './axios';

export const getProduits = async (search = '') => {
  const response = await api.get('/produits/', {
    params: search.trim() ? { search: search.trim() } : {},
  });
  return response.data;
};

export const createProduit = async (payload) => {
  const response = await api.post('/produits/', payload);
  return response.data;
};

export const getReliableSuppliers = async (productId) => {
  const response = await api.get(`/produits/${productId}/fournisseurs-fiables/`);
  return response.data;
};
