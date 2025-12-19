import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const register = (userData: { username: string; password: string }) => 
  api.post('/api/auth/register', userData);

export const login = (userData: { username: string; password: string }) => 
  api.post('/api/auth/login', userData);

// Customer APIs
export interface Customer {
  id: string;
  customer_name: string;
  company_name: string;
  phone_number: string;
  next_call_date: string;
  next_call_time: string;
  remark: string;
}

export const fetchCustomers = (): Promise<Customer[]> => 
  api.get('/api/customers').then(res => res.data);

export const addCustomer = (customerData: Omit<Customer, 'id'>) => 
  api.post('/api/customers', customerData).then(res => res.data);

export const updateCustomer = (id: string, updates: Partial<Customer>) => 
  api.put(`/api/customers/${id}`, updates).then(res => res.data);

export const deleteCustomer = (id: string) => 
  api.delete(`/api/customers/${id}`).then(res => res.data);

// Bulk delete customers
export const bulkDeleteCustomers = (ids: string[]) => 
  api.delete('/api/customers/bulk-delete', { data: { ids } }).then(res => res.data);

// Bulk import customers
export const bulkImportCustomers = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/customers/bulk-import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }).then(res => res.data);
};

// Download template
export const downloadTemplate = () => 
  api.get('/api/customers/download-template', { responseType: 'blob' }).then(res => res.data);

export default api;