// Anomaly types
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

// Event types
export interface Event {
  event_id: string;
  ts: string;
  source_ip: string;
  source_port?: number;
  dest_ip?: string;
  dest_port?: number;
  user: string;
  service: string;
  sensor: string;
  event_type: string;
  action: string;
  outcome: 'success' | 'failure' | 'blocked' | 'error' | 'deny';
  message: string;
  protocol?: string;
  bytes?: number;
  scenario?: string;
  metadata?: Record<string, any>;
}

export interface EventsResponse {
  events: Event[];
  count: number;
  ip: string;
  limit: number;
}

// IP types
export interface IpInfo {
  ip: string;
  recent_events: number;
  recent_failed: number;
  recent_fail_ratio: number;
}

export interface IpsResponse {
  ips: IpInfo[];
  count: number;
  limit: number;
}

// List management types
export interface ListItem {
  id: number;
  type: 'ip' | 'user' | 'network';
  value: string;
  description?: string;
  created_at: string;
  expires_at?: string;
}

export interface ListResponse {
  items: ListItem[];
  count: number;
  limit: number;
}

// AI Assistant types
export interface AIStatus {
  overall_status: 'operational' | 'threat_detected';
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  active_threats: number;
  blocked_ips: number;
  flagged_ips: number;
  recommendations: string[];
  last_analysis: string;
}

export interface AIAnalysis {
  ip: string;
  status: 'clean' | 'threat_detected';
  anomalies_count: number;
  latest_anomaly?: Anomaly;
  attack_analysis?: {
    attack_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    indicators: string[];
    recommendations: string[];
    confidence: number;
  };
}

export interface AISummary {
  summary: {
    total_anomalies: number;
    blocked_ips: number;
    flagged_ips: number;
    whitelist_size: number;
    blacklist_size: number;
    threat_level: 'low' | 'medium' | 'high' | 'critical';
  };
  recent_anomalies: Anomaly[];
  top_suspicious_ips: IpInfo[];
  ai_analysis: {
    threat_level: 'low' | 'medium' | 'high' | 'critical';
    active_threats: number;
    blocked_ips: number;
    flagged_ips: number;
    attack_patterns: string[];
    recommendations: string[];
  };
  generated_at: string;
}


