// API client for connecting to the backend services

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'
const AI_ASSISTANT_URL = process.env.NEXT_PUBLIC_AI_ASSISTANT_URL || 'http://localhost:8002'

// Types for API responses
export interface Anomaly {
  ts: string
  action: "block_ip" | "flag_ip"
  ip: string
  iso_score: number
  recent_failed: number
  recent_events: number
  recent_fail_ratio: number
  reason: string
}

export interface AnomaliesResponse {
  anomalies: Anomaly[]
  count: number
  limit: number
  ip?: string
}

export interface SecurityEvent {
  event_id: string
  ts: string
  source_ip: string
  source_port: number
  dest_ip: string
  dest_port: number
  user: string
  service: string
  sensor: string
  event_type: string
  action: string
  outcome: "success" | "failure" | "blocked" | "error" | "deny"
  message: string
  protocol: string
  bytes: number
  scenario: string
  metadata: Record<string, any>
}

export interface EventsResponse {
  events: SecurityEvent[]
  count: number
  ip: string
  limit: number
}

export interface IPInfo {
  ip: string
  recent_events: number
  recent_failed: number
  recent_fail_ratio: number
}

export interface IPsResponse {
  ips: IPInfo[]
  count: number
  limit: number
}

export interface ListItem {
  id: number
  type: "ip" | "user" | "network"
  value: string
  description: string
  created_at: string
  expires_at: string | null
}

export interface ListsResponse {
  items: ListItem[]
  count: number
  limit: number
}

export interface SuppressRequest {
  type: "ip" | "user" | "pattern"
  value: string
  minutes: number
  description?: string
}

export interface SuppressResponse {
  id: number
  type: string
  value: string
  description: string
  created_at: string
  expires_at: string
  minutes: number
}

export interface LogEvent {
  timestamp: string
  source_ip: string
  event_type: string
  message: string
  severity: string
  service: string
}

export interface LogsResponse {
  count: number
  items: LogEvent[]
  limit: number
}

export interface Incident {
  id: string
  timestamp: string
  source_ip: string
  event_type: string
  severity: string
  message: string
  rule_triggered: string
}

export interface IncidentsResponse {
  count: number
  items: Incident[]
}

// API client class
class APIClient {
  private baseURL: string
  private aiAssistantURL: string

