import React from 'react';
import { 
  AlertTriangle, 
  Shield, 
  Server, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Users,
  AlertCircle
} from 'lucide-react';

interface StatsCardsProps {
  totalAnomalies?: number;
  blockedIPs?: number;
  flaggedIPs?: number;
  totalEvents?: number;
  failedEvents?: number;
  uniqueIPs?: number;
  avgFailRatio?: number;
  loading?: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({
  totalAnomalies = 0,
  blockedIPs = 0,
  flaggedIPs = 0,
  totalEvents = 0,
  failedEvents = 0,
  uniqueIPs = 0,
  avgFailRatio = 0,
  loading = false
}) => {
  const getTrendIcon = (value: number, threshold: number = 0) => {
    if (value > threshold) {
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    }
    return <TrendingDown className="w-4 h-4 text-green-500" />;
  };

  const getFailRatioColor = (ratio: number) => {
    if (ratio > 0.8) return 'text-red-600';
    if (ratio > 0.5) return 'text-orange-600';
    if (ratio > 0.2) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Anomalies */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Всего аномалий</p>
            <p className="text-2xl font-bold text-gray-900">{totalAnomalies}</p>
          </div>
          <div className="p-3 bg-red-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center space-x-2">
          {getTrendIcon(totalAnomalies)}
          <span className="text-sm text-gray-500">
            {totalAnomalies > 0 ? 'Обнаружены угрозы' : 'Система стабильна'}
          </span>
        </div>
      </div>

      {/* Blocked IPs */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Заблокировано IP</p>
            <p className="text-2xl font-bold text-red-600">{blockedIPs}</p>
          </div>
          <div className="p-3 bg-red-200 rounded-full">
            <Shield className="w-6 h-6 text-red-700" />
          </div>
        </div>
        <div className="mt-4 flex items-center space-x-2">
          {getTrendIcon(blockedIPs)}
          <span className="text-sm text-gray-500">
            {blockedIPs > 0 ? 'Активные блокировки' : 'Нет блокировок'}
          </span>
        </div>
      </div>

      {/* Flagged IPs */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Помечено IP</p>
            <p className="text-2xl font-bold text-yellow-600">{flaggedIPs}</p>
          </div>
          <div className="p-3 bg-yellow-100 rounded-full">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center space-x-2">
          {getTrendIcon(flaggedIPs)}
          <span className="text-sm text-gray-500">
            {flaggedIPs > 0 ? 'Требуют внимания' : 'Нет флагов'}
          </span>
        </div>
      </div>

      {/* System Stats */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Система</p>
            <p className="text-2xl font-bold text-blue-600">{uniqueIPs}</p>
            <p className="text-sm text-gray-500">уникальных IP</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <Server className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">События:</span>
            <span className="font-medium">{totalEvents}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Неудачи:</span>
            <span className="font-medium text-red-600">{failedEvents}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Соотношение:</span>
            <span className={`font-medium ${getFailRatioColor(avgFailRatio)}`}>
              {(avgFailRatio * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
