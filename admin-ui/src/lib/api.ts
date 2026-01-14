import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = async (username: string, password: string) => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await api.post('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// LLM Providers
export const getLLMProviders = async () => {
  const response = await api.get('/llm-providers');
  return response.data;
};

export const getLLMProvider = async (id: number) => {
  const response = await api.get(`/llm-providers/${id}`);
  return response.data;
};

export const createLLMProvider = async (data: any) => {
  const response = await api.post('/llm-providers', data);
  return response.data;
};

export const updateLLMProvider = async (id: number, data: any) => {
  const response = await api.put(`/llm-providers/${id}`, data);
  return response.data;
};

export const deleteLLMProvider = async (id: number) => {
  await api.delete(`/llm-providers/${id}`);
};

export const testLLMProvider = async (id: number) => {
  const response = await api.post(`/llm-providers/${id}/test`);
  return response.data;
};

// ServiceNow Configs
export const getServiceNowConfigs = async () => {
  const response = await api.get('/servicenow-configs');
  return response.data;
};

export const getServiceNowConfig = async (id: number) => {
  const response = await api.get(`/servicenow-configs/${id}`);
  return response.data;
};

export const createServiceNowConfig = async (data: any) => {
  const response = await api.post('/servicenow-configs', data);
  return response.data;
};

export const updateServiceNowConfig = async (id: number, data: any) => {
  const response = await api.put(`/servicenow-configs/${id}`, data);
  return response.data;
};

export const deleteServiceNowConfig = async (id: number) => {
  await api.delete(`/servicenow-configs/${id}`);
};

export const testServiceNowConfig = async (id: number) => {
  const response = await api.post(`/servicenow-configs/${id}/test`);
  return response.data;
};

// SMTP Configs
export const getSMTPConfigs = async () => {
  const response = await api.get('/smtp-configs');
  return response.data;
};

export const getSMTPConfig = async (id: number) => {
  const response = await api.get(`/smtp-configs/${id}`);
  return response.data;
};

export const createSMTPConfig = async (data: any) => {
  const response = await api.post('/smtp-configs', data);
  return response.data;
};

export const updateSMTPConfig = async (id: number, data: any) => {
  const response = await api.put(`/smtp-configs/${id}`, data);
  return response.data;
};

export const deleteSMTPConfig = async (id: number) => {
  await api.delete(`/smtp-configs/${id}`);
};

export const testSMTPConfig = async (id: number, testEmail?: string) => {
  const response = await api.post(`/smtp-configs/${id}/test`, null, {
    params: testEmail ? { test_email: testEmail } : {},
  });
  return response.data;
};

// Alert Types
export const getAlertTypes = async () => {
  const response = await api.get('/alert-types');
  return response.data;
};

export const getAlertType = async (id: number) => {
  const response = await api.get(`/alert-types/${id}`);
  return response.data;
};

export const createAlertType = async (data: any) => {
  const response = await api.post('/alert-types', data);
  return response.data;
};

export const updateAlertType = async (id: number, data: any) => {
  const response = await api.put(`/alert-types/${id}`, data);
  return response.data;
};

export const deleteAlertType = async (id: number) => {
  await api.delete(`/alert-types/${id}`);
};

export const toggleAlertType = async (id: number) => {
  const response = await api.post(`/alert-types/${id}/toggle`);
  return response.data;
};

// Alert Notifications
export const getAlertNotifications = async (alertTypeId: number) => {
  const response = await api.get(`/alert-types/${alertTypeId}/notifications`);
  return response.data;
};

export const createAlertNotification = async (alertTypeId: number, data: any) => {
  const response = await api.post(`/alert-types/${alertTypeId}/notifications`, data);
  return response.data;
};

export const deleteAlertNotification = async (alertTypeId: number, notificationId: number) => {
  await api.delete(`/alert-types/${alertTypeId}/notifications/${notificationId}`);
};

// Webhook Logs
export const getWebhookLogs = async (params?: {
  limit?: number;
  offset?: number;
  status?: string;
  mnemonic?: string;
}) => {
  const response = await api.get('/webhook-logs', { params });
  return response.data;
};

export const getWebhookLog = async (id: number) => {
  const response = await api.get(`/webhook-logs/${id}`);
  return response.data;
};

export const getWebhookLogStats = async (days?: number) => {
  const response = await api.get('/webhook-logs/stats', {
    params: days ? { days } : {},
  });
  return response.data;
};

// Webhook Test
export const testWebhook = async (data: {
  mnemonic: string;
  host: string;
  vendor: string;
  message_text: string;
}) => {
  const response = await api.post('/webhook/test', data);
  return response.data;
};

export default api;
