import React from 'react';
import { Anomaly } from '../types/api';
import { AlertTriangle, Shield, Flag } from 'lucide-react';

interface AnomaliesTableProps {
  anomalies: Anomaly[];
  loading?: boolean;
  onIPClick?: (ip: string) => void;
}

const AnomaliesTable: React.FC<AnomaliesTableProps> = ({ 
  anomalies, 
  loading = false, 
  onIPClick 
}) => {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'block_ip':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'flag_ip':
        return <Flag className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'block_ip':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'flag_ip':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score < -0.8) return 'text-red-600 font-bold';
    if (score < -0.6) return 'text-orange-600 font-semibold';
    if (score < -0.4) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (anomalies.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>Нет аномалий для отображения</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Время
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Действие
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              IP Адрес
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Оценка
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Статистика
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Причина
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {anomalies.map((anomaly, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatTimestamp(anomaly.ts)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-2">
                  {getActionIcon(anomaly.action)}
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getActionColor(anomaly.action)}`}>
                    {anomaly.action === 'block_ip' ? 'Блокировка' : 'Флаг'}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => onIPClick?.(anomaly.ip)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {anomaly.ip}
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`text-sm ${getScoreColor(anomaly.iso_score)}`}>
                  {anomaly.iso_score.toFixed(3)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div className="space-y-1">
                  <div>События: {anomaly.recent_events}</div>
                  <div>Неудачи: {anomaly.recent_failed}</div>
                  <div>Соотношение: {(anomaly.recent_fail_ratio * 100).toFixed(1)}%</div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                <div className="truncate" title={anomaly.reason}>
                  {anomaly.reason}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AnomaliesTable;