  constructor() {
    this.baseURL = API_BASE_URL
    this.aiAssistantURL = AI_ASSISTANT_URL
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    console.log('Making API request to:', url)
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      console.error('API request failed:', response.status, response.statusText)
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Anomalies API
  async getAnomalies(limit: number = 20): Promise<AnomaliesResponse> {
    return this.request<AnomaliesResponse>(`${this.baseURL}/anomalies?limit=${limit}`)
  }

  async getAnomaliesByIP(ip: string, limit: number = 50): Promise<AnomaliesResponse> {
    return this.request<AnomaliesResponse>(`${this.baseURL}/anomalies/${ip}?limit=${limit}`)
  }

  // Events API
  async getEventsByIP(ip: string, limit: number = 100): Promise<EventsResponse> {
    return this.request<EventsResponse>(`${this.baseURL}/features/${ip}?limit=${limit}`)
  }

  // IPs API
  async getIPs(limit: number = 100): Promise<IPsResponse> {
    return this.request<IPsResponse>(`${this.baseURL}/ips?limit=${limit}`)
  }

  // Lists API
  async getAllowList(limit: number = 100): Promise<ListsResponse> {
    return this.request<ListsResponse>(`${this.baseURL}/lists/allow?limit=${limit}`)
  }

  async getDenyList(limit: number = 100): Promise<ListsResponse> {
    return this.request<ListsResponse>(`${this.baseURL}/lists/deny?limit=${limit}`)
  }

  async addToAllowList(item: Omit<ListItem, 'id' | 'created_at'>): Promise<ListItem> {
    return this.request<ListItem>(`${this.baseURL}/lists/allow`, {
      method: 'POST',
      body: JSON.stringify(item),
    })
  }

  async addToDenyList(item: Omit<ListItem, 'id' | 'created_at'>): Promise<ListItem> {
    return this.request<ListItem>(`${this.baseURL}/lists/deny`, {
      method: 'POST',
      body: JSON.stringify(item),
    })
  }

  async removeFromAllowList(itemId: number): Promise<{ deleted: boolean; count: number }> {
    return this.request<{ deleted: boolean; count: number }>(`${this.baseURL}/lists/allow`, {
      method: 'DELETE',
      body: JSON.stringify({ item_id: itemId }),
    })
  }

  async removeFromDenyList(itemId: number): Promise<{ deleted: boolean; count: number }> {
    return this.request<{ deleted: boolean; count: number }>(`${this.baseURL}/lists/deny`, {
      method: 'DELETE',
      body: JSON.stringify({ item_id: itemId }),
    })
  }

  // Suppress API
  async suppressAlerts(request: SuppressRequest): Promise<SuppressResponse> {
    return this.request<SuppressResponse>(`${this.baseURL}/suppress`, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Export API
  async exportAnomalies(since?: string, until?: string, limit?: number): Promise<Blob> {
    const params = new URLSearchParams()
    if (since) params.append('since', since)
    if (until) params.append('until', until)
    if (limit) params.append('limit', limit.toString())

    const response = await fetch(`${this.baseURL}/export/actions.ndjson?${params}`)
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`)
    }
    return response.blob()
  }

  // Logs API - получаем события для всех IP адресов
  async getLogs(limit: number = 15): Promise<LogsResponse> {
    // Сначала получаем список IP адресов
    const ipsResponse = await this.request<IPsResponse>(`${this.baseURL}/ips?limit=100`)
    
    // Получаем события для каждого IP (по 5 событий на IP)
    const allEvents: LogEvent[] = []
    const eventsPerIP = Math.ceil(limit / ipsResponse.ips.length)
    
    for (const ipInfo of ipsResponse.ips.slice(0, 10)) { // Ограничиваем 10 IP для производительности
      try {
        const eventsResponse = await this.request<EventsResponse>(`${this.baseURL}/features/${ipInfo.ip}?limit=${eventsPerIP}`)
        const logEvents: LogEvent[] = eventsResponse.events.map(event => ({
          timestamp: event.ts,
          source_ip: event.source_ip,
          event_type: event.event_type,
          message: event.message,
          severity: event.outcome === 'failure' ? 'high' : 'medium',
          service: event.service
        }))
        allEvents.push(...logEvents)
      } catch (err) {
        console.warn(`Failed to fetch events for IP ${ipInfo.ip}:`, err)
      }
    }
    
    return {
      count: allEvents.length,
      items: allEvents.slice(0, limit),
      limit
    }
  }

  async getIncidents(limit: number = 100): Promise<IncidentsResponse> {
    const response = await fetch(`http://localhost:8000/incidents?limit=${limit}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch incidents: ${response.status}`)
    }
    return response.json()
  }

  async getTotalLogsCount(): Promise<{ total_logs: number }> {
    const response = await fetch('http://localhost:8000/health')
    if (!response.ok) {
      throw new Error(`Failed to fetch logs count: ${response.status}`)
    }
    const data = await response.json()
    return { total_logs: data.incidents_in_mem || 0 }
  }

  // AI Assistant API
  async getAIInsights(query: string): Promise<{ response: string }> {
    return this.request<{ response: string }>(`${this.aiAssistantURL}/chat`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    })
  }

  async getAIRecommendations(): Promise<{ recommendations: string[] }> {
    return this.request<{ recommendations: string[] }>(`${this.aiAssistantURL}/recommendations`)
  }
}

// Export singleton instance
export const apiClient = new APIClient()

// Export individual functions for convenience
export const {
  getAnomalies,
  getAnomaliesByIP,
  getEventsByIP,
  getIPs,
  getAllowList,
  getDenyList,
  addToAllowList,
  addToDenyList,
  removeFromAllowList,
  removeFromDenyList,
  suppressAlerts,
  exportAnomalies,
  getAIInsights,
  getAIRecommendations,
} = apiClient
