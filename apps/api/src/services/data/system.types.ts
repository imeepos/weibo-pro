export interface ComponentStatus {
  name: string;
  status: string;
  uptime: string;
}

export interface SystemStatus {
  status: string;
  uptime: string;
  lastUpdate: string;
  components: ComponentStatus[];
}

export interface SystemPerformance {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkTraffic: number;
  responseTime: number;
  requestsPerSecond: number;
  errorRate: number;
}

export interface HealthCheck {
  name: string;
  status: string;
  message: string;
}

export interface SystemHealth {
  overall: string;
  checks: HealthCheck[];
  timestamp: string;
}
