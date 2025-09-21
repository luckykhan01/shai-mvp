export type AttackType = "brute_force" | "port_scan" | "error_flood" | "success";

export type RiskLevel = "low" | "medium" | "high";

export type Event = {
  id: number;
  timestamp: string; 
  ip: string;         
  type: AttackType;
  score: number;      
  snippet: string;   
  blocked?: boolean;
};

export type EventsResponse = {
  items: Event[];
  total: number;
  page: number;
  size: number;
};

export type EvidenceResponse = { ip: string; items: Event[] };