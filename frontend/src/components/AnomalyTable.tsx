import { Link } from 'react-router-dom';
import { ExternalLink, Shield, Flag } from 'lucide-react';
import type { Anomaly } from '@/types';
import { Badge } from './Badge';
import { formatTimestamp, formatRelativeTime, formatScore, formatPercentage } from '@/lib/utils';

interface AnomalyTableProps {
  anomalies: Anomaly[];
  isLoading?: boolean;
}

export function AnomalyTable({ anomalies, isLoading }: AnomalyTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (anomalies.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Нет аномалий</h3>
        <p className="mt-1 text-sm text-gray-500">
          Система не обнаружила подозрительной активности
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Время
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              IP Адрес
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Действие
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Оценка
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              События
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Неудачные
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Причина
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Детали
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {anomalies.map((anomaly, idx) => (
            <tr key={`${anomaly.ip}-${anomaly.ts}-${idx}`} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {formatRelativeTime(anomaly.ts)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTimestamp(anomaly.ts)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Link
                  to={`/ips/${anomaly.ip}`}
                  className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center"
                >
                  {anomaly.ip}
                  <ExternalLink className="ml-1 w-3 h-3" />
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant={anomaly.action === 'block_ip' ? 'danger' : 'warning'}>
                  <span className="flex items-center">
                    {anomaly.action === 'block_ip' ? (
                      <Shield className="w-3 h-3 mr-1" />
                    ) : (
                      <Flag className="w-3 h-3 mr-1" />
                    )}
                    {anomaly.action === 'block_ip' ? 'Заблокирован' : 'Помечен'}
                  </span>
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-mono text-gray-900">
                  {formatScore(anomaly.iso_score)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{anomaly.recent_events}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-danger-600 font-medium">
                  {anomaly.recent_failed}
                </div>
                <div className="text-xs text-gray-500">
                  {formatPercentage(anomaly.recent_fail_ratio)}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 max-w-xs truncate" title={anomaly.reason}>
                  {anomaly.reason}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <Link
                  to={`/ips/${anomaly.ip}`}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  Подробнее →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


