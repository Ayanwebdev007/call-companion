import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/api/customers`;
const SPREADSHEETS_API_URL = `${API_BASE_URL}/api/spreadsheets`;



export interface Customer {
  id: string;
  customer_name: string;
  company_name: string;
  phone_number: string;
  next_call_date: string;
  next_call_time?: string;
  last_call_date?: string;
  remark: string | null;
  color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | null;
  created_at?: string;
  updated_at?: string;
  position?: number;
}

export interface Spreadsheet {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  permission_level?: 'read-only' | 'read-write';
  owner?: string;
  is_shared?: boolean;
}

export const fetchCustomers = async (spreadsheetId?: string, q?: string): Promise<Customer[]> => {
  // Validate spreadsheetId if provided
  if (spreadsheetId && (spreadsheetId === 'undefined' || spreadsheetId === 'null')) {
    throw new Error('Invalid spreadsheet ID provided');
  }

  const params = new URLSearchParams();
  if (spreadsheetId) params.set('spreadsheetId', spreadsheetId);
  if (q && q.trim().length > 0) params.set('q', q.trim());
  const url = params.toString().length > 0 ? `${API_URL}?${params.toString()}` : API_URL;
  const response = await api.get(url);
  return response.data;
};

export const addCustomer = async (customer: Omit<Customer, 'id'> & { spreadsheet_id: string }): Promise<Customer> => {
  const response = await api.post(API_URL, customer);
  return response.data;
};

export interface BulkImportResponse {
  success: boolean;
  message: string;
  importedCount?: number;
  errors?: string[];
}

export const bulkImportCustomers = async (file: File, spreadsheetId: string): Promise<BulkImportResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('spreadsheetId', spreadsheetId);

  const response = await api.post<BulkImportResponse>(`${API_URL}/bulk-import`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const downloadTemplate = async (): Promise<Blob> => {
  const response = await api.get(`${API_URL}/download-template`, {
    responseType: 'blob',
  });
  return response.data;
};

export const exportCustomers = async (spreadsheetId: string): Promise<Blob> => {
  const response = await api.get(`${API_URL}/export/${spreadsheetId}`, {
    responseType: 'blob',
  });
  return response.data;
};

export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<Customer> => {
  const response = await api.put(`${API_URL}/${id}`, updates);
  return response.data;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await api.delete(`${API_URL}/${id}`);
};

export const bulkDeleteCustomers = async (ids: string[]): Promise<{ deletedCount: number }> => {
  // Use axios.post instead of axios.delete with data to avoid potential issues
  const response = await api.post(`${API_URL}/bulk-delete`, { ids });
  return response.data;
};

export const reorderCustomers = async (customerIds: string[]): Promise<void> => {
  await api.post(`${API_URL}/reorder`, { customerIds });
};

export interface SharedUser {
  username: string;
  permission_level: 'read-only' | 'read-write';
  created_at: string;
}

// Spreadsheet API functions
export const fetchSpreadsheets = async (): Promise<Spreadsheet[]> => {
  const response = await api.get(SPREADSHEETS_API_URL);
  return response.data;
};

export const fetchSpreadsheet = async (id: string): Promise<Spreadsheet> => {
  const response = await api.get(`${SPREADSHEETS_API_URL}/${id}`);
  return response.data;
};

export const fetchSharedSpreadsheets = async (): Promise<Spreadsheet[]> => {
  console.log('Fetching shared spreadsheets from:', `${API_BASE_URL}/api/shared-spreadsheets`);
  const token = localStorage.getItem('token');
  console.log('Token:', token);
  const response = await api.get(`${API_BASE_URL}/api/shared-spreadsheets`);
  console.log('Shared spreadsheets response:', response);
  return response.data;
};

export const shareSpreadsheet = async (spreadsheetId: string, username: string, permissionLevel: 'read-only' | 'read-write' = 'read-only'): Promise<unknown> => {
  const response = await api.post(`${SPREADSHEETS_API_URL}/${spreadsheetId}/share`, { username, permission_level: permissionLevel });
  return response.data;
};

export const unshareSpreadsheet = async (spreadsheetId: string, username: string): Promise<unknown> => {
  const response = await api.delete(`${SPREADSHEETS_API_URL}/${spreadsheetId}/share/${username}`);
  return response.data;
};

export const updateSharePermission = async (spreadsheetId: string, username: string, permissionLevel: 'read-only' | 'read-write'): Promise<unknown> => {
  const response = await api.put(`${SPREADSHEETS_API_URL}/${spreadsheetId}/share/${username}`, { permission_level: permissionLevel });
  return response.data;
};

export const changePassword = async (current_password: string, new_password: string): Promise<{ message: string }> => {
  const response = await api.post(`${API_BASE_URL}/api/auth/change-password`, { current_password, new_password });
  return response.data;
};

export const fetchSharedUsers = async (spreadsheetId: string): Promise<SharedUser[]> => {
  if (!spreadsheetId || spreadsheetId === 'undefined' || spreadsheetId === 'null') {
    throw new Error('Valid spreadsheet ID is required');
  }
  const response = await api.get(`${SPREADSHEETS_API_URL}/${spreadsheetId}/shared-users`);
  return response.data;
};

export const createSpreadsheet = async (spreadsheet: Omit<Spreadsheet, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Spreadsheet> => {
  const response = await api.post(SPREADSHEETS_API_URL, spreadsheet);
  return response.data;
};

export const updateSpreadsheet = async (id: string, updates: Partial<Spreadsheet>): Promise<Spreadsheet> => {
  const response = await api.put(`${SPREADSHEETS_API_URL}/${id}`, updates);
  return response.data;
};

export const deleteSpreadsheet = async (id: string): Promise<void> => {
  await api.delete(`${SPREADSHEETS_API_URL}/${id}`);
};
export const forgotPassword = async (email: string): Promise<{ message: string, devMode?: boolean }> => {
  const response = await api.post(`${API_BASE_URL}/api/auth/forgot-password`, { email });
  return response.data;
};

export const resetPassword = async (token: string, password: string): Promise<{ message: string }> => {
  const response = await api.post(`${API_BASE_URL}/api/auth/reset-password/${token}`, { password });
  return response.data;
};

export const updateProfile = async (username: string, email: string): Promise<{ message: string, user: { id: string, username: string, email: string } }> => {
  const response = await api.put(`${API_BASE_URL}/api/auth/update-profile`, { username, email });
  return response.data;
};

// Google Sheets API functions
export const validateGoogleSheet = async (sheetUrl: string): Promise<{ valid: boolean; error?: string }> => {
  const response = await api.post(`${API_BASE_URL}/api/googlesheets/validate`, { sheetUrl });
  return response.data;
};

export const fetchGoogleSheetData = async (sheetUrl: string): Promise<{
  spreadsheetId: string;
  sheetName: string;
  headers: string[];
  data: string[][];
  totalRows: number;
}> => {
  const response = await api.post(`${API_BASE_URL}/api/googlesheets/fetch`, { sheetUrl });
  return response.data;
};

export const importFromGoogleSheet = async (data: {
  spreadsheetId: string;
  sheetUrl: string;
  columnMapping: Record<string, string>;
  sheetData: any;
}): Promise<{ success: boolean; imported: number; message: string }> => {
  const response = await api.post(`${API_BASE_URL}/api/googlesheets/import`, data);
  return response.data;
};

// Create axios instance with base URL
export const api = axios.create({
  baseURL: API_BASE_URL
});

// Add interceptor to include token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
