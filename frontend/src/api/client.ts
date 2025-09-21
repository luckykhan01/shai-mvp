import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  AnomaliesResponse,
  EventsResponse,
  IPsResponse,
  ListsResponse,
  CreateListItemRequest,
  DeleteListItemRequest,
  SuppressRequest,
  SuppressResponse,
  ExportParams,
  APIError
} from '../types/api';

class APIClient {
  private client: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:8001') {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Anomalies endpoints
  async getAnomalies(limit?: number): Promise<AnomaliesResponse> {
    const params = limit ? { limit } : {};
    const response: AxiosResponse<AnomaliesResponse> = await this.client.get('/anomalies', { params });
    return response.data;
  }

  async getAnomaliesByIP(ip: string, limit?: number): Promise<AnomaliesResponse> {
    const params = limit ? { limit } : {};
    const response: AxiosResponse<AnomaliesResponse> = await this.client.get(`/anomalies/${ip}`, { params });
    return response.data;
  }

  // Events endpoints
  async getEventsByIP(ip: string, limit?: number): Promise<EventsResponse> {
    const params = limit ? { limit } : {};
    const response: AxiosResponse<EventsResponse> = await this.client.get(`/features/${ip}`, { params });
    return response.data;
  }

  // IPs endpoints
  async getIPs(limit?: number): Promise<IPsResponse> {
    const params = limit ? { limit } : {};
    const response: AxiosResponse<IPsResponse> = await this.client.get('/ips', { params });
    return response.data;
  }

  // Export endpoints
  async exportAnomalies(params?: ExportParams): Promise<Blob> {
    const response = await this.client.get('/export/actions.ndjson', {
      params,
      responseType: 'blob',
    });
    return response.data;
  }

  // Lists endpoints
  async getAllowList(limit?: number): Promise<ListsResponse> {
    const params = limit ? { limit } : {};
    const response: AxiosResponse<ListsResponse> = await this.client.get('/lists/allow', { params });
    return response.data;
  }

  async getDenyList(limit?: number): Promise<ListsResponse> {
    const params = limit ? { limit } : {};
    const response: AxiosResponse<ListsResponse> = await this.client.get('/lists/deny', { params });
    return response.data;
  }

  async addToAllowList(data: CreateListItemRequest): Promise<ListItem> {
    const response: AxiosResponse<ListItem> = await this.client.post('/lists/allow', data);
    return response.data;
  }

  async addToDenyList(data: CreateListItemRequest): Promise<ListItem> {
    const response: AxiosResponse<ListItem> = await this.client.post('/lists/deny', data);
    return response.data;
  }

  async removeFromAllowList(data: DeleteListItemRequest): Promise<{ deleted: boolean; count: number }> {
    const response = await this.client.delete('/lists/allow', { data });
    return response.data;
  }

  async removeFromDenyList(data: DeleteListItemRequest): Promise<{ deleted: boolean; count: number }> {
    const response = await this.client.delete('/lists/deny', { data });
    return response.data;
  }

  // Suppress endpoints
  async suppressAlerts(data: SuppressRequest): Promise<SuppressResponse> {
    const response: AxiosResponse<SuppressResponse> = await this.client.post('/suppress', data);
    return response.data;
  }

  // Utility methods
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

// Create and export a singleton instance
export const apiClient = new APIClient();
export default apiClient;
