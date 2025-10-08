import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { AnomalyTable } from '@/components/AnomalyTable';
import { mlDetectorApi } from '@/lib/api';

export function Anomalies() {
  const [limit, setLimit] = useState(50);
  const [filter, setFilter] = useState<'all' | 'block_ip' | 'flag_ip'>('all');

  const {
    data: anomaliesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['anomalies', limit],
    queryFn: () => mlDetectorApi.getAnomalies(limit),
    refetchInterval: 2000, // Обновление каждые 2 секунды
  });

  const filteredAnomalies =
    filter === 'all'
      ? anomaliesData?.anomalies || []
      : anomaliesData?.anomalies.filter((a) => a.action === filter) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Аномалии</h1>
          <p className="mt-2 text-sm text-gray-600">
            Обнаруженные аномалии и подозрительная активность
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Все ({anomaliesData?.count || 0})
              </button>
              <button
                onClick={() => setFilter('block_ip')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === 'block_ip'
                    ? 'bg-danger-100 text-danger-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Заблокированы (
                {anomaliesData?.anomalies.filter((a) => a.action === 'block_ip')
                  .length || 0}
                )
              </button>
              <button
                onClick={() => setFilter('flag_ip')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === 'flag_ip'
                    ? 'bg-warning-100 text-warning-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Помечены (
                {anomaliesData?.anomalies.filter((a) => a.action === 'flag_ip')
                  .length || 0}
                )
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Показать:</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Список аномалий ({filteredAnomalies.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnomalyTable anomalies={filteredAnomalies} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}

