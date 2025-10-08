import axios from 'axios';
import type {
  AnomaliesResponse,
  EventsResponse,
  IpsResponse,
  ListResponse,
  ListItem,
  AIStatus,
  AIAnalysis,
  AISummary,
} from '@/types';

const ML_API_BASE = '/api/ml';
const AI_API_BASE = '/api/ai';

const mlApi = axios.create({
  baseURL: ML_API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

const aiApi = axios.create({
  baseURL: AI_API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ML Detector API
export const mlDetectorApi = {
  // Get anomalies
  getAnomalies: async (limit = 50): Promise<AnomaliesResponse> => {
    const response = await mlApi.get<AnomaliesResponse>('/anomalies', {
      params: { limit },
    });
    return response.data;
  },

  // Get anomalies for specific IP
  getAnomaliesByIp: async (ip: string, limit = 50): Promise<AnomaliesResponse> => {
    const response = await mlApi.get<AnomaliesResponse>(`/anomalies/${ip}`, {
      params: { limit },
    });
    return response.data;
  },

  // Get events for specific IP
  getEventsByIp: async (ip: string, limit = 100): Promise<EventsResponse> => {
    const response = await mlApi.get<EventsResponse>(`/features/${ip}`, {
      params: { limit },
    });
    return response.data;
  },

  // Get list of IPs
  getIps: async (limit = 100): Promise<IpsResponse> => {
    const response = await mlApi.get<IpsResponse>('/ips', {
      params: { limit },
    });
    return response.data;
  },

  // Whitelist management
  getWhitelist: async (limit = 100): Promise<ListResponse> => {
    const response = await mlApi.get<ListResponse>('/lists/allow', {
      params: { limit },
    });
    return response.data;
  },

  addToWhitelist: async (data: {
    type: 'ip' | 'user' | 'network';
    value: string;
    description?: string;
  }): Promise<ListItem> => {
    const response = await mlApi.post<ListItem>('/lists/allow', data);
    return response.data;
  },

  removeFromWhitelist: async (params: {
    item_id?: number;
    item_type?: 'ip' | 'user' | 'network';
    value?: string;
  }): Promise<{ deleted: boolean; count: number }> => {
    const response = await mlApi.delete('/lists/allow', { data: params });
    return response.data;
  },

  // Blacklist management
  getBlacklist: async (limit = 100): Promise<ListResponse> => {
    const response = await mlApi.get<ListResponse>('/lists/deny', {
      params: { limit },
    });
    return response.data;
  },

  addToBlacklist: async (data: {
    type: 'ip' | 'user' | 'network';
    value: string;
    description?: string;
  }): Promise<ListItem> => {
    const response = await mlApi.post<ListItem>('/lists/deny', data);
    return response.data;
  },

  removeFromBlacklist: async (params: {
    item_id?: number;
    item_type?: 'ip' | 'user' | 'network';
    value?: string;
  }): Promise<{ deleted: boolean; count: number }> => {
    const response = await mlApi.delete('/lists/deny', { data: params });
    return response.data;
  },

  // Suppress alerts
  suppressAlerts: async (data: {
    type: 'ip' | 'user' | 'pattern';
    value: string;
    minutes: number;
    description?: string;
  }): Promise<any> => {
    const response = await mlApi.post('/suppress', data);
    return response.data;
  },
};

// AI Assistant API
export const aiAssistantApi = {
  // Health check
  health: async (): Promise<any> => {
    const response = await aiApi.get('/health');
    return response.data;
  },

  // Get overall status
  getStatus: async (): Promise<AIStatus> => {
    const response = await aiApi.get<AIStatus>('/status');
    return response.data;
  },

  // Analyze specific IP
  analyzeIp: async (ip: string): Promise<AIAnalysis> => {
    const response = await aiApi.get<AIAnalysis>(`/analyze/${ip}`);
    return response.data;
  },

  // Get recommendations
  getRecommendations: async (): Promise<any> => {
    const response = await aiApi.get('/recommendations');
    return response.data;
  },

  // Get summary
  getSummary: async (): Promise<AISummary> => {
    const response = await aiApi.get<AISummary>('/summary');
    return response.data;
  },

  // Chat with AI
  chat: async (message: string): Promise<{
    response: string;
    action_taken: string | null;
    timestamp: string;
  }> => {
    const response = await aiApi.post('/chat', { message });
    return response.data;
  },
};


