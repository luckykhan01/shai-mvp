import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return `${diffSecs}с назад`;
  } else if (diffMins < 60) {
    return `${diffMins}м назад`;
  } else if (diffHours < 24) {
    return `${diffHours}ч назад`;
  } else {
    return `${diffDays}д назад`;
  }
}

export function getSeverityColor(
  action: 'block_ip' | 'flag_ip' | string,
  score?: number
): string {
  if (action === 'block_ip') {
    return 'danger';
  } else if (action === 'flag_ip') {
    return 'warning';
  } else if (score !== undefined) {
    if (score < -0.7) return 'danger';
    if (score < -0.5) return 'warning';
    return 'success';
  }
  return 'warning';
}

export function getThreatLevelColor(
  level: 'low' | 'medium' | 'high' | 'critical'
): string {
  switch (level) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'warning';
  }
}

export function formatScore(score: number): string {
  return score.toFixed(3);
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}


