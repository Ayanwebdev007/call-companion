import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;
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
  meta_data?: Record<string, string>;
  color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | null;
  created_at?: string;
  updated_at?: string;
  position?: number;
  status?: string;
}

export interface Spreadsheet {
  id: string;
  user_id: string;
  name: string;
  description: string;
  page_name?: string;
  form_name?: string;
  campaign_name?: string;
  ad_set_name?: string;
  ad_name?: string;
  meta_headers?: string[];
  is_meta?: boolean;
  is_master?: boolean;
  linked_google_sheet_url?: string;
  linked_sheet_name?: string;
  linked_meta_sheets?: string[] | { _id: string, name: string, is_meta: boolean }[];
  is_unified?: boolean;
  column_mapping?: Record<string, string>;
  realtime_sync?: boolean;
  created_at: string;
  updated_at: string;
  permission_level?: 'read-only' | 'read-write';
  owner?: string;
  is_shared?: boolean;
  newLeadsCount?: number;
}

export interface PaginatedCustomers {
  customers: Customer[];
  total: number;
  page: number;
  totalPages: number;
}

export const fetchCustomers = async (
  spreadsheetId?: string,
  q?: string
): Promise<PaginatedCustomers | Customer[]> => {
  // Validate spreadsheetId if provided
  if (spreadsheetId && (spreadsheetId === 'undefined' || spreadsheetId === 'null')) {
    throw new Error('Invalid spreadsheet ID provided');
  }

  const params = new URLSearchParams();
  if (spreadsheetId) params.set('spreadsheetId', spreadsheetId);
  if (q && q.trim().length > 0) params.set('q', q.trim());

  const url = `${API_URL}?${params.toString()}`;
  const response = await api.get(url);

  // Handle both legacy (array) and new (paginated object) responses for safety
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

export const bulkImportCustomers = async (file: File, spreadsheetId: string, overwrite: boolean = false): Promise<BulkImportResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('spreadsheetId', spreadsheetId);
  formData.append('overwrite', overwrite.toString());

  const response = await api.post<BulkImportResponse>(`${API_URL}/bulk-import`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const downloadTemplate = async (spreadsheetId?: string): Promise<Blob> => {
  const url = spreadsheetId ? `${API_URL}/download-template?spreadsheetId=${spreadsheetId}` : `${API_URL}/download-template`;
  const response = await api.get(url, {
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

export const restoreCustomer = async (id: string): Promise<void> => {
  await api.post(`${API_URL}/restore/${id}`);
};

export const bulkRestoreCustomers = async (ids: string[]): Promise<{ restoredCount: number }> => {
  const response = await api.post(`${API_URL}/bulk-restore`, { ids });
  return response.data;
};

export const reorderCustomers = async (customerIds: string[]): Promise<void> => {
  await api.post(`${API_URL}/reorder`, { customerIds });
};

export const bulkInsertCustomers = async (spreadsheetId: string, customers: Partial<Customer>[]): Promise<{ message: string; count: number }> => {
  const response = await api.post(`${API_URL}/bulk-insert`, { spreadsheetId, customers });
  return response.data;
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

export const mergeSpreadsheets = async (spreadsheetIds: string[], name?: string): Promise<Spreadsheet> => {
  const response = await api.post(`${SPREADSHEETS_API_URL}/merge`, { spreadsheetIds, name });
  return response.data;
};

export const linkSheets = async (unifiedSheetId: string, metaSheetIds: string[], action: 'add' | 'remove' | 'set'): Promise<Spreadsheet> => {
  const response = await api.post(`${SPREADSHEETS_API_URL}/${unifiedSheetId}/link`, { metaSheetIds, action });
  return response.data;
};

export const recordSpreadsheetView = async (id: string): Promise<void> => {
  await api.post(`${SPREADSHEETS_API_URL}/${id}/view`);
};
export const forgotPassword = async (email: string): Promise<{ message: string, devMode?: boolean }> => {
  const response = await api.post(`${API_BASE_URL}/api/auth/forgot-password`, { email });
  return response.data;
};

export const resetPassword = async (token: string, password: string): Promise<{ message: string }> => {
  const response = await api.post(`${API_BASE_URL}/api/auth/reset-password/${token}`, { password });
  return response.data;
};

export const updateProfile = async (name: string, email: string): Promise<{ message: string, user: { id: string, username: string, email: string, role: string, permissions: string[], business_id: string } }> => {
  const response = await api.put(`${API_BASE_URL}/api/auth/update-profile`, { name, email });
  return response.data;
};

export const fetchBusiness = async (): Promise<any> => {
  const response = await api.get(`${API_BASE_URL}/api/auth/business`);
  return response.data;
};

export const updateBusiness = async (settings: any): Promise<{ message: string, settings: any }> => {
  const response = await api.put(`${API_BASE_URL}/api/auth/settings`, { settings });
  return response.data;
};

export const resetUserPassword = async (userId: string, password: string): Promise<{ message: string }> => {
  const response = await api.post(`${API_BASE_URL}/api/auth/business/users/${userId}/reset-password`, { password });
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

export const exportToGoogleSheet = async (
  spreadsheetId: string,
  sheetUrl: string,
  sheetName?: string,
  columnMapping?: Record<string, string>,
  realtimeSync?: boolean
): Promise<{ success: boolean; message: string; url: string }> => {
  const response = await api.post(`${API_BASE_URL}/api/googlesheets/export`, {
    spreadsheetId,
    sheetUrl,
    sheetName,
    columnMapping,
    realtimeSync
  });
  return response.data;
};

export const syncGoogleSheet = async (spreadsheetId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(`${API_BASE_URL}/api/googlesheets/sync/${spreadsheetId}`);
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

// Add interceptor to handle token expiration/unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401)) {
      // Clear storage and redirect on authentication failure
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
// Meta Analytics
export interface MetaAnalyticsResponse {
  recentLeads: (Customer & { spreadsheet_id: Spreadsheet })[];
  stats: {
    leadsToday: number;
    leadsThisWeek: number;
    totalLeads: number;
  };
  charts: {
    pageLeads: Record<string, number>;
    formLeads: Record<string, number>;
    campaignLeads: Record<string, number>;
    adSetLeads: Record<string, number>;
    adLeads: Record<string, number>;
    dateLeads: Record<string, number>;
    statusDistribution: Record<string, number>;
  };
}

export const fetchWhatsAppStatus = async (): Promise<{ status: 'disconnected' | 'connecting' | 'connected', qr?: string }> => {
  const response = await api.get(`${API_BASE_URL}/api/whatsapp/status`);
  return response.data;
};

export const connectWhatsApp = async (): Promise<{ message: string }> => {
  const response = await api.post(`${API_BASE_URL}/api/whatsapp/connect`);
  return response.data;
};

export const logoutWhatsApp = async (): Promise<{ message: string }> => {
  const response = await api.post(`${API_BASE_URL}/api/whatsapp/logout`);
  return response.data;
};

export const fetchMetaAnalytics = async (): Promise<MetaAnalyticsResponse> => {
  const response = await api.get(`${API_BASE_URL}/api/meta/analytics`);
  return response.data;
};

// Mobile Calling API
export const requestMobileCall = async (customerId: string, phoneNumber: string, customerName: string): Promise<{ success: boolean; request_id: string }> => {
  const response = await api.post(`${API_BASE_URL}/api/mobile/request-call`, {
    customer_id: customerId,
    phone_number: phoneNumber,
    customer_name: customerName
  });
  return response.data;
};

export interface CallLog {
  _id: string;
  user_id: string;
  customer_id: string;
  phone_number: string;
  call_type: 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'blocked' | 'unknown';
  duration: number;
  timestamp: string;
  note: string;
  synced_from_mobile: boolean;
}

export const getCallLogs = async (customerId: string): Promise<CallLog[]> => {
  const response = await api.get(`${API_BASE_URL}/api/mobile/call-logs/${customerId}`);
  return response.data;
};
