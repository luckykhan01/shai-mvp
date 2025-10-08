import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, AlertCircle, TrendingUp, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { mlDetectorApi } from '@/lib/api';
import { formatPercentage } from '@/lib/utils';

export function IpsList() {
  const [search, setSearch] = useState('');

  const { data: ipsData, isLoading } = useQuery({
    queryKey: ['ips'],
    queryFn: () => mlDetectorApi.getIps(200),
    refetchInterval: 3000, // Обновление каждые 3 секунды
  });

  const filteredIps =
    ipsData?.ips.filter((ip) =>
      ip.ip.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const sortedIps = [...filteredIps].sort(
    (a, b) => b.recent_fail_ratio - a.recent_fail_ratio
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">IP Адреса</h1>
        <p className="mt-2 text-sm text-gray-600">
          Список отслеживаемых IP адресов с подозрительной активностью
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="flex items-center">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Поиск по IP адресу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 outline-none text-sm"
          />
        </CardContent>
      </Card>

      {/* IP List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Подозрительные IP ({sortedIps.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : sortedIps.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Нет подозрительных IP
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {search ? 'Попробуйте изменить поисковый запрос' : 'IP адреса не найдены'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Адрес
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Уровень угрозы
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Всего событий
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Неудачные попытки
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Процент неудач
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedIps.map((ip) => {
                    const threatLevel =
                      ip.recent_fail_ratio > 0.7
                        ? 'danger'
                        : ip.recent_fail_ratio > 0.4
                        ? 'warning'
                        : 'success';

                    return (
                      <tr key={ip.ip} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            to={`/ips/${ip.ip}`}
                            className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center"
                          >
                            {ip.ip}
                            <ExternalLink className="ml-1 w-3 h-3" />
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={threatLevel}>
                            <span className="flex items-center">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {threatLevel === 'danger'
                                ? 'Высокий'
                                : threatLevel === 'warning'
                                ? 'Средний'
                                : 'Низкий'}
                            </span>
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {ip.recent_events}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-danger-600 font-medium">
                            {ip.recent_failed}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className={`text-sm font-medium ${
                              ip.recent_fail_ratio > 0.7
                                ? 'text-danger-600'
                                : ip.recent_fail_ratio > 0.4
                                ? 'text-warning-600'
                                : 'text-success-600'
                            }`}
                          >
                            {formatPercentage(ip.recent_fail_ratio)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link
                            to={`/ips/${ip.ip}`}
                            className="text-sm text-primary-600 hover:text-primary-800"
                          >
                            Подробнее →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

