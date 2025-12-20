import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/api/customers`;

// Add interceptor to include token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Customer {
  id: string;
  customer_name: string;
  company_name: string;
  phone_number: string;
  next_call_date: string;
  next_call_time?: string;
  remark: string | null;
  color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | null;
  created_at?: string;
  updated_at?: string;
  position?: number;
}

export const fetchCustomers = async (): Promise<Customer[]> => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const addCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
  const response = await axios.post(API_URL, customer);
  return response.data;
};

export interface BulkImportResponse {
  success: boolean;
  message: string;
  importedCount?: number;
  errors?: string[];
}

export const bulkImportCustomers = async (file: File): Promise<BulkImportResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post<BulkImportResponse>(`${API_URL}/bulk-import`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const downloadTemplate = async (): Promise<Blob> => {
  const response = await axios.get(`${API_URL}/download-template`, {
    responseType: 'blob',
  });
  return response.data;
};

export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<Customer> => {
  const response = await axios.put(`${API_URL}/${id}`, updates);
  return response.data;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/${id}`);
};

export const bulkDeleteCustomers = async (ids: string[]): Promise<{ deletedCount: number }> => {
  // Use axios.post instead of axios.delete with data to avoid potential issues
  const response = await axios.post(`${API_URL}/bulk-delete`, { ids });
  return response.data;
};

export const reorderCustomers = async (customerIds: string[]): Promise<void> => {
  await axios.post(`${API_URL}/reorder`, { customerIds });
};