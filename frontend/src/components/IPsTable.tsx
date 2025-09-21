import React from 'react';
import { IPStats } from '../types/api';
import { Server, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface IPsTableProps {
  ips: IPStats[];
  loading?: boolean;
  onIPClick?: (ip: string) => void;
}

const IPsTable: React.FC<IPsTableProps> = ({ 
  ips, 
  loading = false, 
  onIPClick 
}) => {
  const getRiskLevel = (failRatio: number) => {
    if (failRatio > 0.8) return { level: 'Высокий', color: 'text-red-600 bg-red-100' };
    if (failRatio > 0.5) return { level: 'Средний', color: 'text-orange-600 bg-orange-100' };
    if (failRatio > 0.2) return { level: 'Низкий', color: 'text-yellow-600 bg-yellow-100' };
    return { level: 'Минимальный', color: 'text-green-600 bg-green-100' };
  };

  const getTrendIcon = (failRatio: number) => {
    if (failRatio > 0.5) {
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    }
    return <TrendingDown className="w-4 h-4 text-green-500" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (ips.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Server className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>Нет IP адресов для отображения</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              IP Адрес
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Всего событий
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Неудачных
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Соотношение неудач
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Уровень риска
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Тренд
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {ips.map((ip, index) => {
            const riskLevel = getRiskLevel(ip.recent_fail_ratio);
            return (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => onIPClick?.(ip.ip)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-2"
                  >
                    <Server className="w-4 h-4" />
                    <span>{ip.ip}</span>
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{ip.recent_events}</span>
                    <span className="text-gray-500">событий</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="font-medium text-red-600">{ip.recent_failed}</span>
                    <span className="text-gray-500">неудач</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{(ip.recent_fail_ratio * 100).toFixed(1)}%</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${ip.recent_fail_ratio * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${riskLevel.color}`}>
                    {riskLevel.level}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getTrendIcon(ip.recent_fail_ratio)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default IPsTable;
