// API Types based on ANOMALIES_API.md

export interface Anomaly {
  ts: string;
  action: 'block_ip' | 'flag_ip';
  ip: string;
  iso_score: number;
  recent_failed: number;
  recent_events: number;
  recent_fail_ratio: number;
  reason: string;
}

export interface AnomaliesResponse {
  anomalies: Anomaly[];
  count: number;
  limit: number;
  ip?: string;
}

export interface Event {
  event_id: string;
  ts: string;
  source_ip: string;
  source_port: number;
  dest_ip: string;
  dest_port: number;
  user: string;
  service: string;
  sensor: string;
  event_type: string;
  action: string;
  outcome: 'success' | 'failure' | 'blocked' | 'error' | 'deny';
  message: string;
  protocol: string;
  bytes: number;
  scenario: string;
  metadata: Record<string, any>;
}

export interface EventsResponse {
  events: Event[];
  count: number;
  ip: string;
  limit: number;
}

export interface IPStats {
  ip: string;
  recent_events: number;
  recent_failed: number;
  recent_fail_ratio: number;
}

export interface IPsResponse {
  ips: IPStats[];
  count: number;
  limit: number;
}

export interface ListItem {
  id: number;
  type: 'ip' | 'user' | 'network';
  value: string;
  description: string;
  created_at: string;
  expires_at: string | null;
}

export interface ListsResponse {
  items: ListItem[];
  count: number;
  limit: number;
}

export interface CreateListItemRequest {
  type: 'ip' | 'user' | 'network';
  value: string;
  description?: string;
  expires_at?: string;
}

export interface DeleteListItemRequest {
  item_id?: number;
  item_type?: 'ip' | 'user' | 'network';
  value?: string;
}

export interface SuppressRequest {
  type: 'ip' | 'user' | 'pattern';
  value: string;
  minutes: number;
  description?: string;
}

export interface SuppressResponse {
  id: number;
  type: string;
  value: string;
  description: string;
  created_at: string;
  expires_at: string;
  minutes: number;
}

export interface ExportParams {
  since?: string;
  until?: string;
  limit?: number;
}

export interface APIError {
  error: string;
  message: string;
}
